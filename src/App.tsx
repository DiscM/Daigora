import { useEffect, useMemo, useState } from 'react';
import { Leaf, Play, RotateCcw, Sparkles } from 'lucide-react';
import { cardById, crisisById, projectAids } from './game/content';
import { canPlayCard, createGame, endTurn, getCardCost, playCard } from './game/engine';
import type { CardInstance, GameState, IndexKey } from './game/types';

const SAVE_KEY = 'heal-the-planet-save-v1';
const indexLabels: Record<IndexKey, string> = {
  trust: 'Trust',
  ecology: 'Ecology',
  economy: 'Economy',
  coordination: 'Coordination',
};

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

  const currentCrisis = game.currentCrisisId ? crisisById[game.currentCrisisId] : undefined;
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
    <main className="app-shell">
      <header className="top-bar">
        <div className="brand">
          <span className="brand-mark"><Leaf size={22} /></span>
          <div>
            <h1>Heal the Planet</h1>
            <p>Local council session</p>
          </div>
        </div>
        <div className="resource-strip" aria-label="Game resources">
          <Resource label="Turn" value={`${Math.min(game.turn, 10)} / 10`} />
          <Resource label="Planet Health" value={`${game.planetHealth} / ${game.maxPlanetHealth}`} tone={game.planetHealth <= 6 ? 'danger' : 'good'} />
          <Resource label="AP" value={game.actionPoints} />
          <Resource label="PP" value={game.policyPoints} />
        </div>
        <div className="header-actions">
          <button className="tonal-button" onClick={randomizeSeed} title="Start a random seed">
            <Sparkles size={18} /> Random
          </button>
          <button className="icon-button" onClick={startNewGame} title="Restart with current setup">
            <RotateCcw size={18} />
          </button>
        </div>
      </header>

      <section className="setup-band" aria-label="Session setup">
        <label>
          Seed
          <input value={seed} onChange={(event) => setSeed(event.target.value)} />
        </label>
        <div className="aid-picker">
          {projectAids.map((aid) => (
            <button
              key={aid.id}
              className={selectedAidIds.includes(aid.id) ? 'aid-chip selected' : 'aid-chip'}
              onClick={() => toggleAid(aid.id)}
              title={`${aid.passive} Drawback: ${aid.drawback}`}
            >
              {aid.name.replace('The ', '')}
            </button>
          ))}
        </div>
        <button className="filled-button" onClick={startNewGame}>
          <Play size={18} /> New Game
        </button>
      </section>

      <section className="game-layout">
        <aside className="panel crisis-panel">
          <p className="eyebrow">Current Crisis</p>
          {currentCrisis ? (
            <>
              <h2>{currentCrisis.name}</h2>
              <p>{currentCrisis.text}</p>
              {currentCrisis.calamity && <div className="warning-note">{currentCrisis.calamity.text}</div>}
            </>
          ) : (
            <p>No active crisis.</p>
          )}
          <div className="pile-grid">
            <MiniStat label="Deck" value={game.deck.length} />
            <MiniStat label="Discard" value={game.discard.length} />
            <MiniStat label="Exhaust" value={game.exhausted.length} />
            <MiniStat label="Crisis" value={game.crisisDeck.length} />
          </div>
        </aside>

        <section className="planet-stage" aria-label="Planet board">
          <div className="stars" />
          <Planet health={game.planetHealth} max={game.maxPlanetHealth} indexes={game.indexes} />
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

        <aside className="panel meter-panel">
          <p className="eyebrow">Readiness</p>
          {(Object.keys(indexLabels) as IndexKey[]).map((key) => (
            <IndexMeter key={key} label={indexLabels[key]} value={game.indexes[key]} />
          ))}
          <div className="status-strip">
            <MiniStat label="Pollution" value={countStatus(game, 'status-pollution')} />
            <MiniStat label="Apathy" value={countStatus(game, 'status-apathy')} />
            <MiniStat label="Delay" value={countStatus(game, 'status-delay')} />
            <MiniStat label="Misinformation" value={countStatus(game, 'status-misinformation')} />
          </div>
        </aside>
      </section>

      <section className="hand-row" aria-label="Action hand">
        {game.hand.map((card) => (
          <ActionCard key={card.instanceId} game={game} instance={card} onPlay={() => setGame((state) => playCard(state, card.instanceId))} />
        ))}
        <button className="end-turn" onClick={() => setGame((state) => endTurn(state))} disabled={game.phase !== 'play'}>
          End Turn
        </button>
      </section>

      <section className="log-panel" aria-label="Game log">
        {game.log.slice(0, 5).map((entry, index) => (
          <span key={`${entry.turn}-${index}`}>T{entry.turn}: {entry.text}</span>
        ))}
      </section>
    </main>
  );
}

