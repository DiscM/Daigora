import { useState } from 'react';
import { cardById } from '../game/content';
import { canPlayCard, getCardCost } from '../game/engine';
import type { CardInstance, GameState } from '../game/types';
import { CardFace } from './CardFace';

export function ActionCard({ game, instance, onPlay }: { game: GameState; instance: CardInstance; onPlay: () => void }) {
  const card = cardById[instance.defId];
  const legal = canPlayCard(game, instance.instanceId);
  const cost = getCardCost(game, card);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    if (!legal.ok || isPlaying) return;
    setIsPlaying(true);
    setTimeout(() => {
      onPlay();
    }, 350);
  };

  return (
    <CardFace
      card={card}
      as="button"
      className={isPlaying ? 'is-playing' : ''}
      cost={cost}
      onClick={handlePlay}
      disabled={!legal.ok || isPlaying}
      title={legal.reason ?? ''}
    />
  );
}
