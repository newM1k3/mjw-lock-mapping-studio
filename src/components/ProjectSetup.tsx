import React from 'react';
import { Sparkles, ArrowRight, FolderOpen, Clock } from 'lucide-react';
import { LockMapProject, RoomStructure } from '../types/lockmap';
import type { SavedProjectMeta } from '../lib/pocketbase';

interface Props {
  project: LockMapProject;
  onChange: (updated: LockMapProject) => void;
  onLoadDemo: () => void;
  onNext: () => void;
  savedProjects?: SavedProjectMeta[];
  onLoadSaved?: (meta: SavedProjectMeta) => void;
}

const ROOM_STRUCTURES: { value: RoomStructure; label: string; desc: string }[] = [
  { value: 'linear', label: 'Linear', desc: 'Players must complete each stage before advancing.' },
  { value: 'semi-linear', label: 'Semi-Linear', desc: 'Some parallel paths; some gated progression.' },
  { value: 'open-world', label: 'Open World', desc: 'All puzzles accessible from the start.' },
];

const DESIGN_STAGES = [
  'Concept / Ideation',
  'Design review',
  'Pre-production',
  'In production',
  'Testing',
  'Operational',
];

export default function ProjectSetup({ project, onChange, onLoadDemo, onNext, savedProjects, onLoadSaved }: Props) {
  function set(field: keyof LockMapProject, value: string) {
    onChange({ ...project, [field]: value });
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Project Setup</h1>
        <p className="text-slate-400 text-sm">Define the creative and operational context for your lock mapping audit.</p>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <button
          onClick={onLoadDemo}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm font-medium hover:bg-amber-500/20 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Load Demo Project — Victorian Séance Room
        </button>
      </div>

      {savedProjects && savedProjects.length > 0 && onLoadSaved && (
        <div className="mb-8">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <FolderOpen className="w-3.5 h-3.5" />
            Resume Saved Project
          </div>
          <div className="space-y-2">
            {savedProjects.map((meta) => (
              <button
                key={meta.id}
                onClick={() => onLoadSaved(meta)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-700 bg-slate-900/60 text-left hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all group"
              >
                <span className="text-sm font-medium text-slate-200 group-hover:text-white">
                  {meta.title || 'Untitled Project'}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500 group-hover:text-slate-400 shrink-0 ml-4">
                  <Clock className="w-3 h-3" />
                  {new Date(meta.savedAt).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Project Title" required>
            <input
              className="input"
              placeholder="e.g. The Séance at Ashworth Manor"
              value={project.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </Field>
          <Field label="Design Stage">
            <select className="input" value={project.designStage} onChange={(e) => set('designStage', e.target.value)}>
              <option value="">Select stage…</option>
              {DESIGN_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Room Theme" required>
          <textarea
            className="input resize-none h-20"
            placeholder="e.g. Victorian occult séance parlour, gaslit, heavy drapery, spirit communication, tarot and astrology iconography"
            value={project.theme}
            onChange={(e) => set('theme', e.target.value)}
          />
        </Field>

        <Field label="Tone &amp; Atmosphere">
          <textarea
            className="input resize-none h-16"
            placeholder="e.g. Atmospheric, mysterious, slightly unsettling. Players are mediums summoned to contact a restless spirit."
            value={project.tone}
            onChange={(e) => set('tone', e.target.value)}
          />
        </Field>

        <Field label="Target Audience">
          <input
            className="input"
            placeholder="e.g. Adults, general public, intermediate experience level"
            value={project.targetAudience}
            onChange={(e) => set('targetAudience', e.target.value)}
          />
        </Field>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">Room Structure</label>
          <div className="grid grid-cols-3 gap-3">
            {ROOM_STRUCTURES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('roomStructure', opt.value)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  project.roomStructure === opt.value
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200'
                    : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="font-semibold text-sm mb-1">{opt.label}</div>
                <div className="text-xs opacity-70">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 flex justify-end">
        <button onClick={onNext} className="btn-primary flex items-center gap-2">
          Continue to Zones <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {label} {required && <span className="text-cyan-500">*</span>}
      </label>
      {children}
    </div>
  );
}
