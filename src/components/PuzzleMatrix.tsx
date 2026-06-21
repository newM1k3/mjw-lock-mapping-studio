import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, AlertCircle } from 'lucide-react';
import { LockMapProject, PuzzleSolution, InputType } from '../types/lockmap';
import { buildInputSignature, buildPuzzleSignature } from '../utils/lockMappingRules';
import { NavRow } from './ZoneBuilder';

interface Props {
  project: LockMapProject;
  onChange: (updated: LockMapProject) => void;
  onNext: () => void;
  onBack: () => void;
}

const INPUT_TYPES: InputType[] = ['number', 'letter', 'symbol', 'key', 'keypad', 'dial', 'cryptex', 'rfid', 'magnetic', 'custom'];

const emptyPuzzle = (): PuzzleSolution => ({
  id: crypto.randomUUID(),
  title: '',
  zoneSolvedIn: '',
  revealStage: '',
  solutionType: 'number',
  solutionLength: 4,
  answerExample: '',
  intendedLockId: '',
  narrativeContext: '',
});

function ambiguousLocks(project: LockMapProject, puzzle: PuzzleSolution): string[] {
  const pSig = buildPuzzleSignature(puzzle);
  return project.locks
    .filter((l) => l.visibleAtStage === puzzle.revealStage && buildInputSignature(l) === pSig && l.id !== puzzle.intendedLockId)
    .map((l) => l.label);
}

export default function PuzzleMatrix({ project, onChange, onNext, onBack }: Props) {
  const [editing, setEditing] = useState<PuzzleSolution | null>(null);
  const [isNew, setIsNew] = useState(false);

  function startAdd() { setEditing(emptyPuzzle()); setIsNew(true); }
  function startEdit(p: PuzzleSolution) { setEditing({ ...p }); setIsNew(false); }

  function save() {
    if (!editing) return;
    if (isNew) {
      onChange({ ...project, puzzles: [...project.puzzles, editing] });
    } else {
      onChange({ ...project, puzzles: project.puzzles.map((p) => (p.id === editing.id ? editing : p)) });
    }
    setEditing(null);
  }

  function remove(id: string) {
    onChange({ ...project, puzzles: project.puzzles.filter((p) => p.id !== id) });
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Puzzle Matrix</h1>
        <p className="text-slate-400 text-sm">Map each puzzle's solution format to its intended lock. Warnings appear when a solution could plausibly fit multiple visible locks at the same stage.</p>
      </div>

      <div className="space-y-3 mb-6">
        {project.puzzles.map((puzzle) => {
          const ambiguous = ambiguousLocks(project, puzzle);
          const intendedLock = project.locks.find((l) => l.id === puzzle.intendedLockId);
          return (
            <div key={puzzle.id} className={`card flex items-start gap-4 ${ambiguous.length > 0 ? 'border-amber-500/30' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-white text-sm">{puzzle.title || <span className="text-slate-500 italic">Unnamed puzzle</span>}</span>
                  <span className="badge-sig">{buildPuzzleSignature(puzzle)}</span>
                  <span className="badge-stage">{puzzle.revealStage || '—'}</span>
                </div>
                <p className="text-xs text-slate-400">
                  Intended: <span className="text-slate-300">{intendedLock?.label ?? <span className="italic text-slate-500">not set</span>}</span>
                  {puzzle.answerExample && <> &middot; Answer: <span className="font-mono text-emerald-400">{puzzle.answerExample}</span></>}
                </p>
                {ambiguous.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-300">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Solution format also fits: {ambiguous.join(', ')}
                  </div>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => startEdit(puzzle)} className="icon-btn"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => remove(puzzle.id)} className="icon-btn text-red-400 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          );
        })}
        {project.puzzles.length === 0 && (
          <div className="card text-center text-slate-500 py-10 border-dashed">No puzzles added yet.</div>
        )}
      </div>

      {editing && (
        <div className="card border-cyan-500/30 mb-6 space-y-4">
          <h3 className="text-sm font-semibold text-cyan-300">{isNew ? 'New Puzzle' : 'Edit Puzzle'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Puzzle Title</label>
              <input className="input" placeholder="e.g. Tarot Birth Year" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Reveal Stage</label>
              <input className="input" placeholder="e.g. Act I" value={editing.revealStage} onChange={(e) => setEditing({ ...editing, revealStage: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Zone Solved In</label>
              <select className="input" value={editing.zoneSolvedIn} onChange={(e) => setEditing({ ...editing, zoneSolvedIn: e.target.value })}>
                <option value="">Select zone…</option>
                {project.zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Intended Lock</label>
              <select className="input" value={editing.intendedLockId} onChange={(e) => setEditing({ ...editing, intendedLockId: e.target.value })}>
                <option value="">Select lock…</option>
                {project.locks.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Solution Type</label>
              <select className="input" value={editing.solutionType} onChange={(e) => setEditing({ ...editing, solutionType: e.target.value as InputType })}>
                {INPUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Solution Length</label>
              <input className="input" type="number" min={1} max={20} placeholder="e.g. 4" value={editing.solutionLength ?? ''} onChange={(e) => setEditing({ ...editing, solutionLength: e.target.value ? parseInt(e.target.value) : undefined })} />
            </div>
            <div className="col-span-2">
              <label className="field-label">Answer Example <span className="text-slate-600 font-normal">(non-spoiler or redacted is fine)</span></label>
              <input className="input" placeholder="e.g. 1874" value={editing.answerExample} onChange={(e) => setEditing({ ...editing, answerExample: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="field-label">Narrative Context</label>
            <textarea className="input resize-none h-16" placeholder="Describe how players derive this answer and why it fits the story." value={editing.narrativeContext} onChange={(e) => setEditing({ ...editing, narrativeContext: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3"><Check className="w-3.5 h-3.5" />Save</button>
            <button onClick={() => setEditing(null)} className="btn-ghost flex items-center gap-1.5 text-sm py-1.5 px-3"><X className="w-3.5 h-3.5" />Cancel</button>
          </div>
        </div>
      )}

      <button onClick={startAdd} className="btn-ghost flex items-center gap-2 text-sm mb-10">
        <Plus className="w-4 h-4" /> Add Puzzle
      </button>

      <NavRow onBack={onBack} onNext={onNext} nextLabel="Run Risk Audit" />
    </div>
  );
}
