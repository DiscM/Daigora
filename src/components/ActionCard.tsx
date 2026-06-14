import { cardById } from '../game/content';
import { canPlayCard, getCardCost } from '../game/engine';
import type { CardInstance, GameState } from '../game/types';

export function ActionCard({ game, instance, onPlay }: { game: GameState; instance: CardInstance; onPlay: () => void }) {
  const card = cardById[instance.defId];
  const legal = canPlayCard(game, instance.instanceId);
  const cost = getCardCost(game, card);
  const costKind = cost.pp > 0 ? 'pp' : 'ap';
  return (
    <button className={`action-card ${card.type.toLowerCase().replaceAll(' ', '-')}`} onClick={onPlay} disabled={!legal.ok} title={legal.reason ?? ''}>
      <span className="card-head">
        <span className={`card-cost ${costKind}`}>{cost.ap || cost.pp}</span>
        <strong>{card.name}</strong>
      </span>
      <span className={`card-art ${card.type.toLowerCase().replaceAll(' ', '-')}`} aria-hidden="true" />
      <p>{card.text}</p>
    </button>
  );
}
