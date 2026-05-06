import {
  LockMapProject,
  LockMechanism,
  PuzzleSolution,
  LockMappingConflict,
  RiskLevel,
} from '../types/lockmap';

export function buildInputSignature(lock: LockMechanism): string {
  if (lock.inputLength) {
    return `${lock.inputType}-${lock.inputLength}`;
  }
  return lock.inputType;
}

export function buildPuzzleSignature(puzzle: PuzzleSolution): string {
  if (puzzle.solutionLength) {
    return `${puzzle.solutionType}-${puzzle.solutionLength}`;
  }
  return puzzle.solutionType;
}

interface LockGroup {
  stage: string;
  signature: string;
  locks: LockMechanism[];
}

function groupLocksByStageAndSignature(locks: LockMechanism[]): LockGroup[] {
  const map = new Map<string, LockGroup>();
  for (const lock of locks) {
    const sig = buildInputSignature(lock);
    const key = `${lock.visibleAtStage}::${sig}`;
    if (!map.has(key)) {
      map.set(key, { stage: lock.visibleAtStage, signature: sig, locks: [] });
    }
    map.get(key)!.locks.push(lock);
  }
  return Array.from(map.values());
}

export function detectConflicts(project: LockMapProject): LockMappingConflict[] {
  const conflicts: LockMappingConflict[] = [];
  let conflictIdx = 0;

  const groups = groupLocksByStageAndSignature(project.locks);

  for (const group of groups) {
    if (group.locks.length < 2) continue;

    const riskLevel: RiskLevel = group.locks.length >= 3 ? 'high' : 'medium';

    const affectedPuzzleIds = project.puzzles
      .filter(
        (p) =>
          p.revealStage === group.stage &&
          buildPuzzleSignature(p) === group.signature
      )
      .map((p) => p.id);

    const lockLabels = group.locks.map((l) => `"${l.label}"`).join(', ');
    const diagnosis =
      riskLevel === 'high'
        ? `Three or more locks share the input signature "${group.signature}" and are all visible during ${group.stage}. Players who derive any of the ${group.locks.length} solutions will face ambiguity about which lock to use, triggering repeated trial-and-error attempts and breaking game momentum.`
        : `Two locks share the input signature "${group.signature}" and are both visible during ${group.stage} (${lockLabels}). Without a clear mapping cue, players may attempt each solution in both locks.`;

    const recommendedFix =
      riskLevel === 'high'
        ? `Assign each lock a unique, on-theme symbol or prop that matches its corresponding puzzle source. Use proximity placement (mount the lock adjacent to its puzzle prop), a consistent symbol system (e.g., sun / moon / music note), and add backstage reset labels to all three locks.`
        : `Add a shared visual motif between the puzzle source and its intended lock — for example, a wax seal, embossed charm, or printed sigil that appears on both the clue and the lock hardware. Ensure the two locks have distinct colour treatments using colour-plus-shape pairing for accessibility.`;

    conflicts.push({
      id: `conflict-${++conflictIdx}`,
      riskLevel,
      stage: group.stage,
      inputSignature: group.signature,
      affectedLockIds: group.locks.map((l) => l.id),
      affectedPuzzleIds,
      diagnosis,
      recommendedFix,
    });
  }

  // Cross-check: puzzles whose solution signature matches more than one visible lock at their reveal stage
  for (const puzzle of project.puzzles) {
    const pSig = buildPuzzleSignature(puzzle);
    const visibleMatchingLocks = project.locks.filter(
      (l) =>
        l.visibleAtStage === puzzle.revealStage &&
        buildInputSignature(l) === pSig &&
        l.id !== puzzle.intendedLockId
    );

    if (visibleMatchingLocks.length > 0) {
      const alreadyCovered = conflicts.some(
        (c) =>
          c.stage === puzzle.revealStage &&
          c.inputSignature === pSig &&
          c.affectedLockIds.includes(puzzle.intendedLockId)
      );
      if (!alreadyCovered) {
        conflicts.push({
          id: `conflict-${++conflictIdx}`,
          riskLevel: 'medium',
          stage: puzzle.revealStage,
          inputSignature: pSig,
          affectedLockIds: [puzzle.intendedLockId, ...visibleMatchingLocks.map((l) => l.id)],
          affectedPuzzleIds: [puzzle.id],
          diagnosis: `The puzzle "${puzzle.title}" produces a ${pSig} answer, but its intended lock is not the only ${pSig} lock visible at ${puzzle.revealStage}. Players cannot distinguish the correct destination without a clear mapping cue.`,
          recommendedFix: `Link the puzzle prop to its intended lock with a shared symbol, material, or proximity placement.`,
        });
      }
    }
  }

  return conflicts;
}

export function calculateRiskScore(conflicts: LockMappingConflict[]): number {
  let score = 0;
  for (const c of conflicts) {
    if (c.riskLevel === 'high') score += 3;
    else if (c.riskLevel === 'medium') score += 1;
  }
  return score;
}

export function riskLabel(score: number): 'low' | 'medium' | 'high' {
  if (score >= 3) return 'high';
  if (score >= 1) return 'medium';
  return 'low';
}
