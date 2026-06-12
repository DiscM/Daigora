export type IndexKey = 'trust' | 'ecology' | 'economy' | 'coordination';
export type Phase = 'setup' | 'play' | 'final' | 'gameOver';
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
  | { kind: 'discountNext'; cardType: CardType; amount: number };

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
}

export interface CrisisDefinition {
  id: string;
  name: string;
  text: string;
  effects: Effect[];
  calamity?: {
    index: IndexKey;
    threshold: number;
    text: string;
    effects: Effect[];
  };
}

export interface ProjectAidDefinition {
  id: string;
  name: string;
  role: string;
  passive: string;
  drawback: string;
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
  turn: number;
  planetHealth: number;
  maxPlanetHealth: number;
  actionPoints: number;
  policyPoints: number;
  indexes: Record<IndexKey, number>;
  selectedAidIds: string[];
  crisisDeck: string[];
  crisisDiscard: string[];
  currentCrisisId?: string;
  deck: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  exhausted: CardInstance[];
  ongoing: OngoingEffect[];
  incomingDamagePrevention: number;
  nextTurnDrawPenalty: number;
  nextTurnCostPenalty: Partial<Record<CardType, number>>;
  thisTurnCostPenalty: Partial<Record<CardType, number>>;
  policyLockedNextTurn: boolean;
  policyLockedThisTurn: boolean;
  noEnvironmentalPlayedThisTurn: boolean;
  untreatedDeforestation: boolean;
  finalRating?: string;
  finalSummary?: string;
  log: GameLogEntry[];
}
