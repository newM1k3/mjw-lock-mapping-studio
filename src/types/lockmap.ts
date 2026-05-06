export type RoomStructure = 'linear' | 'semi-linear' | 'open-world';
export type InputType = 'number' | 'letter' | 'symbol' | 'key' | 'keypad' | 'dial' | 'cryptex' | 'rfid' | 'magnetic' | 'custom';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface Zone {
  id: string;
  name: string;
  accessibleStage: string;
  description: string;
}

export interface LockMechanism {
  id: string;
  label: string;
  zoneId: string;
  inputType: InputType;
  inputLength?: number;
  visibleAtStage: string;
  physicalDescription: string;
  currentThemeTreatment: string;
  resetIdentifier: string;
  accessibilityNotes: string;
}

export interface PuzzleSolution {
  id: string;
  title: string;
  zoneSolvedIn: string;
  revealStage: string;
  solutionType: InputType;
  solutionLength?: number;
  answerExample: string;
  intendedLockId: string;
  narrativeContext: string;
}

export interface LockMappingConflict {
  id: string;
  riskLevel: RiskLevel;
  stage: string;
  inputSignature: string;
  affectedLockIds: string[];
  affectedPuzzleIds: string[];
  diagnosis: string;
  recommendedFix: string;
}

export interface ImplementationCard {
  id: string;
  title: string;
  linkedLockId: string;
  linkedPuzzleId?: string;
  cueType: 'proximity' | 'visual-match' | 'symbol-system' | 'material-language' | 'narrative-logic' | 'accessibility' | 'reset-safety' | 'tech-interface';
  themeIdea: string;
  buildNotes: string;
  playerInference: string;
  accessibilityNote: string;
  resetNote: string;
  operatorRiskReduced: string;
}

export interface LockMapProject {
  id: string;
  title: string;
  theme: string;
  tone: string;
  roomStructure: RoomStructure;
  targetAudience: string;
  designStage: string;
  zones: Zone[];
  locks: LockMechanism[];
  puzzles: PuzzleSolution[];
}
