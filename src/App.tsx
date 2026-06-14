import { useEffect, useMemo, useState } from 'react';
import { Menu, Play, RotateCcw, Sparkles } from 'lucide-react';
import { projectAids } from './game/content';
import { createGame, endTurn, playCard } from './game/engine';
import type { GameState } from './game/types';
import { Resource } from './components/Resource';
import { IndexMeter } from './components/IndexMeter';
import { ActionCard } from './components/ActionCard';
import { ActiveProjects } from './components/ActiveProjects';
import { CrisisPanel } from './components/CrisisPanel';
import type { IndexKey } from './game/types';

const SAVE_KEY = 'heal-the-planet-save-v1';
const INDEX_KEYS: IndexKey[] = ['trust', 'ecology', 'economy', 'coordination'];

function loadGame(): GameState {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as GameState;
    } catch {
      localStorage.removeItem(SAVE_KEY);
    }
  }
  return createGame();
}

export function App() {
  const [game, setGame] = useState<GameState>(loadGame);
  const [seed, setSeed] = useState(game.seed);
  const [selectedAidIds, setSelectedAidIds] = useState<string[]>(game.selectedAidIds);

  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  }, [game]);

  const selectedAids = useMemo(() => projectAids.filter((aid) => game.selectedAidIds.includes(aid.id)), [game.selectedAidIds]);

  function startNewGame() {
    const chosen = selectedAidIds.slice(0, 3);
    setGame(createGame(seed.trim() || 'earth-month', chosen.length ? chosen : ['educator', 'disaster-responder']));
  }

  function randomizeSeed() {
    const next = `seed-${Math.floor(Math.random() * 99999)}`;
    setSeed(next);
    setGame(createGame(next, selectedAidIds));
  }

  function toggleAid(id: string) {
    setSelectedAidIds((ids) => {
      if (ids.includes(id)) return ids.filter((item) => item !== id);
      if (ids.length >= 3) return ids;
      return [...ids, id];
    });
  }

  return (
    <main className={`app-shell ${game.phase === 'gameOver' ? 'is-game-over' : ''}`}>
      <section className="planet-stage" aria-label="Planet board">
        <div className="orbit-field" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="stage-callout callout-crisis">Crisis effects</div>
        <div className="stage-callout callout-projects">Project effects</div>
        <div className="stage-callout callout-cards">Card sparks</div>
        <div className="stage-marker marker-crisis">!</div>
        <div className="stage-marker marker-project">+</div>
        <div className="vector-planet" aria-hidden="true">
          <span className="planet-glow" />
          <span className="planet-ocean" />
          <span className="continent continent-a" />
          <span className="continent continent-b" />
          <span className="continent continent-c" />
          <span className="continent continent-d" />
          <span className="damage-zone damage-a" />
          <span className="damage-zone damage-b" />
          <span className="cloud-band cloud-a" />
          <span className="cloud-band cloud-b" />
        </div>
        <div className="aid-row">
          {selectedAids.map((aid) => (
            <div className="aid-token" key={aid.id} title={`${aid.passive} Drawback: ${aid.drawback}`}>
              {aid.name.replace('The ', '')}
            </div>
          ))}
        </div>
        {game.phase === 'gameOver' && (
          <div className="result-card">
            <p className="eyebrow">Final Rating</p>
            <h2>{game.finalRating}</h2>
            <p>{game.finalSummary}</p>
          </div>
        )}
      </section>

      <section className="bottom-console" aria-label="Game controls">
        <section className="panel session-panel">
          <div className="brand">
            <h1>Heal the Planet</h1>
          </div>
          <div className="resource-strip" aria-label="Game resources">
            <Resource label="Turn" value={`${Math.min(game.turn, 10)}/10`} kind="turn" />
            <Resource label="Health" value={`${game.planetHealth}/${game.maxPlanetHealth}`} kind="health" tone={game.planetHealth <= 6 ? 'danger' : 'good'} />
            <Resource label="AP" value={game.actionPoints} kind="ap" />
            <Resource label="PP" value={game.policyPoints} kind="pp" />
          </div>
        </section>

        <CrisisPanel game={game} />

        <section className="hand-row" aria-label="Action hand">
          {game.hand.map((card) => (
            <ActionCard key={card.instanceId} game={game} instance={card} onPlay={() => setGame((state) => playCard(state, card.instanceId))} />
          ))}
        </section>

        <aside className="panel meter-panel">
          <p className="eyebrow">Readiness</p>
          {INDEX_KEYS.map((key) => (
            <IndexMeter key={key} indexKey={key} value={game.indexes[key]} />
          ))}
        </aside>

        <div className="side-actions">
          <ActiveProjects game={game} />
          <div className="quick-actions">
            <details className="header-actions">
              <summary title="Game setup"><Menu size={26} /></summary>
              <div className="setup-popover">
                <label className="seed-control">
                  <span>Seed</span>
                  <input value={seed} onChange={(event) => setSeed(event.target.value)} />
                </label>
                <div className="menu-actions">
                  <button className="tonal-button" onClick={randomizeSeed} title="Start a random seed">
                    <Sparkles size={18} /> Random
                  </button>
                  <button className="icon-button" onClick={startNewGame} title="Restart with current setup">
                    <RotateCcw size={18} />
                  </button>
                  <button className="filled-button" onClick={startNewGame}>
                    <Play size={18} /> New Game
                  </button>
                </div>
                <div className="aid-picker">
                  {projectAids.map((aid) => (
                    <button
                      key={aid.id}
                      className={selectedAidIds.includes(aid.id) ? 'aid-chip selected' : 'aid-chip'}
                      disabled={!selectedAidIds.includes(aid.id) && selectedAidIds.length >= 3}
                      onClick={() => toggleAid(aid.id)}
                      title={`${aid.passive} Drawback: ${aid.drawback}`}
                    >
                      {aid.name.replace('The ', '')}
                    </button>
                  ))}
                </div>
              </div>
            </details>
            <button className="end-turn" onClick={() => setGame((state) => endTurn(state))} disabled={game.phase !== 'play'}>
              End Turn
            </button>
          </div>
        </div>
      </section>

      <section className="log-panel" aria-label="Game log">
        {game.log.slice(0, 5).map((entry, index) => (
          <span key={`${entry.turn}-${index}`}>T{entry.turn}: {entry.text}</span>
        ))}
      </section>
    </main>
  );
}
