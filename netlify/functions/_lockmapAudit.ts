// Shared logic for the async AI lock-map audit (start → background → status).
// The AI call routinely needs 30-90s, beyond Netlify's 26s synchronous limit,
// so results are exchanged through a Netlify Blobs store keyed by job id.

import type { LockMapProject, LockMappingConflict, ImplementationCard } from '../../src/types/lockmap';

export const AUDIT_STORE = 'lockmap-audits';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export type AuditJob = {
  status: 'pending' | 'processing' | 'complete' | 'failed';
  createdAt: string;
  project: LockMapProject;
  localConflicts: LockMappingConflict[];
  result?: { summary: string; conflicts: LockMappingConflict[]; implementationCards: ImplementationCard[] };
  error?: string;
  debug?: string; // error class + message for diagnostics; not shown in the UI
};

export function jsonRes(status: number, payload: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...headers },
  });
}

const CUE_TYPES = [
  'proximity',
  'visual-match',
  'symbol-system',
  'material-language',
  'narrative-logic',
  'accessibility',
  'reset-safety',
  'tech-interface',
] as const;

const RISK_LEVELS = ['low', 'medium', 'high'] as const;

export const SYSTEM_PROMPT = `You are an expert escape room designer specialising in lock-to-puzzle mapping, physical build cues, and operator/reset safety. You are given a room's full lock map (theme, zones, locks, puzzles) plus the conflicts a deterministic rule engine already found.

Your job is to DEEPEN the audit, not repeat it:
- Surface additional conflicts the rule engine cannot see (narrative-logic ambiguity, tech-interface confusion, accessibility gaps, reset hazards, theme-treatment collisions between locks).
- Produce implementation cards whose theme ideas are genuinely specific to THIS room's theme and tone — reference its actual props, zones, lock treatments, and narrative. Never fall back to generic star/circle/triangle symbol suggestions.
- Do not duplicate a conflict the rule engine already reported (same locks + same issue). Deepening an existing conflict with a materially better, theme-specific fix is allowed: reference the locks involved and give a richer diagnosis/fix.

Return ONLY valid JSON (no prose, no markdown fences) matching this exact schema:
{
  "summary": string,  // 2-3 sentences: overall mapping health and the single most important action
  "conflicts": [{
    "id": string,                     // must start with "ai-"
    "riskLevel": "low" | "medium" | "high",
    "stage": string,                  // a stage/act used by this project
    "inputSignature": string,         // e.g. "number-4", "key", or a short label for non-signature issues
    "affectedLockIds": string[],      // must be real lock ids from the project
    "affectedPuzzleIds": string[],    // must be real puzzle ids from the project (may be empty)
    "diagnosis": string,              // specific to this room, 2-4 sentences
    "recommendedFix": string          // concrete, buildable, on-theme, 2-4 sentences
  }],
  "implementationCards": [{
    "id": string,                     // must start with "ai-"
    "title": string,
    "linkedLockId": string,           // must be a real lock id from the project
    "linkedPuzzleId": string,         // optional — omit if none applies; must be a real puzzle id
    "cueType": "proximity" | "visual-match" | "symbol-system" | "material-language" | "narrative-logic" | "accessibility" | "reset-safety" | "tech-interface",
    "themeIdea": string,
    "buildNotes": string,
    "playerInference": string,
    "accessibilityNote": string,
    "resetNote": string,
    "operatorRiskReduced": string
  }]
}

Limits: at most 4 conflicts and at most 8 implementation cards. Quality over quantity — fewer, sharper, theme-specific items beat exhaustive generic ones.`;

export function formatProject(project: LockMapProject, localConflicts: LockMappingConflict[]): string {
  const zones = project.zones
    .map((z) => `- ${z.name} (id ${z.id}, accessible at ${z.accessibleStage}): ${z.description}`)
    .join('\n');
  const locks = project.locks
    .map(
      (l) =>
        `- ${l.label} (id ${l.id}, zone ${l.zoneId}): ${l.inputType}${l.inputLength ? `-${l.inputLength}` : ''}, visible at ${l.visibleAtStage}. Physical: ${l.physicalDescription}. Theme treatment: ${l.currentThemeTreatment}. Reset id: ${l.resetIdentifier}. Accessibility: ${l.accessibilityNotes}`
    )
    .join('\n');
  const puzzles = project.puzzles
    .map(
      (p) =>
        `- ${p.title} (id ${p.id}, solved in ${p.zoneSolvedIn}, revealed at ${p.revealStage}): produces ${p.solutionType}${p.solutionLength ? `-${p.solutionLength}` : ''} (e.g. ${p.answerExample}) for lock ${p.intendedLockId}. Narrative: ${p.narrativeContext}`
    )
    .join('\n');
  const conflicts = localConflicts.length
    ? localConflicts
        .map(
          (c) =>
            `- [${c.riskLevel}] ${c.inputSignature} at ${c.stage} — locks ${c.affectedLockIds.join(', ')}: ${c.diagnosis}`
        )
        .join('\n')
    : '(none found by the rule engine)';

  return `PROJECT: ${project.title}
Theme: ${project.theme}
Tone: ${project.tone}
Room structure: ${project.roomStructure}
Target audience: ${project.targetAudience}
Design stage: ${project.designStage}

ZONES:
${zones || '(none)'}

LOCKS:
${locks || '(none)'}

PUZZLES:
${puzzles || '(none)'}

CONFLICTS ALREADY FOUND BY THE RULE ENGINE (do not repeat these verbatim):
${conflicts}`;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((s) => typeof s === 'string');
}

