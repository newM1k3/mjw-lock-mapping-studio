import React, { useState } from 'react';
import { Copy, Download, Check } from 'lucide-react';
import { LockMapProject, LockMappingConflict, ImplementationCard } from '../types/lockmap';
import { exportToMarkdown } from '../utils/exportMarkdown';

interface Props {
  project: LockMapProject;
  conflicts: LockMappingConflict[];
  cards: ImplementationCard[];
  onBack: () => void;
}

export default function ExportPanel({ project, conflicts, cards, onBack }: Props) {
  const [copied, setCopied] = useState(false);

  const markdown = exportToMarkdown(project, conflicts, cards);

  function copy() {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, '-').toLowerCase() || 'lockmap-report'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Export Report</h1>
        <p className="text-slate-400 text-sm">Your complete lock mapping audit — project context, inventory, puzzle matrix, risk audit, and implementation cards — as a production-ready Markdown document.</p>
      </div>

      <div className="flex gap-3 mb-6">
        <button onClick={copy} className="btn-primary flex items-center gap-2">
          {copied ? <><Check className="w-4 h-4" />Copied</> : <><Copy className="w-4 h-4" />Copy to Clipboard</>}
        </button>
        <button onClick={download} className="btn-ghost flex items-center gap-2">
          <Download className="w-4 h-4" /> Download .md
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 max-h-[60vh] overflow-y-auto">
        <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">{markdown}</pre>
      </div>

      <div className="mt-10 flex justify-between items-center">
        <button onClick={onBack} className="btn-ghost text-sm">Back</button>
        <div className="text-xs text-slate-600">Phase 2 will add PocketBase save / load and PDF export.</div>
      </div>
    </div>
  );
}
