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
import { pb, saveProject, loadProjects, type SavedProjectMeta } from './lib/pocketbase';

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
  const [savedProjects, setSavedProjects] = useState<SavedProjectMeta[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // SSO token handoff + load saved projects on mount
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
        window.history.replaceState({}, '', window.location.pathname);
      }

      const projects = await loadProjects();
      setSavedProjects(projects);
    }
    void initApp();
  }, []);

  // Auto-save when reaching the export panel (step 7)
  const persistProject = useCallback(async (p: LockMapProject) => {
    if (!pb.authStore.isValid) return;
    setIsSaving(true);
    try {
      await saveProject(p);
      const refreshed = await loadProjects();
      setSavedProjects(refreshed);
    } catch (err) {
      console.warn('Lock Mapping Studio: project save failed', err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  function loadDemo() {
    const c = detectConflicts(demoProject);
    const k = generateImplementationCards(demoProject, c);
    setProject(demoProject);
    setConflicts(c);
    setCards(k);
    setStep(5);
  }

  function loadSavedProject(meta: SavedProjectMeta) {
    const p = meta.project;
    const c = detectConflicts(p);
    const k = generateImplementationCards(p, c);
    setProject(p);
    setConflicts(c);
    setCards(k);
    setStep(1);
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
          savedProjects={savedProjects}
          onLoadSaved={loadSavedProject}
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
