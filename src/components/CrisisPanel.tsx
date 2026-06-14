import { Factory } from 'lucide-react';
import { crisisById } from '../game/content';
import type { GameState } from '../game/types';

const STATUS_TOOLTIPS: Record<string, string> = {
  Pollution: 'When drawn, lose 1 AP unless it is cleansed. It stays in hand as dead weight.',
  Misinformation: 'When drawn, Education and Policy cards cost more this turn.',
  Apathy: 'Retain. Cannot be played and stays in hand until a cleanse effect removes it.',
};

export function CrisisPanel({ game }: { game: GameState }) {
  const currentCrisis = game.currentCrisisId ? crisisById[game.currentCrisisId] : undefined;
  return (
    <aside className="panel crisis-panel">
      <p className="panel-ribbon">Current Crisis</p>
      {currentCrisis ? (
        <>
          <div className="crisis-art" aria-hidden="true">
            <span className="crisis-sky" />
            <span className="crisis-sun" />
            <span className="crisis-ground" />
            <span className="crisis-factory factory-a" />
            <span className="crisis-factory factory-b" />
            <span className="crisis-smoke smoke-a" />
            <span className="crisis-smoke smoke-b" />
            <span className="crisis-tree tree-a" />
            <span className="crisis-tree tree-b" />
            <span className="crisis-river" />
          </div>
          <h2>{currentCrisis.name}</h2>
          <ul className="crisis-effects">
            {splitSentences(currentCrisis.text).map((sentence) => (
              <li className={isCrisisSentenceMet(game, sentence) ? 'condition-met' : ''} key={sentence}>
                <span className="effect-icon"><Factory size={16} /></span>
                <span className="effect-copy">{renderStatusTooltips(sentence)}</span>
              </li>
            ))}
          </ul>
          {currentCrisis.calamity && (
            <div className={isCalamityMet(game) ? 'warning-note condition-met' : 'warning-note'}>
              {currentCrisis.calamity.text}
            </div>
          )}
        </>
      ) : (
        <p>No active crisis.</p>
      )}
    </aside>
  );
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=\.)\s+/).map((item) => item.trim()).filter(Boolean);
}

function renderStatusTooltips(text: string) {
  const parts = text.split(/\b(Pollution|Misinformation|Apathy)\b/g);
  return parts.map((part, index) => {
    const tooltip = STATUS_TOOLTIPS[part];
    if (!tooltip) return part;
    return (
      <span className="status-tooltip" tabIndex={0} data-tooltip={tooltip} key={`${part}-${index}`}>
        {part}
      </span>
    );
  });
}

function isCrisisSentenceMet(game: GameState, sentence: string): boolean {
  const lowerSentence = sentence.toLowerCase();
  if (game.crisisAvertedThisTurn && /\b(deal|damage|health)\b/.test(lowerSentence)) return true;
  if (game.currentCrisisId === 'deforestation-surge' && lowerSentence.includes('if untreated') && !game.untreatedDeforestation) return true;
  return false;
}

function isCalamityMet(game: GameState): boolean {
  if (game.currentCrisisId === 'industrial-pollution-corridor') return game.crisisAvertedThisTurn;
  return false;
}
