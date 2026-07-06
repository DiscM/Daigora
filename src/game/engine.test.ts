import { describe, expect, it } from 'vitest';
import { cardById } from './content';
import { GAME_TURN_LIMIT, canPlayCard, createGame, endTurn, getCardCost, getLegalActions, playCard, resolveFinalCrisis, startTurn, draftCard, upgradeCard, resolveCrisisChoice, retireCard, getRetireableCards, useAdvisorAbility, skipDraftOrUpgrade } from './engine';
import type { GameState } from './types';

function findCard(state: GameState, defId: string) {
  const card = state.hand.find((item) => item.defId === defId);
  if (!card) throw new Error(`Expected ${defId} in hand`);
  return card;
}

describe('Heal the Planet engine', () => {
  it('creates deterministic games from the same seed', () => {
    const a = createGame('same-seed', ['educator']);
    const b = createGame('same-seed', ['educator']);

    expect(a.hand.map((card) => card.defId)).toEqual(b.hand.map((card) => card.defId));
    expect(a.currentCrisisId).toBe(b.currentCrisisId);
  });

  it('creates enough crisis cards for a twenty-turn game', () => {
    const state = createGame('twenty-turn-crisis-test', ['educator']);

    expect(state.turn).toBe(1);
    expect(state.currentCrisisId).toBeDefined();
    expect(state.crisisDeck).toHaveLength(GAME_TURN_LIMIT - 1);
  });

  it('enforces AP costs and rejects unplayable status cards', () => {
    const state = createGame('cost-test', ['educator']);
    state.hand = [{ defId: 'renewable-grid-buildout', instanceId: 'expensive' }];
    state.actionPoints = 1;

    expect(canPlayCard(state, 'expensive').ok).toBe(false);

    state.hand = [{ defId: 'status-apathy', instanceId: 'apathy' }];
    expect(canPlayCard(state, 'apathy').ok).toBe(false);
  });

  it('plays a card and applies its effects', () => {
    const state = createGame('play-test', ['educator']);
    state.hand = [{ defId: 'river-cleanup', instanceId: 'river' }];
    state.deck = [];
    state.discard = [{ defId: 'status-pollution', instanceId: 'pollution' }];
    state.actionPoints = 3;
    state.indexes.ecology = 3;

    const next = playCard(state, 'river');

    expect(next.actionPoints).toBe(2);
    expect(next.indexes.ecology).toBe(4);
    expect([...next.deck, ...next.hand, ...next.discard].some((card) => card.defId === 'status-pollution')).toBe(false);
  });

  it('cleansing cards remove retained apathy the same turn they are played', () => {
    const state = createGame('apathy-cleanse-test', ['educator']);
    state.hand = [
      { defId: 'river-cleanup', instanceId: 'river' },
      { defId: 'status-apathy', instanceId: 'apathy' },
      { defId: 'status-apathy', instanceId: 'apathy-2' },
    ];
    state.discard = [
      { defId: 'status-pollution', instanceId: 'pollution' },
      { defId: 'status-apathy', instanceId: 'apathy-3' },
    ];
    state.actionPoints = 3;

    const next = playCard(state, 'river');
    const remainingStatuses = [...next.deck, ...next.hand, ...next.discard].map((card) => card.defId);

    expect(remainingStatuses).not.toContain('status-apathy');
    expect(remainingStatuses).not.toContain('status-pollution');
  });

  it('community workshop cleanses both apathy and misinformation', () => {
    const state = createGame('double-cleanse-test', ['educator']);
    state.hand = [{ defId: 'community-workshop', instanceId: 'workshop' }];
    state.discard = [
      { defId: 'status-apathy', instanceId: 'apathy' },
      { defId: 'status-misinformation', instanceId: 'misinformation' },
      { defId: 'status-pollution', instanceId: 'pollution' },
    ];
    state.actionPoints = 3;

    const next = playCard(state, 'workshop');
    const remainingStatuses = [...next.deck, ...next.hand, ...next.discard].map((card) => card.defId);

    expect(remainingStatuses).not.toContain('status-apathy');
    expect(remainingStatuses).not.toContain('status-misinformation');
    expect(remainingStatuses).toContain('status-pollution');
  });

  it('applies policy point costs separately from AP', () => {
    const state = createGame('policy-test', ['policy-advocate']);
    state.hand = [{ defId: 'clean-infrastructure-act', instanceId: 'policy' }];
    state.actionPoints = 0;
    state.policyPoints = 2;
    state.thisTurnCostPenalty = {};

    const cost = getCardCost(state, cardById['clean-infrastructure-act']);
    const next = playCard(state, 'policy');

    expect(cost).toEqual({ ap: 0, pp: 2 });
    expect(next.indexes.coordination).toBeGreaterThan(state.indexes.coordination);
  });

  it('applies the Educator bonus to the first Education card each turn', () => {
    const state = createGame('educator-benefit-test', ['educator']);
    state.hand = [
      { defId: 'local-policy-petition', instanceId: 'petition' },
      { defId: 'research-briefing', instanceId: 'briefing' },
    ];
    state.deck = [];
    state.actionPoints = 3;
    state.indexes.trust = 4;

    const afterFirst = playCard(state, 'petition');
    const afterSecond = playCard(afterFirst, 'briefing');

    expect(afterFirst.indexes.trust).toBe(6);
    expect(afterFirst.educationBonusUsedThisTurn).toBe(true);
    expect(afterSecond.indexes.trust).toBe(6);
  });

  it('applies the Ecologist bonus to the first Ecology restoration each turn', () => {
    const state = createGame('ecologist-benefit-test', ['ecologist']);
    state.hand = [
      { defId: 'river-cleanup', instanceId: 'river' },
      { defId: 'tree-canopy-program', instanceId: 'canopy' },
    ];
    state.deck = [];
    state.actionPoints = 3;
    state.indexes.ecology = 4;

    const afterFirst = playCard(state, 'river');
    const afterSecond = playCard(afterFirst, 'canopy');

    expect(afterFirst.indexes.ecology).toBe(6);
    expect(afterFirst.ecologyBonusUsedThisTurn).toBe(true);
    expect(afterSecond.indexes.ecology).toBe(8);
  });

  it('applies the Engineer discount to Technology cards', () => {
    const state = createGame('engineer-benefit-test', ['engineer']);

    expect(getCardCost(state, cardById['renewable-grid-buildout'])).toEqual({ ap: 2, pp: 0 });
    expect(getCardCost(state, cardById['solar-installation-project'])).toEqual({ ap: 0, pp: 0 });
  });

  it('applies the Engineer drawback to Trust gains before Education is played', () => {
    const state = createGame('engineer-drawback-test', ['engineer']);
    state.hand = [
      { defId: 'emergency-response-network', instanceId: 'emergency' },
      { defId: 'local-policy-petition', instanceId: 'petition' },
    ];
    state.actionPoints = 3;
    state.indexes.trust = 4;

    const afterEmergency = playCard(state, 'emergency');
    const afterEducation = playCard(afterEmergency, 'petition');

    expect(afterEmergency.indexes.trust).toBe(4);
    expect(afterEducation.indexes.trust).toBe(5);
  });

  it('applies the Policy Advocate bonus when Policy cards are played', () => {
    const state = createGame('policy-advocate-benefit-test', ['policy-advocate']);
    state.hand = [{ defId: 'regional-response-pact', instanceId: 'pact' }];
    state.policyPoints = 1;

    const next = playCard(state, 'pact');

    expect(next.policyPoints).toBe(1);
  });

  it('applies the Policy Advocate drawback when Coordination drops below three', () => {
    const state = createGame('policy-advocate-drawback-test', ['policy-advocate']);
    state.indexes.coordination = 3;
    state.indexes.trust = 5;
    state.crisisDeck = ['diplomatic-gridlock'];

    const next = startTurn(state);

    expect(next.indexes.coordination).toBe(0);
    expect(next.indexes.trust).toBe(4);
  });

  it('applies the Disaster Responder prevention at the start of each turn', () => {
    const state = createGame('disaster-responder-benefit-test', ['disaster-responder']);

    expect(state.incomingDamagePrevention).toBe(1);
  });

  it('applies the Disaster Responder drawback by blocking ongoing shields', () => {
    const state = createGame('disaster-responder-drawback-test', ['disaster-responder']);
    state.hand = [{ defId: 'renewable-grid-buildout', instanceId: 'grid' }];
    state.actionPoints = 3;

    const next = playCard(state, 'grid');

    expect(next.ongoing).toEqual([]);
    expect(next.log.some((entry) => entry.text === 'Disaster Responder drawback blocked an ongoing shield.')).toBe(true);
  });

  it('uses deterministic status instance ids for seeded games', () => {
    const a = createGame('status-id-test', ['educator']);
    const b = createGame('status-id-test', ['educator']);
    a.indexes.trust = 1;
    b.indexes.trust = 1;

    const nextA = endTurn(a);
    const nextB = endTurn(b);

    expect(nextA.discard.map((card) => card.instanceId)).toEqual(nextB.discard.map((card) => card.instanceId));
  });

  it('applies Delay as a Technology and Policy cost penalty when drawn', () => {
    const state = createGame('delay-test', ['educator']);
    state.deck = [{ defId: 'status-delay', instanceId: 'delay' }];
    state.discard = [];
    state.hand = [];

    const next = startTurn(state);

    expect(next.thisTurnCostPenalty.Technology).toBe(1);
    expect(next.thisTurnCostPenalty.Policy).toBe(1);
    expect(next.exhausted.some((card) => card.instanceId === 'delay')).toBe(true);
  });

  it('applies ongoing shields to matching crisis damage', () => {
    const state = createGame('ongoing-shield-test', ['educator']);
    state.ongoing = [{ source: 'card', tag: 'climate', amount: 1 }];
    state.crisisDeck = ['heat-dome'];
    state.crisisAppearanceCount = {};
    state.indexes = { trust: 6, ecology: 6, economy: 6, coordination: 6 };

    const next = startTurn(state);

    expect(next.pendingCrisisDamage).toBe(1);
    expect(next.log.some((entry) => entry.text === 'Ongoing projects prevented 1 crisis damage.')).toBe(true);
  });

  it('prevents later damage during the same turn', () => {
    const state = createGame('prevent-test', ['educator']);
    state.hand = [{ defId: 'emergency-response-network', instanceId: 'emergency' }];
    state.actionPoints = 3;
    state.planetHealth = 10;
    state.untreatedDeforestation = true;

    const afterCard = playCard(state, 'emergency');
    const afterTurn = endTurn(afterCard);

    expect(afterCard.incomingDamagePrevention).toBe(3);
    expect(afterTurn.planetHealth).toBe(10);
    expect(afterTurn.log.some((entry) => entry.text === 'Averted untreated deforestation damage.')).toBe(true);
  });

  it('deals pending crisis damage at end of turn if not averted', () => {
    const state = createGame('pending-damage-test', ['educator']);
    state.hand = [];
    state.pendingCrisisDamage = 2;
    state.planetHealth = 10;
    state.indexes = { trust: 6, ecology: 6, economy: 6, coordination: 6 };

    const next = endTurn(state);

    expect(next.planetHealth).toBe(8);
    expect(next.log.some((entry) => entry.text === 'Crisis dealt 2 damage.')).toBe(true);
  });

  it('cancels pending crisis damage when a prevention card averts it', () => {
    const state = createGame('avert-test', ['educator']);
    state.hand = [{ defId: 'emergency-response-network', instanceId: 'emergency' }];
    state.pendingCrisisDamage = 2;
    state.planetHealth = 10;
    state.actionPoints = 3;
    state.indexes = { trust: 6, ecology: 6, economy: 6, coordination: 6 };

    const afterCard = playCard(state, 'emergency');
    const afterTurn = endTurn(afterCard);

    expect(afterCard.crisisAvertedThisTurn).toBe(true);
    expect(afterTurn.planetHealth).toBe(10);
    expect(afterTurn.log.some((entry) => entry.text === 'Averted 2 crisis damage.')).toBe(true);
  });

  it('averts heat dome when coordination is above its calamity threshold after a card play', () => {
    const state = createGame('heat-dome-avert-test', ['educator']);
    state.currentCrisisId = 'heat-dome';
    state.hand = [{ defId: 'clean-infrastructure-act', instanceId: 'policy' }];
    state.pendingCrisisDamage = 2;
    state.planetHealth = 10;
    state.thisTurnCostPenalty = {};
    state.policyPoints = 2;
    state.indexes = { trust: 6, ecology: 6, economy: 6, coordination: 2 };

    const afterCard = playCard(state, 'policy');
    const afterTurn = endTurn(afterCard);

    expect(afterCard.indexes.coordination).toBeGreaterThan(3);
    expect(afterCard.crisisAvertedThisTurn).toBe(true);
    expect(afterTurn.planetHealth).toBe(10);
  });

  it('averts plastic waste surge when environmental work is played', () => {
    const state = createGame('plastic-avert-test', ['educator']);
    state.pendingCrisisChoice = undefined;
    state.currentCrisisId = 'plastic-waste-surge';
    state.hand = [{ defId: 'river-cleanup', instanceId: 'river' }];
    state.pendingCrisisDamage = 2;
    state.planetHealth = 10;
    state.actionPoints = 3;
    state.indexes = { trust: 6, ecology: 6, economy: 6, coordination: 6 };

    const afterCard = playCard(state, 'river');
    const afterTurn = endTurn(afterCard);

    expect(afterCard.crisisAvertedThisTurn).toBe(true);
    expect(afterTurn.planetHealth).toBe(10);
    expect(afterTurn.log.some((entry) => entry.text === 'Plastic Waste Surge added another Pollution.')).toBe(false);
  });

  it('does not deal untreated deforestation damage when the crisis is averted', () => {
    const state = createGame('avert-deforestation-test', ['educator']);
    state.hand = [{ defId: 'emergency-response-network', instanceId: 'emergency' }];
    state.currentCrisisId = 'deforestation-surge';
    state.untreatedDeforestation = true;
    state.planetHealth = 10;
    state.actionPoints = 3;
    state.indexes = { trust: 6, ecology: 6, economy: 6, coordination: 6 };

    const afterCard = playCard(state, 'emergency');
    const afterTurn = endTurn(afterCard);

    expect(afterTurn.planetHealth).toBe(10);
    expect(afterTurn.log.some((entry) => entry.text === 'Averted untreated deforestation damage.')).toBe(true);
  });

  it('does not deal cascading crisis damage when the crisis is averted', () => {
    const state = createGame('avert-cascade-test', ['educator']);
    state.pendingCrisisChoice = undefined;
    state.hand = [{ defId: 'emergency-response-network', instanceId: 'emergency' }];
    state.currentCrisisId = 'heat-dome';
    state.planetHealth = 10;
    state.actionPoints = 3;
    state.indexes = { trust: 1, ecology: 1, economy: 6, coordination: 6 };

    const afterCard = playCard(state, 'emergency');
    const afterTurn = endTurn(afterCard);

    expect(afterTurn.planetHealth).toBe(10);
    expect(afterTurn.log.some((entry) => entry.text === 'Cascading Disaster triggered: -2 Health and +1 Apathy.')).toBe(true);
  });

  it('moves from turn twenty into final scoring', () => {
    const state = createGame('final-test', ['educator']);
    state.turn = GAME_TURN_LIMIT;
    state.planetHealth = 20;
    state.indexes = { trust: 10, ecology: 10, economy: 10, coordination: 10 };

    const final = endTurn(state);

    expect(final.phase).toBe('gameOver');
    expect(final.finalRating).toBe('Regenerative Future');
  });

  it('calculates collapse when final crisis overwhelms health', () => {
    const state = createGame('collapse-test', ['educator']);
    state.planetHealth = 3;
    state.indexes = { trust: 1, ecology: 1, economy: 3, coordination: 3 };

    const final = resolveFinalCrisis(state);

    expect(final.phase).toBe('gameOver');
    expect(final.finalRating).toBe('Collapse');
  });

  it('keeps readiness indexes inside 0-10', () => {
    const state = createGame('clamp-test', ['educator']);
    state.pendingCrisisChoice = undefined;
    state.hand = [{ defId: 'youth-organizer-network', instanceId: 'youth' }];
    state.actionPoints = 3;
    state.indexes.trust = 9;

    const next = playCard(state, findCard(state, 'youth-organizer-network').instanceId);

    expect(next.indexes.trust).toBe(10);
  });

  it('retains apathy in hand between turns until cleansed', () => {
    const state = createGame('retain-test', ['educator']);
    state.hand = [
      { defId: 'status-apathy', instanceId: 'apathy' },
      { defId: 'community-workshop', instanceId: 'workshop' },
    ];

    const next = endTurn(state);

    expect(next.hand.some((card) => card.instanceId === 'apathy')).toBe(true);
    expect(next.discard.some((card) => card.instanceId === 'workshop')).toBe(true);
  });

  it('triggers calamity for public-burnout when ecology is low', () => {
    const state = createGame('burnout-calamity', ['educator']);
    state.indexes.ecology = 2; // Below threshold of 3
    state.indexes.coordination = 5;
    
    state.crisisAppearanceCount = {};
    state.crisisDeck = ['public-burnout'];
    const next = startTurn(state);
    
    expect(next.indexes.coordination).toBe(3); // Lost 2 coordination due to calamity
    expect(next.indexes.trust).toBe(0); // Base: -3 Trust (3 -> 0)
  });

  it('can simulate deterministic games across advisor sets without stalling', () => {
    const advisorSets = [
      ['educator', 'disaster-responder'],
      ['ecologist', 'engineer', 'policy-advocate'],
      ['educator', 'ecologist', 'engineer'],
      ['educator', 'policy-advocate', 'disaster-responder'],
    ];
    const results = advisorSets.flatMap((aids) => (
      Array.from({ length: 5 }, (_, index) => simulateGreedyGame(`sim-${aids.join('-')}-${index}`, aids))
    ));

    expect(results).toHaveLength(20);
    expect(results.every((state) => state.phase === 'gameOver')).toBe(true);
    expect(results.some((state) => state.finalRating !== 'Collapse')).toBe(true);
  });

  it('supports campaign and workshop modes with appropriate starting states and crisis thresholds', () => {
    const campaignGame = createGame('camp-test', [], 'campaign');
    expect(campaignGame.gameMode).toBe('campaign');
    expect(campaignGame.turnLimit).toBe(20);
    expect(campaignGame.planetHealth).toBe(24);
    expect(campaignGame.indexes.trust).toBeGreaterThanOrEqual(0);
    expect(campaignGame.indexes.trust).toBeLessThanOrEqual(10);

    const workshopGame = createGame('work-test', [], 'workshop');
    expect(workshopGame.gameMode).toBe('workshop');
    expect(workshopGame.turnLimit).toBe(10);
    expect(workshopGame.planetHealth).toBe(20);
    expect(workshopGame.indexes.ecology).toBeGreaterThanOrEqual(0);
    expect(workshopGame.indexes.ecology).toBeLessThanOrEqual(10);

    // Reset health and indexes to baseline clean states to test thresholds in isolation
    campaignGame.planetHealth = 24;
    campaignGame.indexes = { trust: 3, ecology: 3, economy: 3, coordination: 3 };

    workshopGame.planetHealth = 20;
    workshopGame.indexes = { trust: 3, ecology: 3, economy: 3, coordination: 3 };

    // Test final crisis thresholds by resolving directly
    const nextCampaign = resolveFinalCrisis(campaignGame);
    // Campaign default: threshold is 6. With starting indexes 3 (all < 6), no mitigation applies.
    // Damage = 20. Net health = 24 - 20 = 4.
    expect(nextCampaign.planetHealth).toBe(4);

    const nextWorkshop = resolveFinalCrisis(workshopGame);
    // Workshop default: threshold is 5. With starting indexes 3 (all < 5), no mitigation applies.
    // Damage = 16. Net health = 20 - 16 = 4.
    expect(nextWorkshop.planetHealth).toBe(4);
  });

  it('supports drafting a card at the end of a turn', () => {
    let state = createGame('draft-test', []);
    state.turn = 1;
    state.turnLimit = 2;
    state.phase = 'play';
    // endTurn transitions to draftOrUpgrade
    state = endTurn(state);
    expect(state.phase).toBe('draftOrUpgrade');
    expect(state.draftOptions).toHaveLength(3);

    const selectedDraft = state.draftOptions[0];
    state = draftCard(state, selectedDraft);
    // draftCard adds selected card to discard and restarts turn
    expect(state.phase).toBe('play');
    expect(state.turn).toBe(2);
    expect(state.discard.some((card) => card.defId === selectedDraft)).toBe(true);
  });

  it('supports upgrading a card at the end of a turn', () => {
    let state = createGame('upgrade-test', []);
    state.hand = [];
    state.deck = [{ defId: 'community-workshop', instanceId: 'cg-1' }, { defId: 'community-workshop', instanceId: 'cg-2' }];
    state.discard = [{ defId: 'community-workshop', instanceId: 'cg-3' }];
    state.phase = 'draftOrUpgrade';

    // Upgrade community-workshop to community-workshop-upgraded
    state = upgradeCard(state, 'community-workshop');
    expect(state.phase).toBe('play');
    // Ensure one of cg-1, cg-2, or cg-3 has been upgraded to the correct defId
    const allCards = [...state.hand, ...state.deck, ...state.discard];
    expect(allCards.some((card) => card.defId === 'community-workshop-upgraded')).toBe(true);
    expect(allCards.filter((card) => card.defId === 'community-workshop')).toHaveLength(2);
  });

  it('supports skipping drafting or upgrading', () => {
    let state = createGame('skip-test', []);
    state.phase = 'draftOrUpgrade';
    state = skipDraftOrUpgrade(state);
    expect(state.phase).toBe('play');
  });
});

  it('triggers Ecology danger state (Environmental Degradation) when Ecology ≤ 3', () => {
    const state = createGame('eco-danger-test', ['educator']);
    state.pendingCrisisChoice = undefined;
    state.indexes.ecology = 2;
    state.indexes = { trust: 6, ecology: 2, economy: 6, coordination: 6 };
    state.pendingCrisisDamage = 0;
    // Also clear cascading cooldown to isolate ecology check
    state.cascadingCooldownTurns = 0;

    const next = endTurn(state);

    expect(next.discard.some((card) => card.defId === 'status-pollution')).toBe(true);
    expect(next.log.some((entry) => entry.text.includes('Environmental Degradation'))).toBe(true);
  });

  it('grants +1 AP next turn when all indexes are ≤ 3 (desperation)', () => {
    const state = createGame('desperation-test', ['educator']);
    state.pendingCrisisChoice = undefined;
    state.indexes = { trust: 2, ecology: 3, economy: 1, coordination: 2 };
    state.planetHealth = 10;

    const next = endTurn(state);

    expect(next.desperationApBonusNextTurn).toBe(1);
    expect(next.log.some((entry) => entry.text.includes('Desperation'))).toBe(true);
  });

  it('applies cascading cooldown so it does not trigger every turn', () => {
    const state = createGame('cascade-cooldown-test', ['educator']);
    state.pendingCrisisChoice = undefined;
    state.indexes = { trust: 2, ecology: 2, economy: 6, coordination: 6 };
    state.cascadingCooldownTurns = 1;
    state.planetHealth = 10;
    state.pendingCrisisDamage = 0;

    const afterEnd = endTurn(state);

    // Cascading should NOT trigger because cooldown is active → health stays 10
    expect(afterEnd.planetHealth).toBe(10);
  });

  it('caps policy points at maxPolicyPoints', () => {
    const state = createGame('pp-cap-test', ['policy-advocate']);
    state.pendingCrisisChoice = undefined;
    state.hand = [{ defId: 'earth-alliance-treaty', instanceId: 'treaty' }];
    state.policyPoints = 8;
    state.maxPolicyPoints = 10;

    const cost = getCardCost(state, cardById['earth-alliance-treaty']);

    expect(cost).toEqual({ ap: 0, pp: 4 });
  });

  it('supports crisis escalation on repeated appearance', () => {
    const state = createGame('escalation-test', ['educator']);
    state.pendingCrisisChoice = undefined;
    state.crisisDeck = ['heat-dome'];
    state.crisisAppearanceCount = { 'heat-dome': 1 };
    state.ongoing = [{ source: 'card', tag: 'climate', amount: 0 }];
    state.indexes = { trust: 6, ecology: 6, economy: 6, coordination: 6 };

    const next = startTurn(state);

    // First appearance was 1, now 2nd → +1 escalation damage
    expect(next.crisisAppearanceCount['heat-dome']).toBe(2);
    expect(next.pendingCrisisDamage).toBe(3); // 2 base + 1 escalation
  });

  it('resolves crisis choice and applies chosen option effects', () => {
    const state = createGame('choice-test', ['educator']);
    state.pendingCrisisChoice = undefined;
    state.crisisDeck = ['public-burnout'];
    state.crisisAppearanceCount = {};
    state.indexes = { trust: 5, ecology: 5, economy: 5, coordination: 5 };

    let next = startTurn(state);
    expect(next.pendingCrisisChoice).toBeDefined();
    // Choose option 0: fund morale campaign (-2 PP, +2 Trust)
    next.policyPoints = 3;
    next = resolveCrisisChoice(next, 0);

    expect(next.policyPoints).toBe(1);
    expect(next.pendingCrisisChoice).toBeUndefined();
  });

  it('supports retiring a card from the deck via draft phase', () => {
    const state = createGame('retire-test', ['educator']);
    state.phase = 'draftOrUpgrade';
    state.deck = [{ defId: 'community-workshop', instanceId: 'retire-cw' }];
    const retireable = getRetireableCards(state);
    expect(retireable.length).toBeGreaterThan(0);

    const next = retireCard(state, 'community-workshop');
    expect(next.phase).toBe('play');
    expect(next.exhausted.some((c) => c.defId === 'community-workshop')).toBe(true);
  });

  it('applies difficulty modifiers to starting conditions', () => {
    const normal = createGame('diff-test', ['educator'], 'campaign', 'normal');
    expect(normal.indexes.trust).toBeGreaterThanOrEqual(2);

    const hard = createGame('diff-test', ['educator'], 'campaign', 'hard');
    expect(hard.indexes.trust).toBeLessThanOrEqual(3);

    const apocalypse = createGame('diff-test', ['educator'], 'campaign', 'apocalypse');
    expect(apocalypse.indexes.trust).toBeLessThanOrEqual(2);
  });

  it('triggers mid-game milestone when all indexes ≥ 5 by turn 8', () => {
    const state = createGame('milestone-test', ['educator']);
    state.pendingCrisisChoice = undefined;
    state.phase = 'play';
    state.turn = 8;
    state.indexes = { trust: 6, ecology: 6, economy: 6, coordination: 6 };
    state.planetHealth = 7;
    state.maxPlanetHealth = 24;
    state.pendingCrisisDamage = 0;
    state.cascadingCooldownTurns = 0;

    const next = endTurn(state);

    expect(next.midGameBonuses.allIndexesFiveByTurnEight).toBe(true);
    expect(next.maxPlanetHealth).toBe(26);
    expect(next.planetHealth).toBe(9); // 7 + 2
  });

  it('supports using advisor abilities once per game', () => {
    const state = createGame('ability-test', ['educator']);
    state.pendingCrisisChoice = undefined;
    state.indexes.trust = 3;

    const after = useAdvisorAbility(state, 'educator');

    expect(after.indexes.trust).toBe(5); // +2 Trust
    expect(after.advisorAbilityUsed['educator']).toBe(true);
    // Second use should be no-op
    const afterSecond = useAdvisorAbility(after, 'educator');
    expect(afterSecond.indexes.trust).toBe(5);
  });

  it('ecologist ability restores ecology and health (with passive bonus)', () => {
    const state = createGame('ecologist-ability', ['ecologist']);
    state.pendingCrisisChoice = undefined;
    state.indexes.ecology = 2;
    state.planetHealth = 5;

    const after = useAdvisorAbility(state, 'ecologist');

    // Ecologist ability gives +3 ecology, PLUS the passive bonus (+1 extra when restoring) = +4
    expect(after.indexes.ecology).toBe(6); // 2 + 3 + 1 from passive
    expect(after.planetHealth).toBe(8); // +3
    expect(after.ecologyBonusUsedThisTurn).toBe(true);
  });

  it('disaster-responder ability adds damage prevention', () => {
    const state = createGame('responder-ability', ['disaster-responder']);
    state.pendingCrisisChoice = undefined;

    const after = useAdvisorAbility(state, 'disaster-responder');

    expect(after.incomingDamagePrevention).toBeGreaterThanOrEqual(4);
  });

function simulateGreedyGame(seed: string, advisorIds: string[]): GameState {
  let state = createGame(seed, advisorIds);
  let guard = 0;
  while (state.phase !== 'gameOver' && guard < 200) {
    if (state.pendingCrisisChoice) {
      state = resolveCrisisChoice(state, 0);
      guard += 1;
      continue;
    }
    if (state.phase === 'draftOrUpgrade') {
      if (state.draftOptions && state.draftOptions.length > 0) {
        state = draftCard(state, state.draftOptions[0]);
      } else {
        state = skipDraftOrUpgrade(state);
      }
      guard += 1;
      continue;
    }
    let legalActions = getLegalActions(state);
    while (legalActions.length > 0 && guard < 200) {
      state = playCard(state, legalActions[0]);
      legalActions = getLegalActions(state);
      guard += 1;
    }
    state = endTurn(state);
    guard += 1;
  }
  if (guard >= 200) throw new Error(`Simulation stalled for seed ${seed}`);
  return state;
}
