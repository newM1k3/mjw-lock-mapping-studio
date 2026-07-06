// seedFromGenerated.ts — seed a lock map from an AI Room Generator document.
//
// Rooms sent from the AI Room Generator ("Send to My Venue") carry their full
// generated document in experiences.design_parameters. Instead of Story-only
// seeding, we mine each puzzle_flow entry for lock hardware (props like
// "3-digit combo lock", "4-digit keypad", "3-letter word lock") and answer
// codes (reset notes like "Re-lock drawer to 823"), producing a lock map
// that arrives pre-populated with zones, locks, and puzzle→lock mappings.
// Everything is a best-effort seed the designer refines in the wizard.

import type { InputType, LockMapProject, LockMechanism, PuzzleSolution, RoomStructure, Zone } from '../types/lockmap';

// Room lifecycle (experiences.status) → the tool's design-stage labels.
export const STATUS_TO_STAGE: Record<string, string> = {
  draft: 'Concept / Ideation',
  review: 'Design review',
  approved: 'Pre-production',
  live: 'Operational',
  retired: '',
};

export interface GeneratedPuzzle {
  title?: string;
  role_in_flow?: string;
  required_props?: string[];
  setup?: string;
  player_facing_clue?: string;
  solution?: string;
  output?: string;
  reset_notes?: string;
  safety_or_ops_notes?: string;
}

export interface GeneratedRoomDoc {
  title?: string;
  tagline?: string;
  theme?: string;
  difficulty?: string;
  players?: string;
  duration?: string;
  format?: string;
  operator_summary?: string;
  story?: { introduction?: string; midpoint?: string; climax?: string; resolution?: string };
  puzzle_flow?: GeneratedPuzzle[];
}

export interface GeneratedRoomPayload {
  source: string;
  room: GeneratedRoomDoc;
}

export function isGeneratedRoomPayload(value: unknown): value is GeneratedRoomPayload {
  const payload = value as GeneratedRoomPayload | null;
  return Boolean(payload && payload.source === 'room_generator' && payload.room && typeof payload.room === 'object');
}

const FORMAT_TO_STRUCTURE: Record<string, RoomStructure> = {
  'Single Room': 'linear',
  Linear: 'linear',
  'Multi-Room': 'semi-linear',
  'Non-Linear': 'open-world',
};

interface LockCandidate {
  inputType: InputType;
  inputLength?: number;
  description: string;
}

// Ordered: more specific hardware first ("4-digit keypad" must not read as a
// plain number lock, "keypad" must not match the \bkey\b pattern).
const HARDWARE_PATTERNS: Array<{ re: RegExp; type: InputType }> = [
  { re: /(\d+)[-\s]?digit[^.;]{0,40}keypad|keypad[^.;]{0,40}(\d+)[-\s]?digit/i, type: 'keypad' },
  { re: /\bkeypad\b/i, type: 'keypad' },
  { re: /(\d+)[-\s]?letter[^.;]{0,40}word lock|\bword lock\b/i, type: 'letter' },
  { re: /\bcryptex\b/i, type: 'cryptex' },
  { re: /\brfid\b/i, type: 'rfid' },
  { re: /magnet/i, type: 'magnetic' },
  { re: /(\d+)[-\s]?digit[^.;]{0,40}(?:lock|lockbox|combo|combination|padlock|latch)|(?:lockbox|padlock|combination lock)[^.;]{0,40}(\d+)[-\s]?digit/i, type: 'number' },
  { re: /\b(?:combination|combo)\s+(?:lock|padlock|lockbox|latch)\b/i, type: 'number' },
  { re: /\bdial\b/i, type: 'dial' },
  { re: /\bkey(?:ed)?\b(?!pad)/i, type: 'key' },
];

function findHardware(text: string): LockCandidate | null {
  for (const { re, type } of HARDWARE_PATTERNS) {
    const match = text.match(re);
    if (match) {
      const length = match.slice(1).map(Number).find((n) => Number.isFinite(n));
      return { inputType: type, inputLength: length, description: text.trim() };
    }
  }
  return null;
}

/** A code is only accepted as all-digits or all-uppercase-letters, so prose after "to" never qualifies. */
function isCode(value: string): boolean {
  return /^\d{2,10}$/.test(value) || /^[A-Z]{2,10}$/.test(value);
}

function extractAnswer(puzzle: GeneratedPuzzle): string {
  const text = [puzzle.reset_notes, puzzle.solution, puzzle.setup].filter(Boolean).join(' ');

  // "Re-lock drawer to 823", "reset word lock to RUN", "relock cabinet to 4471"
  for (const match of text.matchAll(/(?:reset|re-?locks?|re-?arm|set|enter|returns?)[^.]{0,80}?\bto\s+([A-Za-z0-9]{2,10})\b/gi)) {
    if (isCode(match[1])) return match[1];
  }
  // "dial 823", "opens on 115", "the vault keypad number 2906", "spell RUN"
  for (const match of text.matchAll(/\b(?:dial(?:ed)?|opens? on|enter(?:ing)?|spell(?:s|ing)?|reads?)\s+([A-Za-z0-9]{2,10})\b/gi)) {
    if (isCode(match[1])) return match[1];
  }
  // "give combo 3-2-1", "the code 2-9-0-6" — hyphen-separated digit sequences.
  for (const match of text.matchAll(/\b(?:combo|code|combination|sequence)\s*(?:is|of|:)?\s*(\d(?:-\d){1,7})\b/gi)) {
    return match[1].replace(/-/g, '');
  }
  // Last resort: a standalone 3-8 digit number in the solution or reset text.
  const digits = [puzzle.solution, puzzle.reset_notes].filter(Boolean).join(' ').match(/\b(\d{3,8})\b/);
  return digits ? digits[1] : '';
}

