import { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import ProjectSetup from './components/ProjectSetup';
import ZoneBuilder from './components/ZoneBuilder';
import LockInventory from './components/LockInventory';
import PuzzleMatrix from './components/PuzzleMatrix';
import RiskAudit from './components/RiskAudit';
import ImplementationCards from './components/ImplementationCards';
import ExportPanel from './components/ExportPanel';
import { LockMapProject, LockMappingConflict, ImplementationCard } from './types/lockmap';
import { demoProject } from './data/demoProject';
import { detectConflicts } from './utils/lockMappingRules';
import { generateImplementationCards } from './utils/generateCards';
import { pb } from './lib/pocketbase';
import {
  resolveRoomContext,
  loadLockMap,
  saveLockMap,
  type RoomContext,
  type RoomOption,
} from './lib/lockmap';

const emptyProject = (): LockMapProject => ({
  id: crypto.randomUUID(),
  title: '',
  theme: '',
  tone: '',
  roomStructure: 'linear',
  targetAudience: '',
  designStage: '',
  zones: [],
  locks: [],
  puzzles: [],
});

export default function App() {
  const [step, setStep] = useState(1);
  const [project, setProject] = useState<LockMapProject>(emptyProject());
  const [conflicts, setConflicts] = useState<LockMappingConflict[]>([]);
  const [cards, setCards] = useState<ImplementationCard[]>([]);
  const [ctx, setCtx] = useState<RoomContext | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingRoom, setLoadingRoom] = useState(false);

  // SSO token handoff + resolve the venue's rooms, then load the active room's lock map.
  useEffect(() => {
    async function initApp() {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        try {
          pb.authStore.save(token, null);
          await pb.collection('users').authRefresh();
        } catch {
          pb.authStore.clear();
        }
      }
      // Optional ?room= deep-link (forward-compatible with the dash launcher).
      const roomParam = params.get('room');
      window.history.replaceState({}, '', window.location.pathname);

      const resolved = await resolveRoomContext();
      if (!resolved) return; // not signed in / no venue → stays on the blank/demo flow
      setCtx(resolved);

      const room =
        resolved.rooms.find((r) => r.id === roomParam) ?? resolved.rooms[0] ?? null;
      if (room) {
        setActiveRoomId(room.id);
        const loaded = await loadLockMap(room);
        const c = detectConflicts(loaded);
        setProject(loaded);
        setConflicts(c);
        setCards(generateImplementationCards(loaded, c));
      }
    }
    void initApp();
  }, []);

  // Switch the active room: load (or Story-seed) its lock map.
  const selectRoom = useCallback(async (room: RoomOption) => {
    setActiveRoomId(room.id); // move the highlight immediately for instant feedback
    setLoadingRoom(true);
    try {
      const loaded = await loadLockMap(room);
      const c = detectConflicts(loaded);
      setProject(loaded);
      setConflicts(c);
      setCards(generateImplementationCards(loaded, c));
      setStep(1);
    } finally {
      setLoadingRoom(false);
    }
  }, []);

  // Auto-save the active room's lock map when reaching the export panel (step 7).
  const persistProject = useCallback(async (p: LockMapProject) => {
    if (!pb.authStore.isValid || !ctx || !activeRoomId) return;
    setIsSaving(true);
    try {
      await saveLockMap(ctx, activeRoomId, p);
    } catch (err) {
      console.warn('Lock Mapping Studio: lock map save failed', err);
    } finally {
      setIsSaving(false);
    }
  }, [ctx, activeRoomId]);

  function loadDemo() {
    const c = detectConflicts(demoProject);
    const k = generateImplementationCards(demoProject, c);
    setProject(demoProject);
    setConflicts(c);
    setCards(k);
    setStep(5);
  }

  function next() {
    const nextStep = Math.min(step + 1, 7);
    setStep(nextStep);
    // Auto-save when entering the export panel
    if (nextStep === 7) {
      void persistProject(project);
    }
  }

  function back() { setStep((s) => Math.max(s - 1, 1)); }

  return (
    <Layout currentStep={step} onStepClick={setStep}>
      {step === 1 && (
        <ProjectSetup
          project={project}
          onChange={setProject}
          onLoadDemo={loadDemo}
          onNext={next}
          rooms={ctx?.rooms ?? []}
          activeRoomId={activeRoomId}
          onSelectRoom={selectRoom}
          loadingRoom={loadingRoom}
        />
      )}
      {step === 2 && (
        <ZoneBuilder
          project={project}
          onChange={setProject}
          onNext={next}
          onBack={back}
        />
      )}
      {step === 3 && (
        <LockInventory
          project={project}
          onChange={setProject}
          onNext={next}
          onBack={back}
        />
      )}
      {step === 4 && (
        <PuzzleMatrix
          project={project}
          onChange={setProject}
          onNext={next}
          onBack={back}
        />
      )}
      {step === 5 && (
        <RiskAudit
          project={project}
          conflicts={conflicts}
          onConflictsChange={setConflicts}
          onNext={next}
          onBack={back}
        />
      )}
      {step === 6 && (
        <ImplementationCards
          project={project}
          conflicts={conflicts}
          cards={cards}
          onCardsChange={setCards}
          onNext={next}
          onBack={back}
        />
      )}
      {step === 7 && (
        <ExportPanel
          project={project}
          conflicts={conflicts}
          cards={cards}
          onBack={back}
          isSaving={isSaving}
        />
      )}
    </Layout>
  );
}
