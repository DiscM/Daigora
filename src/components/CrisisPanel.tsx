import { Factory } from 'lucide-react';
import { crisisById } from '../game/content';
import { isCrisisLogEntry } from '../game/log';
import type { GameState } from '../game/types';

const STATUS_TOOLTIPS: Record<string, string> = {
  Pollution: 'When drawn, lose 1 AP unless it is cleansed. It stays in hand as dead weight.',
  Misinformation: 'When drawn, Education and Policy cards cost more this turn.',
  Apathy: 'Retain. Cannot be played and stays in hand until a cleanse effect removes it.',
  Backlash: 'When drawn, lose 1 Trust, then exhaust it from the deck.',
};

export function CrisisPanel({ game }: { game: GameState }) {
  const currentCrisis = game.currentCrisisId ? crisisById[game.currentCrisisId] : undefined;
  const crisisUpdates = game.log.filter((entry) => entry.turn === game.turn && isCrisisLogEntry(entry) && shouldShowCrisisUpdate(entry.text)).slice(0, 3).reverse();
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
          {crisisUpdates.length > 0 ? (
            <ul className="crisis-updates" aria-label="Crisis updates">
              {crisisUpdates.map((entry, index) => (
                <li key={`${entry.turn}-${index}`}>{entry.text}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p>No active crisis.</p>
      )}
    </aside>
  );
}

function shouldShowCrisisUpdate(text: string): boolean {
  return !text.startsWith('Crisis revealed:') && !text.includes('Cascading Disaster');
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=\.)\s+/).map((item) => item.trim()).filter(Boolean);
}

function renderStatusTooltips(text: string) {
  const parts = text.split(/\b(Pollution|Misinformation|Apathy|Backlash)\b/g);
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
  const crisis = game.currentCrisisId ? crisisById[game.currentCrisisId] : undefined;
  if (game.crisisAvertedThisTurn && /\b(deal|damage|health)\b/.test(lowerSentence)) return true;
  if (crisis?.untreatedDamage && lowerSentence.includes('if untreated') && !game.untreatedDeforestation) return true;
  return false;
}
