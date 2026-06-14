import { describe, expect, it } from 'vitest';
import { cardById } from './content';
import { canPlayCard, createGame, endTurn, getCardCost, playCard, resolveFinalCrisis, startTurn } from './engine';
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

    const cost = getCardCost(state, cardById['clean-infrastructure-act']);
    const next = playCard(state, 'policy');

    expect(cost).toEqual({ ap: 0, pp: 2 });
    expect(next.indexes.coordination).toBeGreaterThan(state.indexes.coordination);
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

  it('moves from turn ten into final scoring', () => {
    const state = createGame('final-test', ['educator']);
    state.turn = 10;
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
    
    // We bypass normal deck shift by directly calling resolveCrisis
    // which is internal but we can start a new turn where we manipulate the deck
    state.crisisDeck = ['public-burnout'];
    const next = startTurn(state);
    
    expect(next.indexes.coordination).toBe(3); // Lost 2 coordination due to calamity
    expect(next.indexes.trust).toBe(1); // Baseline: -3 Trust (4 -> 1)
  });
});
