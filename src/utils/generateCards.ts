import {
  LockMapProject,
  LockMappingConflict,
  ImplementationCard,
  LockMechanism,
  PuzzleSolution,
} from '../types/lockmap';

let cardIdCounter = 0;
function nextId() {
  return `card-${++cardIdCounter}`;
}

interface ThemeVocab {
  symbols: string[];
  materials: string[];
  motifs: string[];
}

function extractThemeVocab(theme: string): ThemeVocab {
  const lower = theme.toLowerCase();
  if (lower.includes('séance') || lower.includes('seance') || lower.includes('victorian') || lower.includes('occult')) {
    return {
      symbols: ['crescent moon', 'sun card', 'all-seeing eye', 'ouroboros', 'pentagram star', 'music note', 'candle flame'],
      materials: ['brass charm', 'wax seal sticker', 'engraved acrylic tag', 'aged parchment label', 'velvet ribbon', 'embossed leather patch'],
      motifs: ['spirit communication', 'tarot imagery', 'celestial symbols', 'planchette shape', 'séance candles'],
    };
  }
  if (lower.includes('submarine') || lower.includes('naval') || lower.includes('ship')) {
    return {
      symbols: ['anchor', 'compass rose', 'porthole ring', 'depth gauge needle', 'sonar wave'],
      materials: ['riveted metal plate', 'stencilled warning label', 'brass dial insert', 'waterproof cable tag'],
      motifs: ['pressure systems', 'naval codes', 'depth readings', 'crew insignia'],
    };
  }
  if (lower.includes('spy') || lower.includes('corporate') || lower.includes('lab')) {
    return {
      symbols: ['biohazard', 'classified stamp', 'access tier badge', 'circuit trace', 'satellite dish'],
      materials: ['embossed security badge', 'RFID sticker', 'cable tie tag', 'tamper-evident label'],
      motifs: ['clearance levels', 'encrypted files', 'agent designations', 'mission codenames'],
    };
  }
  return {
    symbols: ['star', 'circle', 'triangle', 'square', 'diamond'],
    materials: ['label', 'charm', 'sticker', 'tag', 'marker'],
    motifs: ['environmental clues', 'colour coding', 'prop placement'],
  };
}

function getLockById(project: LockMapProject, id: string): LockMechanism | undefined {
  return project.locks.find((l) => l.id === id);
}

function getPuzzleById(project: LockMapProject, id: string): PuzzleSolution | undefined {
  return project.puzzles.find((p) => p.id === id);
}

function getPuzzleForLock(project: LockMapProject, lockId: string): PuzzleSolution | undefined {
  return project.puzzles.find((p) => p.intendedLockId === lockId);
}

