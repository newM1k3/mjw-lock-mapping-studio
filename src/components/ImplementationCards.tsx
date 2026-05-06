import React, { useState } from 'react';
import { Wand2, ArrowRight, Eye, MapPin, Shapes, Layers, BookOpen, Accessibility, RotateCcw, MonitorSmartphone, SlidersHorizontal } from 'lucide-react';
import { LockMapProject, LockMappingConflict, ImplementationCard } from '../types/lockmap';
import { generateImplementationCards } from '../utils/generateCards';

interface Props {
  project: LockMapProject;
  conflicts: LockMappingConflict[];
  cards: ImplementationCard[];
  onCardsChange: (cards: ImplementationCard[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const CUE_CONFIG: Record<ImplementationCard['cueType'], { label: string; Icon: React.FC<{ className?: string }>; color: string }> = {
  'proximity': { label: 'Proximity', Icon: MapPin, color: 'text-cyan-400' },
  'visual-match': { label: 'Visual Match', Icon: Eye, color: 'text-emerald-400' },
  'symbol-system': { label: 'Symbol System', Icon: Shapes, color: 'text-amber-400' },
  'material-language': { label: 'Material Language', Icon: Layers, color: 'text-orange-400' },
  'narrative-logic': { label: 'Narrative Logic', Icon: BookOpen, color: 'text-sky-400' },
  'accessibility': { label: 'Accessible Cueing', Icon: Accessibility, color: 'text-teal-400' },
  'reset-safety': { label: 'Reset Safety', Icon: RotateCcw, color: 'text-slate-400' },
  'tech-interface': { label: 'Tech Interface', Icon: MonitorSmartphone, color: 'text-violet-400' },
};

export default function ImplementationCards({ project, conflicts, cards, onCardsChange, onNext, onBack }: Props) {
  const [filterCue, setFilterCue] = useState<string>('all');
  const [filterLock, setFilterLock] = useState<string>('all');

  function generate() {
    onCardsChange(generateImplementationCards(project, conflicts));
  }

  const allCueTypes = Array.from(new Set(cards.map((c) => c.cueType)));
  const filtered = cards.filter((c) => {
    if (filterCue !== 'all' && c.cueType !== filterCue) return false;
    if (filterLock !== 'all' && c.linkedLockId !== filterLock) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Theme Implementation Cards</h1>
        <p className="text-slate-400 text-sm">On-theme, build-ready mapping solutions generated from your project context and audit results. Each card targets a specific cue strategy.</p>
      </div>

      <button onClick={generate} className="btn-primary mb-8 flex items-center gap-2">
        <Wand2 className="w-4 h-4" /> Generate Theme Ideas
      </button>

      {cards.length > 0 && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <SlidersHorizontal className="w-4 h-4 text-slate-500 shrink-0" />
          <select className="input-sm" value={filterCue} onChange={(e) => setFilterCue(e.target.value)}>
            <option value="all">All Cue Types</option>
            {allCueTypes.map((t) => <option key={t} value={t}>{CUE_CONFIG[t]?.label ?? t}</option>)}
          </select>
          <select className="input-sm" value={filterLock} onChange={(e) => setFilterLock(e.target.value)}>
            <option value="all">All Locks</option>
            {project.locks.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
          <span className="text-xs text-slate-500 ml-auto">{filtered.length} card{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {filtered.map((card) => {
            const cfg = CUE_CONFIG[card.cueType];
            const lock = project.locks.find((l) => l.id === card.linkedLockId);
            const puzzle = card.linkedPuzzleId ? project.puzzles.find((p) => p.id === card.linkedPuzzleId) : undefined;
            return (
              <div key={card.id} className="card flex flex-col gap-4">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-white text-sm leading-snug">{card.title}</h3>
                    <span className={`flex items-center gap-1 text-xs shrink-0 ${cfg?.color ?? 'text-slate-400'}`}>
                      {cfg && <cfg.Icon className="w-3.5 h-3.5" />}
                      {cfg?.label ?? card.cueType}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {lock && <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{lock.label}</span>}
                    {puzzle && <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{puzzle.title}</span>}
                  </div>
                </div>

                <CardSection label="Theme Idea" text={card.themeIdea} />
                <CardSection label="Build Notes" text={card.buildNotes} />
                <CardSection label="Player Inference" text={card.playerInference} />

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <MiniSection label="Accessibility" text={card.accessibilityNote} />
                  <MiniSection label="Reset Note" text={card.resetNote} />
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Operator Risk Reduced</span>
                  <p className="text-xs text-emerald-300 mt-1">{card.operatorRiskReduced}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card text-center text-slate-500 py-12 mb-10 border-dashed">
          {cards.length === 0
            ? 'Press "Generate Theme Ideas" to produce implementation cards from your audit.'
            : 'No cards match the selected filters.'}
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <button onClick={onBack} className="btn-ghost text-sm">Back</button>
        <button onClick={onNext} className="btn-primary flex items-center gap-2 text-sm">
          Export Report <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function CardSection({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      <p className="text-sm text-slate-300 mt-1 leading-relaxed">{text}</p>
    </div>
  );
}

function MiniSection({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{text}</p>
    </div>
  );
}
