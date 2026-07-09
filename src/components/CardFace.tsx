import { cardById } from '../game/content';
import type { CardDefinition } from '../game/types';

type CardFaceElement = 'button' | 'div';

interface CardFaceProps {
  card: CardDefinition;
  ariaLabel?: string;
  as?: CardFaceElement;
  className?: string;
  cost?: { ap: number; pp: number };
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
}

export function getCardTypeClass(card: CardDefinition) {
  return card.type.toLowerCase().replaceAll(' ', '-');
}

export function CardFace({ card, ariaLabel, as = 'div', className, cost, disabled, onClick, title }: CardFaceProps) {
  const typeClass = getCardTypeClass(card);
  const isUpgraded = card.id.endsWith('-upgraded');
  const displayName = card.name.endsWith('+') ? card.name.slice(0, -1) : card.name;
  const cardCost = cost ?? { ap: card.costAp ?? 0, pp: card.costPp ?? 0 };
  const classes = ['action-card', typeClass, isUpgraded ? 'is-upgraded' : '', className ?? ''].filter(Boolean).join(' ');

  const content = (
    <>
      <span className="card-head">
        <span className="card-costs">
          {cardCost.ap > 0 || cardCost.pp === 0 ? <span className="card-cost ap">{cardCost.ap}</span> : null}
          {cardCost.pp > 0 ? <span className="card-cost pp">{cardCost.pp}</span> : null}
        </span>
        <strong>
          {displayName}
          {isUpgraded && <span className="upgraded-badge">+</span>}
        </strong>
      </span>
      <span className={`card-art ${typeClass}`} aria-hidden="true" />
      <p>{card.text}</p>
    </>
  );

  if (as === 'button') {
    return (
      <button aria-label={ariaLabel} className={classes} onClick={onClick} disabled={disabled} title={title} type="button">
        {content}
      </button>
    );
  }

  return <div aria-label={ariaLabel} className={classes} title={title}>{content}</div>;
}

export function StaticCard({ defId, ariaLabel, onClick, className, title }: { defId: string; ariaLabel?: string; onClick?: () => void; className?: string; title?: string }) {
  const card = cardById[defId];
  if (!card) return null;

  return <CardFace card={card} ariaLabel={ariaLabel} as={onClick ? 'button' : 'div'} className={className} onClick={onClick} title={title} />;
}
