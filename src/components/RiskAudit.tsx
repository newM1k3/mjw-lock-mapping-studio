import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import { LockMapProject, LockMappingConflict, RiskLevel } from '../types/lockmap';
import { detectConflicts, calculateRiskScore, riskLabel } from '../utils/lockMappingRules';

interface Props {
  project: LockMapProject;
  conflicts: LockMappingConflict[];
  onConflictsChange: (conflicts: LockMappingConflict[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const RISK_CONFIG: Record<RiskLevel, { label: string; borderClass: string; bgClass: string; textClass: string; Icon: React.FC<{ className?: string }> }> = {
  high: { label: 'High Risk', borderClass: 'border-red-500/40', bgClass: 'bg-red-500/8', textClass: 'text-red-300', Icon: ShieldAlert },
  medium: { label: 'Medium Risk', borderClass: 'border-amber-500/40', bgClass: 'bg-amber-500/8', textClass: 'text-amber-300', Icon: AlertTriangle },
  low: { label: 'Low Risk', borderClass: 'border-emerald-500/40', bgClass: 'bg-emerald-500/8', textClass: 'text-emerald-300', Icon: Info },
};

export default function RiskAudit({ project, conflicts, onConflictsChange, onNext, onBack }: Props) {
  function runAudit() {
    onConflictsChange(detectConflicts(project));
  }

  const score = calculateRiskScore(conflicts);
  const overall = riskLabel(score);
  const high = conflicts.filter((c) => c.riskLevel === 'high');
  const medium = conflicts.filter((c) => c.riskLevel === 'medium');
  const low = conflicts.filter((c) => c.riskLevel === 'low');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Risk Audit</h1>
        <p className="text-slate-400 text-sm">Automated analysis of duplicate input signatures, ambiguous puzzle-to-lock mappings, and reset safety concerns.</p>
      </div>

      <button onClick={runAudit} className="btn-primary mb-8 flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" /> Run Risk Audit
      </button>

      {conflicts.length > 0 ? (
        <>
          {/* Summary bar */}
          <div className={`rounded-2xl border p-5 mb-8 flex items-center gap-5 ${
            overall === 'high' ? 'border-red-500/30 bg-red-500/8' :
            overall === 'medium' ? 'border-amber-500/30 bg-amber-500/8' :
            'border-emerald-500/30 bg-emerald-500/8'
          }`}>
            {overall === 'high' ? <ShieldAlert className="w-8 h-8 text-red-400 shrink-0" /> :
             overall === 'medium' ? <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" /> :
             <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />}
            <div>
              <div className={`font-semibold text-base ${overall === 'high' ? 'text-red-300' : overall === 'medium' ? 'text-amber-300' : 'text-emerald-300'}`}>
                Overall Risk: {overall.charAt(0).toUpperCase() + overall.slice(1)} (score {score})
              </div>
              <div className="text-slate-400 text-sm mt-0.5">
                {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} detected — {high.length} high, {medium.length} medium, {low.length} low
              </div>
            </div>
            <div className="ml-auto flex gap-3 text-center">
              {[{ count: high.length, label: 'High', cls: 'text-red-300' }, { count: medium.length, label: 'Med', cls: 'text-amber-300' }, { count: low.length, label: 'Low', cls: 'text-emerald-300' }].map(({ count, label, cls }) => (
                <div key={label}>
                  <div className={`text-2xl font-bold ${cls}`}>{count}</div>
                  <div className="text-xs text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 mb-10">
            {conflicts.map((conflict) => {
              const cfg = RISK_CONFIG[conflict.riskLevel];
              const affectedLocks = conflict.affectedLockIds.map((id) => project.locks.find((l) => l.id === id)?.label ?? id);
              const affectedPuzzles = conflict.affectedPuzzleIds.map((id) => project.puzzles.find((p) => p.id === id)?.title ?? id);
              return (
                <div key={conflict.id} className={`rounded-2xl border p-5 ${cfg.borderClass} ${cfg.bgClass}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <cfg.Icon className={`w-5 h-5 ${cfg.textClass} shrink-0 mt-0.5`} />
                    <div>
                      <div className={`font-semibold text-sm ${cfg.textClass}`}>{cfg.label} — Input Signature <code className="font-mono bg-slate-800/60 px-1.5 py-0.5 rounded text-xs">{conflict.inputSignature}</code> at {conflict.stage}</div>
                      <p className="text-slate-300 text-sm mt-2 leading-relaxed">{conflict.diagnosis}</p>
                    </div>
                  </div>
                  <div className="ml-8 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs text-slate-500">Affected locks:</span>
                      {affectedLocks.map((l) => <span key={l} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{l}</span>)}
                    </div>
                    {affectedPuzzles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs text-slate-500">Affected puzzles:</span>
                        {affectedPuzzles.map((p) => <span key={p} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{p}</span>)}
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Recommended Fix</span>
                      <p className="text-sm text-slate-300 mt-1 leading-relaxed">{conflict.recommendedFix}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="card text-center text-slate-500 py-12 mb-10">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          Run the audit to analyse your project for lock mapping conflicts.
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <button onClick={onBack} className="btn-ghost text-sm">Back</button>
        <button onClick={onNext} className="btn-primary flex items-center gap-2 text-sm">
          Generate Implementation Cards <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
