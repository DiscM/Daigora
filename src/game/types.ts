export type IndexKey = 'trust' | 'ecology' | 'economy' | 'coordination';
export type Phase = 'setup' | 'crisisChoice' | 'play' | 'draftOrUpgrade' | 'final' | 'gameOver';
export const INDEX_KEYS: IndexKey[] = ['trust', 'ecology', 'economy', 'coordination'];
export type CardType = 'Education' | 'Environmental Work' | 'Technology' | 'Policy' | 'Emergency' | 'Status';
export type StatusKind = 'Pollution' | 'Apathy' | 'Misinformation' | 'Delay' | 'Backlash';

export type Effect =
  | { kind: 'index'; index: IndexKey; amount: number }
  | { kind: 'health'; amount: number }
  | { kind: 'ap'; amount: number }
  | { kind: 'policy'; amount: number }
  | { kind: 'draw'; amount: number }
  | { kind: 'cleanse'; status?: StatusKind; amount: number }
  | { kind: 'preventDamage'; amount: number }
  | { kind: 'ongoingShield'; tag: string; amount: number }
  | { kind: 'peekCrisis'; amount: number }
  | { kind: 'discountNext'; cardType: CardType; amount: number }
  | { kind: 'addStatus'; status: StatusKind };

export interface CardDefinition {
  id: string;
  name: string;
  type: CardType;
  costAp?: number;
  costPp?: number;
  text: string;
  keywords?: Array<'Draw' | 'Exhaust' | 'Ongoing' | 'Retain' | 'Cleanse'>;
  effects: Effect[];
  unplayable?: boolean;
  upgradesTo?: string;
}

export interface CrisisChoice {
  text: string;
  effects: Effect[];
  addStatuses?: StatusKind[];
  drawPenaltyNextTurn?: number;
  costPenalties?: Array<{ cardType: CardType; amount: number; timing: 'thisTurn' | 'nextTurn' | 'both' }>;
}

export interface CrisisDefinition {
  id: string;
  name: string;
  text: string;
  tags?: string[];
  addStatuses?: StatusKind[];
  drawPenaltyNextTurn?: number;
  costPenalties?: Array<{ cardType: CardType; amount: number; timing: 'thisTurn' | 'nextTurn' | 'both' }>;
  requiresEnvironmentalResponse?: boolean;
  pollutionEscalatesIfNoEnvironmental?: boolean;
  untreatedDamage?: number;
  avertWhenStatusCleansed?: StatusKind;
  effects: Effect[];
  choice?: {
    text: string;
    options: [CrisisChoice, CrisisChoice];
  };
  calamity?: {
    index: IndexKey;
    threshold: number;
    text: string;
    addStatuses?: StatusKind[];
    effects: Effect[];
  };
}

export interface ProjectAidDefinition {
  id: string;
  name: string;
  role: string;
  passive: string;
  drawback: string;
  ability?: string;
}

export interface CardInstance {
  instanceId: string;
  defId: string;
}

export interface OngoingEffect {
  source: string;
  tag: string;
  amount: number;
}

export interface GameLogEntry {
  turn: number;
  text: string;
}

export interface GameState {
  seed: string;
  rngState: number;
  phase: Phase;
  gameMode: 'campaign' | 'workshop';
  difficulty: 'normal' | 'hard' | 'apocalypse';
  turnLimit: number;
  draftOptions: string[];
  upgradeOptions: string[];
  turn: number;
  planetHealth: number;
  maxPlanetHealth: number;
  actionPoints: number;
  policyPoints: number;
  maxPolicyPoints: number;
  indexes: Record<IndexKey, number>;
  selectedAidIds: string[];
  crisisDeck: string[];
  crisisDiscard: string[];
  currentCrisisId?: string;
  pendingCrisisChoice?: { text: string; options: [CrisisChoice, CrisisChoice] };
  midGameBonuses: { allIndexesFiveByTurnEight?: boolean };
  nextInstanceId: number;
  deck: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  exhausted: CardInstance[];
  ongoing: OngoingEffect[];
  incomingDamagePrevention: number;
  pendingCrisisDamage: number;
  crisisAvertedThisTurn: boolean;
  nextTurnDrawPenalty: number;
  nextTurnCostPenalty: Partial<Record<CardType, number>>;
  thisTurnCostPenalty: Partial<Record<CardType, number>>;
  policyLockedNextTurn: boolean;
  policyLockedThisTurn: boolean;
  noEnvironmentalPlayedThisTurn: boolean;
  educationPlayedThisTurn: boolean;
  educationBonusUsedThisTurn: boolean;
  ecologyBonusUsedThisTurn: boolean;
  untreatedDeforestation: boolean;
  desperationApBonusNextTurn: number;
  cascadingCooldownTurns: number;
  crisisAppearanceCount: Record<string, number>;
  advisorAbilityUsed: Record<string, boolean>;
  finalRating?: string;
  finalSummary?: string;
  log: GameLogEntry[];
}
