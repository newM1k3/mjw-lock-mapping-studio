import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, ArrowRight } from 'lucide-react';
import { LockMapProject, Zone } from '../types/lockmap';

interface Props {
  project: LockMapProject;
  onChange: (updated: LockMapProject) => void;
  onNext: () => void;
  onBack: () => void;
}

const emptyZone = (): Zone => ({
  id: crypto.randomUUID(),
  name: '',
  accessibleStage: '',
  description: '',
});

export default function ZoneBuilder({ project, onChange, onNext, onBack }: Props) {
  const [editing, setEditing] = useState<Zone | null>(null);
  const [isNew, setIsNew] = useState(false);

  function startAdd() {
    setEditing(emptyZone());
    setIsNew(true);
  }

  function startEdit(zone: Zone) {
    setEditing({ ...zone });
    setIsNew(false);
  }

  function save() {
    if (!editing) return;
    if (isNew) {
      onChange({ ...project, zones: [...project.zones, editing] });
    } else {
      onChange({ ...project, zones: project.zones.map((z) => (z.id === editing.id ? editing : z)) });
    }
    setEditing(null);
  }

  function remove(id: string) {
    onChange({ ...project, zones: project.zones.filter((z) => z.id !== id) });
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Zones / Access Timeline</h1>
        <p className="text-slate-400 text-sm">Define the physical zones in your room and when each becomes accessible to players. Zones group locks and puzzles for risk detection.</p>
      </div>

      <div className="space-y-3 mb-6">
        {project.zones.map((zone) => (
          <div key={zone.id} className="card flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-white text-sm">{zone.name || <span className="text-slate-500 italic">Unnamed zone</span>}</span>
                <span className="badge-stage">{zone.accessibleStage || 'No stage'}</span>
              </div>
              <p className="text-xs text-slate-400 truncate">{zone.description}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => startEdit(zone)} className="icon-btn"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => remove(zone.id)} className="icon-btn text-red-400 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}

        {project.zones.length === 0 && (
          <div className="card text-center text-slate-500 py-10 border-dashed">
            No zones defined. Add at least one zone to continue.
          </div>
        )}
      </div>

      {editing && (
        <div className="card border-cyan-500/30 mb-6 space-y-4">
          <h3 className="text-sm font-semibold text-cyan-300">{isNew ? 'New Zone' : 'Edit Zone'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Zone Name</label>
              <input className="input" placeholder="e.g. The Séance Parlour" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Accessible At Stage</label>
              <input className="input" placeholder="e.g. Act I" value={editing.accessibleStage} onChange={(e) => setEditing({ ...editing, accessibleStage: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="field-label">Description</label>
            <textarea className="input resize-none h-16" placeholder="Describe the space, key props, and player experience." value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3"><Check className="w-3.5 h-3.5" />Save</button>
            <button onClick={() => setEditing(null)} className="btn-ghost flex items-center gap-1.5 text-sm py-1.5 px-3"><X className="w-3.5 h-3.5" />Cancel</button>
          </div>
        </div>
      )}

      <button onClick={startAdd} className="btn-ghost flex items-center gap-2 text-sm mb-10">
        <Plus className="w-4 h-4" /> Add Zone
      </button>

      <NavRow onBack={onBack} onNext={onNext} nextLabel="Continue to Lock Inventory" />
    </div>
  );
}

export function NavRow({ onBack, onNext, nextLabel }: { onBack: () => void; onNext: () => void; nextLabel: string }) {
  return (
    <div className="flex justify-between items-center pt-2">
      <button onClick={onBack} className="btn-ghost text-sm">Back</button>
      <button onClick={onNext} className="btn-primary flex items-center gap-2 text-sm">
        {nextLabel} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