function ensureAiId(id: unknown, fallback: string): string {
  if (!isNonEmptyString(id)) return fallback;
  return id.startsWith('ai-') ? id : `ai-${id}`;
}

export function sanitiseConflicts(raw: unknown, project: LockMapProject): LockMappingConflict[] {
  if (!Array.isArray(raw)) return [];
  const lockIds = new Set(project.locks.map((l) => l.id));
  const puzzleIds = new Set(project.puzzles.map((p) => p.id));
  const out: LockMappingConflict[] = [];
  raw.forEach((c, i) => {
    if (typeof c !== 'object' || c === null) return;
    const conflict = c as Record<string, unknown>;
    if (
      !RISK_LEVELS.includes(conflict.riskLevel as (typeof RISK_LEVELS)[number]) ||
      !isNonEmptyString(conflict.stage) ||
      !isNonEmptyString(conflict.inputSignature) ||
      !isStringArray(conflict.affectedLockIds) ||
      !isNonEmptyString(conflict.diagnosis) ||
      !isNonEmptyString(conflict.recommendedFix)
    ) {
      return;
    }
    const affectedLockIds = conflict.affectedLockIds.filter((id) => lockIds.has(id));
    if (affectedLockIds.length === 0) return; // hallucinated lock references — drop
    const affectedPuzzleIds = isStringArray(conflict.affectedPuzzleIds)
      ? conflict.affectedPuzzleIds.filter((id) => puzzleIds.has(id))
      : [];
    out.push({
      id: ensureAiId(conflict.id, `ai-conflict-${i + 1}`),
      riskLevel: conflict.riskLevel as LockMappingConflict['riskLevel'],
      stage: conflict.stage,
      inputSignature: conflict.inputSignature,
      affectedLockIds,
      affectedPuzzleIds,
      diagnosis: conflict.diagnosis,
      recommendedFix: conflict.recommendedFix,
    });
  });
  return out;
}

export function sanitiseCards(raw: unknown, project: LockMapProject): ImplementationCard[] {
  if (!Array.isArray(raw)) return [];
  const lockIds = new Set(project.locks.map((l) => l.id));
  const puzzleIds = new Set(project.puzzles.map((p) => p.id));
  const out: ImplementationCard[] = [];
  raw.forEach((c, i) => {
    if (typeof c !== 'object' || c === null) return;
    const card = c as Record<string, unknown>;
    if (
      !isNonEmptyString(card.title) ||
      !isNonEmptyString(card.linkedLockId) ||
      !lockIds.has(card.linkedLockId) ||
      !CUE_TYPES.includes(card.cueType as (typeof CUE_TYPES)[number]) ||
      !isNonEmptyString(card.themeIdea) ||
      !isNonEmptyString(card.buildNotes) ||
      !isNonEmptyString(card.playerInference) ||
      !isNonEmptyString(card.accessibilityNote) ||
      !isNonEmptyString(card.resetNote) ||
      !isNonEmptyString(card.operatorRiskReduced)
    ) {
      return;
    }
    out.push({
      id: ensureAiId(card.id, `ai-card-${i + 1}`),
      title: card.title,
      linkedLockId: card.linkedLockId,
      linkedPuzzleId:
        isNonEmptyString(card.linkedPuzzleId) && puzzleIds.has(card.linkedPuzzleId)
          ? card.linkedPuzzleId
          : undefined,
      cueType: card.cueType as ImplementationCard['cueType'],
      themeIdea: card.themeIdea,
      buildNotes: card.buildNotes,
      playerInference: card.playerInference,
      accessibilityNote: card.accessibilityNote,
      resetNote: card.resetNote,
      operatorRiskReduced: card.operatorRiskReduced,
    });
  });
  return out;
}
