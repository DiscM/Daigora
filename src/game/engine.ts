import { cardById, crises, crisisById, starterDeckIds } from './content';
import { INDEX_KEYS } from './types';
import type { CardDefinition, CardInstance, Effect, GameLogEntry, GameState, IndexKey, StatusKind } from './types';

export const GAME_TURN_LIMIT = 20;

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

function nextRandom(state: number): [number, number] {
  let x = state;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return [(x >>> 0) / 4294967296, x >>> 0 || 1];
}

function shuffleWithState<T>(items: T[], rngState: number): [T[], number] {
  const copy = [...items];
  let state = rngState;
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const [random, nextState] = nextRandom(state);
    state = nextState;
    const j = Math.floor(random * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return [copy, state];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function cloneState(input: GameState): GameState {
  return structuredClone(input) as GameState;
}

function makeInstances(ids: string[], prefix: string): CardInstance[] {
  return ids.map((defId, index) => ({ defId, instanceId: `${prefix}-${index}-${defId}` }));
}

function addLog(state: GameState, text: string): GameLogEntry[] {
  return [{ turn: state.turn, text }, ...state.log].slice(0, 12);
}

function nextInstanceId(state: GameState, prefix: string): string {
  const id = `${prefix}-${state.nextInstanceId}`;
  state.nextInstanceId += 1;
  return id;
}

function mutateIndex(state: GameState, index: IndexKey, amount: number, skipAdvisorDrawbacks = false): void {
  const previousValue = state.indexes[index];
  let adjustedAmount = amount;
  if (
    index === 'trust' &&
    amount > 0 &&
    state.selectedAidIds.includes('engineer') &&
    !state.educationPlayedThisTurn
  ) {
    adjustedAmount = Math.max(0, amount - 1);
    if (amount !== adjustedAmount) state.log = addLog(state, 'Engineer drawback reduced a Trust gain.');
  }
  if (index === 'ecology' && amount > 0 && state.selectedAidIds.includes('ecologist') && !state.ecologyBonusUsedThisTurn) {
    adjustedAmount += 1;
    state.ecologyBonusUsedThisTurn = true;
  }
  state.indexes[index] = clamp(state.indexes[index] + adjustedAmount, 0, 10);
  if (
    !skipAdvisorDrawbacks &&
    index === 'coordination' &&
    state.selectedAidIds.includes('policy-advocate') &&
    previousValue >= 3 &&
    state.indexes.coordination < 3
  ) {
    mutateIndex(state, 'trust', -1, true);
    state.log = addLog(state, 'Policy Advocate drawback triggered: -1 Trust.');
  }
}

function applyHealth(state: GameState, amount: number): void {
  if (amount < 0) {
    const prevented = Math.min(Math.abs(amount), state.incomingDamagePrevention);
    state.incomingDamagePrevention -= prevented;
    state.planetHealth = clamp(state.planetHealth + amount + prevented, 0, state.maxPlanetHealth);
    if (prevented > 0) state.log = addLog(state, `Prevented ${prevented} damage.`);
    return;
  }
  state.planetHealth = clamp(state.planetHealth + amount, 0, state.maxPlanetHealth);
}

function findDefinition(instance: CardInstance): CardDefinition {
  return cardById[instance.defId];
}

function isRetained(instance: CardInstance): boolean {
  return findDefinition(instance).keywords?.includes('Retain') ?? false;
}

function addStatusToDiscard(state: GameState, status: StatusKind): void {
  const map: Record<StatusKind, string> = {
    Pollution: 'status-pollution',
    Apathy: 'status-apathy',
    Misinformation: 'status-misinformation',
    Delay: 'status-delay',
    Backlash: 'status-backlash',
  };
  const count = state.deck.length + state.hand.length + state.discard.length + state.exhausted.length;
  state.discard.push({ defId: map[status], instanceId: nextInstanceId(state, `status-${count}-${status}`) });
}

function cleanse(state: GameState, amount: number, status?: StatusKind): number {
  const piles: Array<keyof Pick<GameState, 'hand' | 'discard' | 'deck'>> = ['hand', 'discard', 'deck'];
  let removed = 0;
  for (const pileName of piles) {
    const pile = state[pileName];
    for (let i = pile.length - 1; i >= 0 && removed < amount; i -= 1) {
      const card = findDefinition(pile[i]);
      const statusName = card.name as StatusKind;
      if (card.type === 'Status' && (!status || statusName === status)) {
        state.exhausted.push(...pile.splice(i, 1));
        removed += 1;
      }
    }
  }
  return removed;
}

function drawCards(state: GameState, count: number): void {
  for (let i = 0; i < count; i += 1) {
    if (state.deck.length === 0 && state.discard.length > 0) {
      const [deck, rngState] = shuffleWithState(state.discard, state.rngState);
      state.rngState = rngState;
      state.deck = deck;
      state.discard = [];
      state.log = addLog(state, 'Shuffled discard into the deck.');
    }
    const drawn = state.deck.shift();
    if (!drawn) return;
    const def = findDefinition(drawn);
    if (def.id === 'status-pollution') {
      state.actionPoints = Math.max(0, state.actionPoints - 1);
      state.hand.push(drawn);
      state.log = addLog(state, 'Pollution clogged the turn: -1 AP.');
    } else if (def.id === 'status-backlash') {
      mutateIndex(state, 'trust', -1);
      state.exhausted.push(drawn);
      state.log = addLog(state, 'Backlash lowered Trust and exhausted itself.');
    } else if (def.id === 'status-misinformation') {
      state.thisTurnCostPenalty.Education = (state.thisTurnCostPenalty.Education ?? 0) + 1;
      state.thisTurnCostPenalty.Policy = (state.thisTurnCostPenalty.Policy ?? 0) + 1;
      state.hand.push(drawn);
      state.log = addLog(state, 'Misinformation raised Education and Policy costs.');
    } else if (def.id === 'status-delay') {
      state.thisTurnCostPenalty.Technology = (state.thisTurnCostPenalty.Technology ?? 0) + 1;
      state.thisTurnCostPenalty.Policy = (state.thisTurnCostPenalty.Policy ?? 0) + 1;
      state.exhausted.push(drawn);
      state.log = addLog(state, 'Delay slowed Technology and Policy this turn.');
    } else {
      state.hand.push(drawn);
    }
  }
}

function applyEffect(state: GameState, effect: Effect): void {
  switch (effect.kind) {
    case 'index':
      mutateIndex(state, effect.index, effect.amount);
      break;
    case 'health':
      applyHealth(state, effect.amount);
      break;
    case 'ap':
      state.actionPoints = Math.max(0, state.actionPoints + effect.amount);
      break;
    case 'policy':
      state.policyPoints = Math.max(0, state.policyPoints + effect.amount);
      break;
    case 'draw':
      drawCards(state, effect.amount);
      break;
    case 'cleanse': {
      const removed = cleanse(state, effect.amount, effect.status);
      state.log = addLog(state, removed ? `Cleansed ${removed} status card.` : 'No matching status card to cleanse.');
      break;
    }
    case 'preventDamage':
      state.incomingDamagePrevention += effect.amount;
      break;
    case 'ongoingShield':
      if (state.selectedAidIds.includes('disaster-responder')) {
        state.log = addLog(state, 'Disaster Responder drawback blocked an ongoing shield.');
        break;
      }
      state.ongoing.push({ source: 'card', tag: effect.tag, amount: effect.amount });
      break;
    case 'peekCrisis':
      state.log = addLog(state, `Next crises: ${state.crisisDeck.slice(0, effect.amount).map((id) => crisisById[id].name).join(', ') || 'none'}.`);
      break;
    case 'discountNext':
      state.thisTurnCostPenalty[effect.cardType] = (state.thisTurnCostPenalty[effect.cardType] ?? 0) - effect.amount;
      break;
  }
}

function applyCrisisEffect(state: GameState, effect: Effect): void {
  if (effect.kind === 'health' && effect.amount < 0) {
    const damage = Math.abs(effect.amount);
    const tags = state.currentCrisisId ? crisisById[state.currentCrisisId].tags ?? [] : [];
    const ongoingPrevention = state.ongoing
      .filter((ongoing) => tags.includes(ongoing.tag))
      .reduce((sum, ongoing) => sum + ongoing.amount, 0);
    const prevented = Math.min(damage, ongoingPrevention);
    state.pendingCrisisDamage += damage - prevented;
    if (prevented > 0) state.log = addLog(state, `Ongoing projects prevented ${prevented} crisis damage.`);
    return;
  }
  applyEffect(state, effect);
}

function checkLoss(state: GameState): void {
  if (state.planetHealth <= 0) {
    state.phase = 'gameOver';
    state.finalRating = 'Collapse';
    state.finalSummary = 'Planet Health reached 0 before the world could stabilize.';
  }
}

function resolveCascadingIfNeeded(state: GameState, deferDamage = false): void {
  const critical = INDEX_KEYS.filter((key) => state.indexes[key] <= 2).length;
  if (critical >= 2) {
    if (deferDamage) state.pendingCrisisDamage += 2;
    else applyHealth(state, -2);
    addStatusToDiscard(state, 'Apathy');
    state.log = addLog(state, 'Cascading Disaster triggered: -2 Health and +1 Apathy.');
  }
}

function applyAidSetup(state: GameState): void {
  if (state.selectedAidIds.includes('ecologist')) {
    mutateIndex(state, 'economy', -1);
  }
}

export function createGame(seed = 'earth-month', selectedAidIds = ['educator', 'disaster-responder']): GameState {
  let rngState = hashSeed(seed);
  const [deck, deckState] = shuffleWithState(makeInstances(starterDeckIds, 'starter'), rngState);
  rngState = deckState;
  const crisisIds = Array.from({ length: Math.ceil(GAME_TURN_LIMIT / crises.length) }, () => crises.map((crisis) => crisis.id))
    .flat()
    .slice(0, GAME_TURN_LIMIT);
  const [crisisDeck, crisisState] = shuffleWithState(crisisIds, rngState);
  rngState = crisisState;
  const state: GameState = {
    seed,
    rngState,
    phase: 'setup',
    turn: 0,
    planetHealth: 24,
    maxPlanetHealth: 24,
    actionPoints: 0,
    policyPoints: 0,
    indexes: { trust: 4, ecology: 4, economy: 4, coordination: 4 },
    selectedAidIds,
    crisisDeck,
    crisisDiscard: [],
    nextInstanceId: deck.length + 1,
    deck,
    hand: [],
    discard: [],
    exhausted: [],
    ongoing: [],
    incomingDamagePrevention: 0,
    pendingCrisisDamage: 0,
    crisisAvertedThisTurn: false,
    nextTurnDrawPenalty: 0,
    nextTurnCostPenalty: {},
    thisTurnCostPenalty: {},
    policyLockedNextTurn: false,
    policyLockedThisTurn: false,
    noEnvironmentalPlayedThisTurn: true,
    educationPlayedThisTurn: false,
    educationBonusUsedThisTurn: false,
    ecologyBonusUsedThisTurn: false,
    untreatedDeforestation: false,
    log: [],
  };
  applyAidSetup(state);
  return startTurn(state);
}

export function startTurn(input: GameState): GameState {
  const state = cloneState(input);
  if (state.phase === 'gameOver') return state;
  if (state.turn >= GAME_TURN_LIMIT) return resolveFinalCrisis(state);
  state.phase = 'play';
  state.turn += 1;
  state.actionPoints = state.turn >= 6 ? 4 : 3;
  state.incomingDamagePrevention = 0;
  state.pendingCrisisDamage = 0;
  state.crisisAvertedThisTurn = false;
  state.thisTurnCostPenalty = { ...state.nextTurnCostPenalty };
  state.nextTurnCostPenalty = {};
  state.policyLockedThisTurn = state.policyLockedNextTurn;
  state.policyLockedNextTurn = false;
  state.noEnvironmentalPlayedThisTurn = true;
  state.educationPlayedThisTurn = false;
  state.educationBonusUsedThisTurn = false;
  state.ecologyBonusUsedThisTurn = false;
  state.untreatedDeforestation = false;
  state.hand = state.hand.filter(isRetained);

  if (state.selectedAidIds.includes('disaster-responder')) {
    state.incomingDamagePrevention += 1;
  }

  const crisisId = state.crisisDeck.shift();
  if (crisisId) {
    state.currentCrisisId = crisisId;
    resolveCrisis(state, crisisId);
  }

  const drawCount = Math.max(1, 5 - state.nextTurnDrawPenalty);
  state.nextTurnDrawPenalty = 0;
  drawCards(state, drawCount);
  state.log = addLog(state, `Turn ${state.turn} began.`);
  checkLoss(state);
  return state;
}

function resolveCrisis(state: GameState, crisisId: string): void {
  const crisis = crisisById[crisisId];
  state.log = addLog(state, `Crisis revealed: ${crisis.name}.`);
  crisis.addStatuses?.forEach((status) => addStatusToDiscard(state, status));
  state.nextTurnDrawPenalty += crisis.drawPenaltyNextTurn ?? 0;
  crisis.costPenalties?.forEach((penalty) => {
    if (penalty.timing === 'thisTurn' || penalty.timing === 'both') {
      state.thisTurnCostPenalty[penalty.cardType] = (state.thisTurnCostPenalty[penalty.cardType] ?? 0) + penalty.amount;
    }
    if (penalty.timing === 'nextTurn' || penalty.timing === 'both') {
      state.nextTurnCostPenalty[penalty.cardType] = (state.nextTurnCostPenalty[penalty.cardType] ?? 0) + penalty.amount;
    }
  });
  if (crisis.untreatedDamage) state.untreatedDeforestation = true;

  crisis.effects.forEach((effect) => applyCrisisEffect(state, effect));
  if (crisis.calamity && state.indexes[crisis.calamity.index] <= crisis.calamity.threshold) {
    crisis.calamity.effects.forEach((effect) => applyCrisisEffect(state, effect));
    crisis.calamity.addStatuses?.forEach((status) => addStatusToDiscard(state, status));
    state.log = addLog(state, crisis.calamity.text);
  }
  resolveCascadingIfNeeded(state, true);
}

function hasStatusInActivePiles(state: GameState, status: StatusKind): boolean {
  return [...state.hand, ...state.discard, ...state.deck].some((card) => findDefinition(card).name === status);
}

function updateCrisisAverted(state: GameState): void {
  if (!state.currentCrisisId || state.crisisAvertedThisTurn) return;
  const crisis = crisisById[state.currentCrisisId];
  if (crisis.calamity && state.indexes[crisis.calamity.index] > crisis.calamity.threshold) {
    state.crisisAvertedThisTurn = true;
    return;
  }
  if (crisis.requiresEnvironmentalResponse && !state.noEnvironmentalPlayedThisTurn) state.crisisAvertedThisTurn = true;
  if (crisis.avertWhenStatusCleansed && !hasStatusInActivePiles(state, crisis.avertWhenStatusCleansed)) {
    state.crisisAvertedThisTurn = true;
  }
}

export function getCardCost(state: GameState, card: CardDefinition): { ap: number; pp: number } {
  let ap = card.costAp ?? 0;
  let pp = card.costPp ?? 0;
  const penalty = state.thisTurnCostPenalty[card.type] ?? 0;
  if (card.type === 'Policy') pp += Math.max(0, penalty);
  else ap += penalty;
  if (state.selectedAidIds.includes('educator') && card.type === 'Technology' && state.indexes.trust < 4) ap += 1;
  if (state.selectedAidIds.includes('engineer') && card.type === 'Technology') ap = Math.max(0, ap - 1);
  return { ap: Math.max(0, ap), pp: Math.max(0, pp) };
}

export function canPlayCard(state: GameState, instanceId: string): { ok: boolean; reason?: string } {
  if (state.phase !== 'play') return { ok: false, reason: 'Game is not in the play phase.' };
  const instance = state.hand.find((card) => card.instanceId === instanceId);
  if (!instance) return { ok: false, reason: 'Card is not in hand.' };
  const card = findDefinition(instance);
  if (card.unplayable) return { ok: false, reason: `${card.name} is a status card.` };
  if (state.policyLockedThisTurn && card.type === 'Policy') return { ok: false, reason: 'Policy is locked this turn.' };
  const cost = getCardCost(state, card);
  if (state.actionPoints < cost.ap) return { ok: false, reason: 'Not enough Action Points.' };
  if (state.policyPoints < cost.pp) return { ok: false, reason: 'Not enough Policy Points.' };
  return { ok: true };
}

export function playCard(input: GameState, instanceId: string): GameState {
  const state = cloneState(input);
  const legal = canPlayCard(state, instanceId);
  if (!legal.ok) {
    state.log = addLog(state, legal.reason ?? 'Illegal play.');
    return state;
  }
  const handIndex = state.hand.findIndex((card) => card.instanceId === instanceId);
  const [instance] = state.hand.splice(handIndex, 1);
  const card = findDefinition(instance);
  const cost = getCardCost(state, card);
  state.actionPoints -= cost.ap;
  state.policyPoints -= cost.pp;
  if (card.type === 'Education') state.educationPlayedThisTurn = true;

  card.effects.forEach((effect) => applyEffect(state, effect));
  if (card.effects.some((effect) => effect.kind === 'preventDamage')) {
    state.crisisAvertedThisTurn = true;
  }
  if (card.keywords?.includes('Cleanse')) {
    const removed = cleanse(state, Number.MAX_SAFE_INTEGER, 'Apathy');
    if (removed > 0) state.log = addLog(state, `Cleansed ${removed} retained Apathy.`);
  }
  if (card.type === 'Environmental Work') {
    state.noEnvironmentalPlayedThisTurn = false;
    state.untreatedDeforestation = false;
  }
  if (card.type === 'Education' && state.selectedAidIds.includes('educator') && !state.educationBonusUsedThisTurn) {
    mutateIndex(state, 'trust', 1);
    state.educationBonusUsedThisTurn = true;
  }
  if (card.type === 'Policy' && state.selectedAidIds.includes('policy-advocate')) state.policyPoints += 1;
  updateCrisisAverted(state);

  if (card.keywords?.includes('Exhaust') || card.keywords?.includes('Ongoing')) state.exhausted.push(instance);
  else state.discard.push(instance);
  state.log = addLog(state, `Played ${card.name}.`);
  checkLoss(state);
  return state;
}

export function endTurn(input: GameState): GameState {
  const state = cloneState(input);
  if (state.phase !== 'play') return state;
  if (state.pendingCrisisDamage > 0) {
    if (state.crisisAvertedThisTurn) {
      state.log = addLog(state, `Averted ${state.pendingCrisisDamage} crisis damage.`);
      state.pendingCrisisDamage = 0;
    } else {
      applyHealth(state, -state.pendingCrisisDamage);
      state.log = addLog(state, `Crisis dealt ${state.pendingCrisisDamage} damage.`);
      state.pendingCrisisDamage = 0;
    }
  }
  const currentCrisis = state.currentCrisisId ? crisisById[state.currentCrisisId] : undefined;
  if (currentCrisis?.pollutionEscalatesIfNoEnvironmental && state.noEnvironmentalPlayedThisTurn) {
    addStatusToDiscard(state, 'Pollution');
    state.log = addLog(state, 'Plastic Waste Surge added another Pollution.');
  }
  if (state.untreatedDeforestation && !state.crisisAvertedThisTurn) {
    const untreatedDamage = currentCrisis?.untreatedDamage ?? 0;
    applyHealth(state, -untreatedDamage);
    state.log = addLog(state, `Untreated deforestation caused ${untreatedDamage} more damage.`);
  } else if (state.untreatedDeforestation) {
    state.log = addLog(state, 'Averted untreated deforestation damage.');
  }
  if (state.indexes.trust <= 3) {
    state.nextTurnDrawPenalty += 1;
    addStatusToDiscard(state, 'Apathy');
    state.log = addLog(state, 'Mass Apathy triggered.');
  }
  if (state.indexes.economy <= 3) {
    state.nextTurnCostPenalty.Technology = (state.nextTurnCostPenalty.Technology ?? 0) + 1;
    state.nextTurnCostPenalty.Policy = (state.nextTurnCostPenalty.Policy ?? 0) + 1;
    state.log = addLog(state, 'Economic Pushback triggered.');
  }
  if (state.indexes.coordination <= 3) {
    state.policyLockedNextTurn = true;
    state.log = addLog(state, 'Policy Paralysis triggered.');
  }
  resolveCascadingIfNeeded(state, state.crisisAvertedThisTurn);
  state.crisisDiscard.push(...(state.currentCrisisId ? [state.currentCrisisId] : []));
  state.currentCrisisId = undefined;
  const retained = state.hand.filter(isRetained);
  const discarded = state.hand.filter((card) => !isRetained(card));
  state.discard.push(...discarded);
  state.hand = retained;
  if (state.planetHealth <= 0) {
    checkLoss(state);
    return state;
  }
  return startTurn(state);
}

export function resolveFinalCrisis(input: GameState): GameState {
  const state = cloneState(input);
  state.phase = 'final';
  let damage = 16;
  if (state.indexes.trust >= 5) damage -= 3;
  if (state.indexes.ecology >= 5) damage -= 4;
  if (state.indexes.economy >= 5) damage -= 3;
  if (state.indexes.coordination >= 5) damage -= 4;
  if (INDEX_KEYS.every((key) => state.indexes[key] >= 5)) damage -= 3;
  if (INDEX_KEYS.some((key) => state.indexes[key] <= 2)) damage += 3;
  if (INDEX_KEYS.filter((key) => state.indexes[key] <= 2).length >= 2) applyHealth(state, -3);
  applyHealth(state, -Math.max(0, damage));

  const stableCount = INDEX_KEYS.filter((key) => state.indexes[key] >= 5).length;
  const vulnerableOrCritical = INDEX_KEYS.filter((key) => state.indexes[key] <= 5).length;
  let rating = 'Collapse';
  if (state.planetHealth > 10 && INDEX_KEYS.every((key) => state.indexes[key] >= 9)) rating = 'Regenerative Future';
  else if (state.planetHealth > 0 && INDEX_KEYS.every((key) => state.indexes[key] >= 5)) rating = 'Resilient Future';
  else if (state.planetHealth > 0 && stableCount >= 2) rating = 'Stabilization';
  else if (state.planetHealth > 0 && vulnerableOrCritical >= 2) rating = 'Survival';
  state.phase = 'gameOver';
  state.finalRating = rating;
  state.finalSummary = `The Cascading Planetary Crisis dealt ${Math.max(0, damage)} final damage.`;
  state.log = addLog(state, `Final rating: ${rating}.`);
  return state;
}

export function getLegalActions(state: GameState): string[] {
  return state.hand.filter((card) => canPlayCard(state, card.instanceId).ok).map((card) => card.instanceId);
}
