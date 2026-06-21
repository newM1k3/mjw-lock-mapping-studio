import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, AlertTriangle } from 'lucide-react';
import { LockMapProject, LockMechanism, InputType } from '../types/lockmap';
import { buildInputSignature } from '../utils/lockMappingRules';
import { NavRow } from './ZoneBuilder';

interface Props {
  project: LockMapProject;
  onChange: (updated: LockMapProject) => void;
  onNext: () => void;
  onBack: () => void;
}

const INPUT_TYPES: InputType[] = ['number', 'letter', 'symbol', 'key', 'keypad', 'dial', 'cryptex', 'rfid', 'magnetic', 'custom'];

const emptyLock = (): LockMechanism => ({
  id: crypto.randomUUID(),
  label: '',
  zoneId: '',
  inputType: 'number',
  inputLength: 4,
  visibleAtStage: '',
  physicalDescription: '',
  currentThemeTreatment: '',
  resetIdentifier: '',
  accessibilityNotes: '',
});

function sigConflictCount(locks: LockMechanism[], lock: LockMechanism): number {
  const sig = buildInputSignature(lock);
  return locks.filter((l) => l.id !== lock.id && l.visibleAtStage === lock.visibleAtStage && buildInputSignature(l) === sig).length;
}

export default function LockInventory({ project, onChange, onNext, onBack }: Props) {
  const [editing, setEditing] = useState<LockMechanism | null>(null);
  const [isNew, setIsNew] = useState(false);

  function startAdd() { setEditing(emptyLock()); setIsNew(true); }
  function startEdit(lock: LockMechanism) { setEditing({ ...lock }); setIsNew(false); }

  function save() {
    if (!editing) return;
    if (isNew) {
      onChange({ ...project, locks: [...project.locks, editing] });
    } else {
      onChange({ ...project, locks: project.locks.map((l) => (l.id === editing.id ? editing : l)) });
    }
    setEditing(null);
  }

  function remove(id: string) {
    onChange({ ...project, locks: project.locks.filter((l) => l.id !== id) });
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Lock Inventory</h1>
        <p className="text-slate-400 text-sm">Record every lock, mechanism, keypad, and input device in your room. Input signature badges flag potential mapping conflicts.</p>
      </div>

      <div className="space-y-3 mb-6">
        {project.locks.map((lock) => {
          const conflicts = sigConflictCount(project.locks, lock);
          const sig = buildInputSignature(lock);
          return (
            <div key={lock.id} className={`card flex items-start gap-4 ${conflicts > 0 ? 'border-amber-500/30' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-white text-sm">{lock.label || <span className="text-slate-500 italic">Unnamed lock</span>}</span>
                  <span className="badge-sig">{sig}</span>
                  <span className="badge-stage">{lock.visibleAtStage || '—'}</span>
                  {conflicts > 0 && (
                    <span className="flex items-center gap-1 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" /> {conflicts} conflict{conflicts > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate">{lock.physicalDescription}</p>
                {lock.resetIdentifier && <p className="text-xs text-slate-600 mt-0.5">Reset: <span className="font-mono text-slate-500">{lock.resetIdentifier}</span></p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => startEdit(lock)} className="icon-btn"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => remove(lock.id)} className="icon-btn text-red-400 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          );
        })}
        {project.locks.length === 0 && (
          <div className="card text-center text-slate-500 py-10 border-dashed">No locks added yet.</div>
        )}
      </div>

      {editing && (
        <div className="card border-cyan-500/30 mb-6 space-y-4">
          <h3 className="text-sm font-semibold text-cyan-300">{isNew ? 'New Lock / Mechanism' : 'Edit Lock / Mechanism'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Label / Name</label>
              <input className="input" placeholder="e.g. Tarot Cabinet Lock" value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Zone</label>
              <select className="input" value={editing.zoneId} onChange={(e) => setEditing({ ...editing, zoneId: e.target.value })}>
                <option value="">Select zone…</option>
                {project.zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Input Type</label>
              <select className="input" value={editing.inputType} onChange={(e) => setEditing({ ...editing, inputType: e.target.value as InputType })}>
                {INPUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Input Length</label>
              <input className="input" type="number" min={1} max={20} placeholder="e.g. 4" value={editing.inputLength ?? ''} onChange={(e) => setEditing({ ...editing, inputLength: e.target.value ? parseInt(e.target.value) : undefined })} />
            </div>
            <div>
              <label className="field-label">Visible At Stage</label>
              <input className="input" placeholder="e.g. Act I" value={editing.visibleAtStage} onChange={(e) => setEditing({ ...editing, visibleAtStage: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Reset Identifier</label>
              <input className="input" placeholder="e.g. T01" value={editing.resetIdentifier} onChange={(e) => setEditing({ ...editing, resetIdentifier: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="field-label">Physical Description</label>
            <textarea className="input resize-none h-14" placeholder="Describe where the lock is mounted and how it looks in context." value={editing.physicalDescription} onChange={(e) => setEditing({ ...editing, physicalDescription: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Current Theme Treatment</label>
            <textarea className="input resize-none h-14" placeholder="Any existing theming on this lock (or 'None')." value={editing.currentThemeTreatment} onChange={(e) => setEditing({ ...editing, currentThemeTreatment: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Accessibility Notes</label>
            <input className="input" placeholder="e.g. Raised digit tactile feedback." value={editing.accessibilityNotes} onChange={(e) => setEditing({ ...editing, accessibilityNotes: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3"><Check className="w-3.5 h-3.5" />Save</button>
            <button onClick={() => setEditing(null)} className="btn-ghost flex items-center gap-1.5 text-sm py-1.5 px-3"><X className="w-3.5 h-3.5" />Cancel</button>
          </div>
        </div>
      )}

      <button onClick={startAdd} className="btn-ghost flex items-center gap-2 text-sm mb-10">
        <Plus className="w-4 h-4" /> Add Lock / Mechanism
      </button>

      <NavRow onBack={onBack} onNext={onNext} nextLabel="Continue to Puzzle Matrix" />
    </div>
  );
}
