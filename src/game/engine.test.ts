import { describe, expect, it } from 'vitest';
import { cardById } from './content';
import { canPlayCard, createGame, endTurn, getCardCost, playCard, resolveFinalCrisis } from './engine';
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
});
