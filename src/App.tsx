import { useEffect, useMemo, useRef, useState } from 'react';
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
const DEFAULT_AIDS = ['educator', 'disaster-responder'];
type FeedbackKind = 'card' | 'damage' | 'debuff' | 'avert' | 'gain';

interface FeedbackEvent {
  id: number;
  kind: FeedbackKind;
  text: string;
}

interface FlashState {
  health?: 'gain' | 'loss';
  actionPoints?: 'gain' | 'loss';
  policyPoints?: 'gain' | 'loss';
  indexes: Partial<Record<IndexKey, 'gain' | 'loss'>>;
}

function loadGame(): GameState | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as GameState;
    } catch {
      localStorage.removeItem(SAVE_KEY);
    }
  }
  return null;
}

export function App() {
  const [game, setGame] = useState<GameState | null>(loadGame);
  const [seed, setSeed] = useState(game?.seed ?? 'earth-month');
  const [selectedAidIds, setSelectedAidIds] = useState<string[]>(game?.selectedAidIds ?? DEFAULT_AIDS);
  const [feedback, setFeedback] = useState<FeedbackEvent[]>([]);
  const [flashes, setFlashes] = useState<FlashState>({ indexes: {} });
  const [flashTick, setFlashTick] = useState(0);
  const previousGame = useRef<GameState | null>(game);
  const feedbackId = useRef(0);

  useEffect(() => {
    if (game) localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  }, [game]);

  useEffect(() => {
    const previous = previousGame.current;
    previousGame.current = game;
    if (!game || !previous) return;

    const nextFeedback = buildFeedback(previous, game, () => {
      feedbackId.current += 1;
      return feedbackId.current;
    });
    const nextFlashes = buildFlashes(previous, game);
    if (nextFeedback.length === 0 && !hasFlashes(nextFlashes)) return;

    if (nextFeedback.length > 0) setFeedback((items) => [...nextFeedback, ...items].slice(0, 5));
    setFlashes(nextFlashes);
    setFlashTick((tick) => tick + 1);
    const timeout = window.setTimeout(() => {
      setFeedback((items) => items.filter((item) => !nextFeedback.some((next) => next.id === item.id)));
      setFlashes({ indexes: {} });
    }, 1800);
    return () => window.clearTimeout(timeout);
  }, [game]);

  const selectedAids = useMemo(() => projectAids.filter((aid) => selectedAidIds.includes(aid.id)), [selectedAidIds]);
  const gameAids = useMemo(() => projectAids.filter((aid) => game?.selectedAidIds.includes(aid.id)), [game?.selectedAidIds]);

  function startGameFromSetup() {
    const chosen = selectedAidIds.slice(0, 3);
    const next = createGame(seed.trim() || 'earth-month', chosen.length ? chosen : DEFAULT_AIDS);
    previousGame.current = null;
    setFeedback([]);
    setFlashes({ indexes: {} });
    setGame(next);
  }

  function openStartMenu() {
    localStorage.removeItem(SAVE_KEY);
    setGame(null);
  }

  function restartCurrentSetup() {
    const currentAids = game?.selectedAidIds ?? selectedAidIds;
    setSelectedAidIds(currentAids);
    const next = createGame(seed.trim() || 'earth-month', currentAids.length ? currentAids : DEFAULT_AIDS);
    previousGame.current = null;
    setFeedback([]);
    setFlashes({ indexes: {} });
    setGame(next);
  }

  function randomizeSeed() {
    const next = `seed-${Math.floor(Math.random() * 99999)}`;
    setSeed(next);
  }

  function toggleAid(id: string) {
    setSelectedAidIds((ids) => {
      if (ids.includes(id)) return ids.filter((item) => item !== id);
      if (ids.length >= 3) return ids;
      return [...ids, id];
    });
  }

  function renderAidPicker(className = 'aid-picker') {
    return (
      <div className={className}>
        {projectAids.map((aid) => (
          <button
            key={aid.id}
            className={selectedAidIds.includes(aid.id) ? 'aid-chip selected' : 'aid-chip'}
            disabled={!selectedAidIds.includes(aid.id) && selectedAidIds.length >= 3}
            onClick={() => toggleAid(aid.id)}
            title={`${aid.passive} Drawback: ${aid.drawback}`}
          >
            <strong>{aid.name.replace('The ', '')}</strong>
            <span>{aid.role}</span>
          </button>
        ))}
      </div>
    );
  }

  if (!game) {
    return (
      <main className="start-shell">
        <section className="start-planet" aria-label="Planet briefing">
          <div className="orbit-field" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
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
        </section>
        <section className="start-menu panel" aria-label="Start menu">
          <p className="eyebrow">Earth Council Briefing</p>
          <h1>Heal the Planet</h1>
          <p>
            Ten crisis waves are approaching. Build trust, repair ecosystems, keep the economy moving, and coordinate policy before the final cascading crisis arrives.
          </p>
          <div className="briefing-grid" aria-label="How to play">
            <span>Play cards with AP.</span>
            <span>Earn PP for policy cards.</span>
            <span>Keep readiness above danger.</span>
            <span>Survive the final wave.</span>
          </div>
          <div className="advisor-heading">
            <h2>Choose up to 3 advisors</h2>
            <strong>{selectedAidIds.length}/3</strong>
          </div>
          {renderAidPicker('advisor-picker')}
          <div className="start-controls">
            <label className="seed-control">
              <span>Seed</span>
              <input value={seed} onChange={(event) => setSeed(event.target.value)} />
            </label>
            <button className="tonal-button" onClick={randomizeSeed} title="Choose a random seed">
              <Sparkles size={18} /> Random
            </button>
            <button className="filled-button start-button" onClick={startGameFromSetup}>
              <Play size={18} /> Start Game
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={`app-shell ${game.phase === 'gameOver' ? 'is-game-over' : ''}`}>
      <section className={`planet-stage ${flashes.health === 'loss' ? 'has-damage-flash' : ''}`} aria-label="Planet board">
        <div className="planet-damage-flash" aria-hidden="true" />
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
        <div className="feedback-layer" aria-live="polite">
          {feedback.map((item) => (
            <div className={`feedback-pop ${item.kind}`} key={item.id}>
              {item.text}
            </div>
          ))}
        </div>
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
          {gameAids.map((aid) => (
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
            <Resource key={`health-${flashTick}-${flashes.health ?? 'stable'}`} label="Health" value={`${game.planetHealth}/${game.maxPlanetHealth}`} kind="health" tone={game.planetHealth <= 6 ? 'danger' : 'good'} flash={flashes.health} />
            <Resource key={`ap-${flashTick}-${flashes.actionPoints ?? 'stable'}`} label="AP" value={game.actionPoints} kind="ap" flash={flashes.actionPoints} />
            <Resource key={`pp-${flashTick}-${flashes.policyPoints ?? 'stable'}`} label="PP" value={game.policyPoints} kind="pp" flash={flashes.policyPoints} />
          </div>
        </section>

        <CrisisPanel game={game} />

        <section className="hand-row" aria-label="Action hand">
          {game.hand.map((card) => (
            <ActionCard key={card.instanceId} game={game} instance={card} onPlay={() => setGame((state) => (state ? playCard(state, card.instanceId) : state))} />
          ))}
        </section>

        <aside className="panel meter-panel">
          <p className="eyebrow">Readiness</p>
          {INDEX_KEYS.map((key) => (
            <IndexMeter key={`${key}-${flashTick}-${flashes.indexes[key] ?? 'stable'}`} indexKey={key} value={game.indexes[key]} flash={flashes.indexes[key]} />
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
                  <button className="icon-button" onClick={restartCurrentSetup} title="Restart with current setup">
                    <RotateCcw size={18} />
                  </button>
                  <button className="filled-button" onClick={openStartMenu}>
                    <Play size={18} /> New Game
                  </button>
                </div>
                {renderAidPicker()}
              </div>
            </details>
            <button className="end-turn" onClick={() => setGame((state) => (state ? endTurn(state) : state))} disabled={game.phase !== 'play'}>
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

function resourceFlash(previous: number | undefined, current: number): 'gain' | 'loss' | undefined {
  if (previous === undefined || previous === current) return undefined;
  return current > previous ? 'gain' : 'loss';
}

function buildFlashes(previous: GameState, game: GameState): FlashState {
  const indexFlashes: Partial<Record<IndexKey, 'gain' | 'loss'>> = {};
  INDEX_KEYS.forEach((key) => {
    const flash = resourceFlash(previous.indexes[key], game.indexes[key]);
    if (flash) indexFlashes[key] = flash;
  });

  return {
    health: resourceFlash(previous.planetHealth, game.planetHealth),
    actionPoints: resourceFlash(previous.actionPoints, game.actionPoints),
    policyPoints: resourceFlash(previous.policyPoints, game.policyPoints),
    indexes: indexFlashes,
  };
}

function hasFlashes(flashes: FlashState): boolean {
  return Boolean(flashes.health || flashes.actionPoints || flashes.policyPoints || Object.keys(flashes.indexes).length);
}

function buildFeedback(previous: GameState, game: GameState, nextId: () => number): FeedbackEvent[] {
  const items: FeedbackEvent[] = [];
  const seenPreviousLog = new Set(previous.log.map((entry) => `${entry.turn}:${entry.text}`));
  const newLog = game.log.filter((entry) => !seenPreviousLog.has(`${entry.turn}:${entry.text}`)).reverse();

  for (const entry of newLog) {
    const text = entry.text;
    if (text.startsWith('Played ')) items.push({ id: nextId(), kind: 'card', text: text.replace(/\.$/, '') });
    else if (text.startsWith('Crisis dealt ')) items.push({ id: nextId(), kind: 'damage', text });
    else if (text.startsWith('Averted ') || text.startsWith('Prevented ')) items.push({ id: nextId(), kind: 'avert', text });
    else if (/Pollution|Misinformation|Apathy|Backlash|Pushback|Paralysis|calamity|Cascading|deforestation/i.test(text)) {
      items.push({ id: nextId(), kind: 'debuff', text });
    } else if (/Cleansed|Restore|gained/i.test(text)) {
      items.push({ id: nextId(), kind: 'gain', text });
    }
  }

  const healthDelta = game.planetHealth - previous.planetHealth;
  if (healthDelta < 0 && !items.some((item) => item.kind === 'damage')) {
    items.push({ id: nextId(), kind: 'damage', text: `${healthDelta} Health` });
  } else if (healthDelta > 0) {
    items.push({ id: nextId(), kind: 'gain', text: `+${healthDelta} Health` });
  }

  INDEX_KEYS.forEach((key) => {
    const delta = game.indexes[key] - previous.indexes[key];
    if (delta === 0) return;
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    items.push({ id: nextId(), kind: delta > 0 ? 'gain' : 'debuff', text: `${delta > 0 ? '+' : ''}${delta} ${label}` });
  });

  return items.slice(-5);
}
