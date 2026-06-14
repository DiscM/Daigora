import { Factory } from 'lucide-react';
import { crisisById } from '../game/content';
import type { GameState } from '../game/types';

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
              <li key={sentence}>
                <span className="effect-icon"><Factory size={16} /></span>
                <span>{sentence}</span>
              </li>
            ))}
          </ul>
          {currentCrisis.calamity && <div className="warning-note">{currentCrisis.calamity.text}</div>}
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
