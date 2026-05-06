import React from 'react';
import { Lock, ChevronRight } from 'lucide-react';

export const STEPS = [
  { id: 1, label: 'Project Setup' },
  { id: 2, label: 'Zones' },
  { id: 3, label: 'Lock Inventory' },
  { id: 4, label: 'Puzzle Matrix' },
  { id: 5, label: 'Risk Audit' },
  { id: 6, label: 'Implementation Cards' },
  { id: 7, label: 'Export' },
];

interface LayoutProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  children: React.ReactNode;
}

export default function Layout({ currentStep, onStepClick, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Left rail */}
      <aside className="w-60 shrink-0 border-r border-slate-800 flex flex-col">
        <div className="px-5 py-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <Lock className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white leading-none">LockMap Studio</div>
            <div className="text-xs text-slate-500 mt-0.5">MJW Platform</div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {STEPS.map((step) => {
            const isActive = step.id === currentStep;
            const isComplete = step.id < currentStep;
            return (
              <button
                key={step.id}
                onClick={() => onStepClick(step.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    : isComplete
                    ? 'text-slate-300 hover:bg-slate-800/60'
                    : 'text-slate-500 hover:bg-slate-800/40 hover:text-slate-400'
                }`}
              >
                <span
                  className={`w-6 h-6 shrink-0 rounded-full text-xs flex items-center justify-center font-semibold border ${
                    isActive
                      ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300'
                      : isComplete
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                      : 'border-slate-700 text-slate-600'
                  }`}
                >
                  {isComplete ? '✓' : step.id}
                </span>
                <span className="truncate">{step.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-cyan-500/50" />}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-800">
          <p className="text-xs text-slate-600">Phase 1 — Prototype</p>
        </div>
      </aside>

      {/* Main workspace */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