/** Prefer hardware whose input alphabet matches the extracted answer. */
function matchesAnswer(candidate: LockCandidate, answer: string): boolean {
  if (!answer) return true;
  if (/^\d+$/.test(answer)) return ['number', 'keypad', 'dial'].includes(candidate.inputType);
  return ['letter', 'cryptex'].includes(candidate.inputType);
}

function detectLock(puzzle: GeneratedPuzzle, answer: string): LockCandidate | null {
  const candidates = (puzzle.required_props || [])
    .map((prop) => findHardware(prop))
    .filter((c): c is LockCandidate => c !== null);

  const preferred = candidates.find((c) => matchesAnswer(c, answer)) || candidates[0];
  if (preferred) return preferred;

  // No lock-like prop, but the notes still reference resetting to a code
  // (e.g. "relock cabinet to 4471") or lock hardware in prose.
  const prose = [puzzle.reset_notes, puzzle.setup, puzzle.solution].filter(Boolean).join(' ');
  const fromProse = findHardware(prose);
  if (fromProse) {
    if (answer && !matchesAnswer(fromProse, answer)) {
      return { inputType: /^\d+$/.test(answer) ? 'number' : 'letter', inputLength: answer.length, description: fromProse.description };
    }
    return fromProse;
  }
  if (answer) {
    return {
      inputType: /^\d+$/.test(answer) ? 'number' : 'letter',
      inputLength: answer.length,
      description: puzzle.reset_notes?.trim() || 'Lock inferred from puzzle notes.',
    };
  }
  return null;
}

export function seedFromGeneratedRoom(room: GeneratedRoomDoc, experienceStatus: string): LockMapProject {
  const structure = FORMAT_TO_STRUCTURE[room.format || ''] || 'linear';
  const puzzles = room.puzzle_flow || [];

  // Multi-room designs get two act zones with the puzzle chain split across
  // them (generated multi-room flows progress front space → back space);
  // everything else seeds one zone with all locks assumed visible in Act I,
  // the conservative assumption for the ambiguity audit.
  const twoZones = structure === 'semi-linear' && puzzles.length >= 2;
  const actTwoStart = twoZones ? Math.ceil(puzzles.length / 2) : puzzles.length;

  const zones: Zone[] = twoZones
    ? [
        { id: 'zone-act-1', name: 'Act I Space', accessibleStage: 'Act I', description: room.story?.introduction || 'Opening play space from the generated design.' },
        { id: 'zone-act-2', name: 'Act II Space', accessibleStage: 'Act II', description: room.story?.midpoint || 'Second play space, unlocked mid-game.' },
      ]
    : [
        { id: 'zone-main', name: 'Main Play Space', accessibleStage: 'Act I', description: room.story?.introduction || room.operator_summary || 'Play space from the generated design.' },
      ];

  const locks: LockMechanism[] = [];
  const puzzleSolutions: PuzzleSolution[] = [];

  puzzles.forEach((puzzle, index) => {
    const stage = index >= actTwoStart ? 'Act II' : 'Act I';
    const zoneId = index >= actTwoStart ? 'zone-act-2' : zones[0].id;
    const answer = extractAnswer(puzzle);
    const candidate = detectLock(puzzle, answer);
    const title = puzzle.title || `Puzzle ${index + 1}`;

    let lockId = '';
    if (candidate) {
      lockId = `gen-lock-${index + 1}`;
      locks.push({
        id: lockId,
        label: `${title} Lock`,
        zoneId,
        inputType: candidate.inputType,
        inputLength: candidate.inputLength ?? (answer ? answer.length : undefined),
        visibleAtStage: stage,
        physicalDescription: candidate.description,
        currentThemeTreatment: '',
        resetIdentifier: `GEN-${index + 1}`,
        accessibilityNotes: '',
      });
    }

    puzzleSolutions.push({
      id: `gen-puzzle-${index + 1}`,
      title,
      zoneSolvedIn: zoneId,
      revealStage: stage,
      solutionType: candidate?.inputType ?? 'custom',
      solutionLength: candidate?.inputLength ?? (answer ? answer.length : undefined),
      answerExample: answer || (puzzle.output || '').slice(0, 60),
      intendedLockId: lockId,
      narrativeContext: puzzle.role_in_flow || puzzle.player_facing_clue || '',
    });
  });

  return {
    id: crypto.randomUUID(),
    title: room.title || 'Generated Room',
    theme: room.theme || '',
    tone: room.tagline || '',
    roomStructure: structure,
    targetAudience: [room.difficulty, room.players ? `${room.players} players` : ''].filter(Boolean).join(' · '),
    designStage: STATUS_TO_STAGE[experienceStatus] ?? '',
    zones,
    locks,
    puzzles: puzzleSolutions,
  };
}
