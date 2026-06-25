import { useState } from 'react';
import { cardById } from '../game/content';
import { canPlayCard, getCardCost } from '../game/engine';
import type { CardInstance, GameState } from '../game/types';

export function ActionCard({ game, instance, onPlay }: { game: GameState; instance: CardInstance; onPlay: () => void }) {
  const card = cardById[instance.defId];
  const legal = canPlayCard(game, instance.instanceId);
  const cost = getCardCost(game, card);
  const typeClass = card.type.toLowerCase().replaceAll(' ', '-');
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    if (!legal.ok || isPlaying) return;
    setIsPlaying(true);
    setTimeout(() => {
      onPlay();
    }, 350);
  };

  const isUpgraded = instance.defId.endsWith('-upgraded');
  const displayName = card.name.endsWith('+') ? card.name.slice(0, -1) : card.name;

  return (
    <button
      className={`action-card ${typeClass} ${isUpgraded ? 'is-upgraded' : ''} ${isPlaying ? 'is-playing' : ''}`}
      onClick={handlePlay}
      disabled={!legal.ok || isPlaying}
      title={legal.reason ?? ''}
    >
      <span className="card-head">
        <span className="card-costs">
          {cost.ap > 0 || cost.pp === 0 ? <span className="card-cost ap">{cost.ap}</span> : null}
          {cost.pp > 0 ? <span className="card-cost pp">{cost.pp}</span> : null}
        </span>
        <strong>
          {displayName}
          {isUpgraded && <span className="upgraded-badge">+</span>}
        </strong>
      </span>
      <span className={`card-art ${typeClass}`} aria-hidden="true" />
      <p>{card.text}</p>
    </button>
  );
}