function Resource({ label, value, tone }: { label: string; value: string | number; tone?: 'good' | 'danger' }) {
  return (
    <div className={`resource ${tone ?? ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="mini-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function IndexMeter({ label, value }: { label: string; value: number }) {
  return (
    <div className="index-meter">
      <div className="meter-label">
        <span>{label}</span>
        <strong>{value}/10</strong>
      </div>
      <div className="meter-track">
        <div style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  );
}

function Planet({ health, max, indexes }: { health: number; max: number; indexes: Record<IndexKey, number> }) {
  const healthRatio = health / max;
  const average = (indexes.trust + indexes.ecology + indexes.economy + indexes.coordination) / 40;
  return (
    <div className="planet-wrap" style={{ '--planet-health': healthRatio, '--planet-vitality': average } as React.CSSProperties}>
      <svg viewBox="0 0 420 420" role="img" aria-label="Floating planet in space">
        <defs>
          <radialGradient id="ocean" cx="38%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#9dd9ff" />
            <stop offset="55%" stopColor="#3f8fcf" />
            <stop offset="100%" stopColor="#1f5f99" />
          </radialGradient>
        </defs>
        <circle className="planet-glow" cx="210" cy="210" r="178" />
        <circle cx="210" cy="210" r="142" fill="url(#ocean)" />
        <path className="land land-one" d="M132 140c28-34 84-33 104-7 18 24-14 46-4 76 8 25 44 23 47 50 3 25-31 49-69 42-32-6-39-31-66-37-28-6-62 13-75-10-13-22 18-42 14-68-3-22 30-25 49-46Z" />
        <path className="land land-two" d="M265 101c41 5 72 35 75 70 2 26-16 32-10 57 6 26 32 34 25 54-8 24-58 30-83 9-22-19-1-43-18-66-16-22-52-12-63-36-13-28 25-93 74-88Z" />
        <path className="cloud" d="M91 187c50-31 93-33 136-13M175 298c46 18 91 18 137-3M235 121c35 7 67 22 94 46" />
        <circle className="damage-dot dot-one" cx="294" cy="137" r="13" />
        <circle className="damage-dot dot-two" cx="151" cy="260" r="10" />
      </svg>
    </div>
  );
}

function ActionCard({ game, instance, onPlay }: { game: GameState; instance: CardInstance; onPlay: () => void }) {
  const card = cardById[instance.defId];
  const legal = canPlayCard(game, instance.instanceId);
  const cost = getCardCost(game, card);
  return (
    <button className={`action-card ${card.type.toLowerCase().replaceAll(' ', '-')}`} onClick={onPlay} disabled={!legal.ok} title={legal.reason}>
      <span className="card-type">{card.type}</span>
      <strong>{card.name}</strong>
      <p>{card.text}</p>
      <span className="card-cost">{cost.ap ? `${cost.ap} AP` : ''}{cost.ap && cost.pp ? ' + ' : ''}{cost.pp ? `${cost.pp} PP` : ''}</span>
    </button>
  );
}

function countStatus(game: GameState, defId: string): number {
  return [...game.deck, ...game.hand, ...game.discard].filter((card) => card.defId === defId).length;
}