export function generateImplementationCards(
  project: LockMapProject,
  conflicts: LockMappingConflict[]
): ImplementationCard[] {
  cardIdCounter = 0;
  const cards: ImplementationCard[] = [];
  const vocab = extractThemeVocab(project.theme);
  const usedSymbols = new Set<string>();

  function pickSymbol(): string {
    for (const s of vocab.symbols) {
      if (!usedSymbols.has(s)) {
        usedSymbols.add(s);
        return s;
      }
    }
    return 'unique sigil';
  }

  function pickMaterial(index: number): string {
    return vocab.materials[index % vocab.materials.length];
  }

  // For each conflict, generate proximity + visual-match + symbol cards per lock
  for (const conflict of conflicts) {
    let lockIndex = 0;
    for (const lockId of conflict.affectedLockIds) {
      const lock = getLockById(project, lockId);
      if (!lock) continue;
      const puzzle = getPuzzleForLock(project, lockId);
      const symbol = pickSymbol();
      const material = pickMaterial(lockIndex);

      // Visual match card
      if (puzzle) {
        cards.push({
          id: nextId(),
          title: `${capitalise(symbol)} — ${lock.label}`,
          linkedLockId: lock.id,
          linkedPuzzleId: puzzle.id,
          cueType: 'visual-match',
          themeIdea: `Mark both the ${puzzle.title} clue prop and the ${lock.label} with the same ${symbol} motif. When players solve the puzzle, the identical symbol on the lock makes the destination unambiguous.`,
          buildNotes: `Apply a ${material} bearing the ${symbol} to both the puzzle prop and the lock shackle or body. Use the same size and finish on both so the match reads immediately from a standing position.`,
          playerInference: `Players associate the ${symbol} on the puzzle source with the identical ${symbol} on the lock and insert the code without hesitation.`,
          accessibilityNote: `Pair the ${symbol} shape with a short text label (e.g. "${symbol.toUpperCase()}") to support colourblind and low-vision players. Do not rely on colour alone.`,
          resetNote: `Backstage label: ${lock.resetIdentifier} / ${symbol.toUpperCase()}-MATCH. Store the ${material} for the lock in the reset kit labelled ${lock.resetIdentifier}.`,
          operatorRiskReduced: `Eliminates wrong-code attempts on the other ${conflict.affectedLockIds.length - 1} ${conflict.inputSignature} lock(s) visible at ${conflict.stage}.`,
        });
      }

      // Proximity card for every lock in the conflict
      cards.push({
        id: nextId(),
        title: `Proximity Mount — ${lock.label}`,
        linkedLockId: lock.id,
        linkedPuzzleId: puzzle?.id,
        cueType: 'proximity',
        themeIdea: `Mount the ${lock.label} directly on or immediately adjacent to its source puzzle prop. Physical closeness becomes the primary mapping cue before any symbol system is needed.`,
        buildNotes: `If the puzzle prop allows it, attach the lock hasp to the prop itself (e.g. clasp on the diary, padlock on the cabinet door). If the prop is a wall element, mount the lock within 30 cm. Use a small directional arrow or border frame if proximity alone is insufficient.`,
        playerInference: `Players instinctively try the lock closest to the prop they just solved. Spatial logic removes guesswork.`,
        accessibilityNote: `Ensure the mounted position is reachable from a seated position or at standard reach height. Test with players of varied mobility before opening.`,
        resetNote: `Backstage label: ${lock.resetIdentifier} / PROXIMITY. The lock must always be returned to this exact mounting point after reset.`,
        operatorRiskReduced: `Reduces multi-lock trial runs. Players do not travel across the room to test answers in unrelated locks.`,
      });

      lockIndex++;
    }

    // One symbol-system card per conflict (covers all locks in the group)
    const symbolsUsedInConflict = conflict.affectedLockIds
      .map((id) => getLockById(project, id))
      .filter(Boolean)
      .map((_, i) => vocab.symbols[i] || `symbol-${i + 1}`);

    cards.push({
      id: nextId(),
      title: `${project.theme.split(',')[0]} Symbol System — ${conflict.stage}`,
      linkedLockId: conflict.affectedLockIds[0],
      cueType: 'symbol-system',
      themeIdea: `Create a consistent symbol vocabulary for the ${conflict.stage} lock cluster: assign one unique thematic symbol to each lock and its paired puzzle. For this room consider: ${symbolsUsedInConflict.join(', ')}. Apply each symbol to both the lock hardware and the corresponding puzzle prop using the same material and scale.`,
      buildNotes: `Print or engrave symbols onto ${vocab.materials[0]}s. Keep all symbols within the same visual family (all celestial, all botanical, all alchemical, etc.) to reinforce the room theme while remaining individually distinct. Include a key in the GM briefing sheet.`,
      playerInference: `Players learn that each symbol denotes a lock-puzzle pair. Once they recognise the system, every subsequent puzzle resolves clearly.`,
      accessibilityNote: `Use shape differentiation, not just colour. Each symbol should be recognisable in monochrome. Include tactile differentiation where possible (raised vs. recessed).`,
      resetNote: `Backstage wall chart: list each symbol, its lock reset identifier, and the puzzle prop it belongs to. Laminate and mount inside the GM booth.`,
      operatorRiskReduced: `A documented symbol system reduces GM resets errors and wrong-code interruptions across the entire ${conflict.stage} cluster.`,
    });
  }

  // Always add a reset-safety card for each lock
  for (const lock of project.locks) {
    cards.push({
      id: nextId(),
      title: `Reset Safety — ${lock.label}`,
      linkedLockId: lock.id,
      cueType: 'reset-safety',
      themeIdea: `Create a dedicated reset station card for ${lock.label} that lives in the GM booth. The card shows the correct combination, the physical location in the room, and the ${lock.resetIdentifier} identifier tag.`,
      buildNotes: `Print a laminated A6 reset card per lock. Colour-code by zone (e.g. all Act I parlour locks in amber, Act II locks in teal). Mount cards in order on a pegboard or inside the GM station door.`,
      playerInference: `Not player-facing. This card is for operators and gamemasters only.`,
      accessibilityNote: `Use 14pt minimum font on all reset cards. Include a photo of the lock in its mounted position for new GMs.`,
      resetNote: `Reset identifier: ${lock.resetIdentifier}. Card must show the combination, location photo, and symbol (if using a symbol system).`,
      operatorRiskReduced: `Prevents GMs from resetting the correct code onto the wrong lock hasp, which would break the room for the next group.`,
    });
  }

  return cards;
}

function capitalise(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
