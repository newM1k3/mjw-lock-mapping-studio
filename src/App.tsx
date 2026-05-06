import { useState } from 'react';
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

  function loadDemo() {
    const c = detectConflicts(demoProject);
    const k = generateImplementationCards(demoProject, c);
    setProject(demoProject);
    setConflicts(c);
    setCards(k);
    setStep(5);
  }

  function next() { setStep((s) => Math.min(s + 1, 7)); }
  function back() { setStep((s) => Math.max(s - 1, 1)); }

  return (
    <Layout currentStep={step} onStepClick={setStep}>
      {step === 1 && (
        <ProjectSetup
          project={project}
          onChange={setProject}
          onLoadDemo={loadDemo}
          onNext={next}
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
        />
      )}
    </Layout>
  );
}
