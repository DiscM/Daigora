import { useEffect, useMemo, useState } from 'react';
import { Droplet, Factory, Heart, Landmark, Leaf, Menu, Play, Recycle, RotateCcw, Settings, Sparkles, Users } from 'lucide-react';
import { cardById, crisisById, projectAids } from './game/content';
import { canPlayCard, createGame, endTurn, getCardCost, playCard } from './game/engine';
import type { CardInstance, GameState, IndexKey } from './game/types';
import { PhaserBoard } from './phaser/PhaserBoard';

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
          <h1>Heal the Planet</h1>
        </div>
        <div className="resource-strip" aria-label="Game resources">
          <Resource label="Turn" value={`${Math.min(game.turn, 10)} / 10`} kind="turn" />
          <Resource label="Planet Health" value={`${game.planetHealth} / ${game.maxPlanetHealth}`} kind="health" tone={game.planetHealth <= 6 ? 'danger' : 'good'} />
          <Resource label="AP" value={game.actionPoints} kind="ap" />
          <Resource label="PP" value={game.policyPoints} kind="pp" />
        </div>
        <div className="quick-actions">
          <button className="round-action" onClick={startNewGame} title="Restart with current setup">
            <Settings size={28} />
          </button>
          <details className="header-actions">
            <summary title="Game setup"><Menu size={30} /></summary>
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
                  onClick={() => toggleAid(aid.id)}
                  title={`${aid.passive} Drawback: ${aid.drawback}`}
                >
                  {aid.name.replace('The ', '')}
                </button>
              ))}
            </div>
          </div>
          </details>
        </div>
      </header>

      <section className="game-layout">
        <aside className="panel crisis-panel">
          <p className="panel-ribbon">Current Crisis</p>
          {currentCrisis ? (
            <>
              <div className="crisis-art" aria-hidden="true" />
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

        <section className="planet-stage" aria-label="Planet board">
          <PhaserBoard game={game} />
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
            <IndexMeter key={key} indexKey={key} label={indexLabels[key]} value={game.indexes[key]} />
          ))}
        </aside>
      </section>

      <section className="bottom-row">
        <div className="pile-zone" aria-label="Deck and discard">
          <DeckStack label="Deck" value={game.deck.length} variant="deck" />
          <DeckStack label="Discard" value={game.discard.length} variant="discard" />
          <button className="status-button" type="button">
            <Leaf size={18} /> Status
          </button>
        </div>

        <section className="hand-row" aria-label="Action hand">
          {game.hand.map((card) => (
            <ActionCard key={card.instanceId} game={game} instance={card} onPlay={() => setGame((state) => playCard(state, card.instanceId))} />
          ))}
        </section>

        <div className="side-actions">
          <ActiveProjects game={game} />
          <button className="end-turn" onClick={() => setGame((state) => endTurn(state))} disabled={game.phase !== 'play'}>
            End Turn
          </button>
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

function Resource({ label, value, kind, tone }: { label: string; value: string | number; kind: 'turn' | 'health' | 'ap' | 'pp'; tone?: 'good' | 'danger' }) {
  return (
    <div className={`resource ${kind} ${tone ?? ''}`}>
      <span className="resource-icon">{resourceIcon(kind)}</span>
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

function IndexMeter({ indexKey, label, value }: { indexKey: IndexKey; label: string; value: number }) {
  return (
    <div className={`index-meter ${indexKey}`}>
      <span className="index-icon">{indexIcon(indexKey)}</span>
      <div className="meter-label">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="meter-track">
        <div style={{ width: `${value * 10}%` }} />
      </div>
      <div className="meter-scale"><span>0</span><span>10</span></div>
    </div>
  );
}

function ActionCard({ game, instance, onPlay }: { game: GameState; instance: CardInstance; onPlay: () => void }) {
  const card = cardById[instance.defId];
  const legal = canPlayCard(game, instance.instanceId);
  const cost = getCardCost(game, card);
  return (
    <button className={`action-card ${card.type.toLowerCase().replaceAll(' ', '-')}`} onClick={onPlay} disabled={!legal.ok} title={legal.reason}>
      <span className="card-cost">{cost.ap || cost.pp}</span>
      <strong>{card.name}</strong>
      <span className={`card-art ${card.type.toLowerCase().replaceAll(' ', '-')}`} aria-hidden="true" />
      <p>{card.text}</p>
    </button>
  );
}

function DeckStack({ label, value, variant }: { label: string; value: number; variant: 'deck' | 'discard' }) {
  return (
    <div className={`deck-stack ${variant}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ActiveProjects({ game }: { game: GameState }) {
  const shield = game.incomingDamagePrevention + game.ongoing.reduce((sum, effect) => sum + effect.amount, 0);
  const ecology = Math.max(1, game.selectedAidIds.filter((id) => id.includes('ecolog') || id.includes('responder')).length);
  const trust = Math.max(1, game.selectedAidIds.filter((id) => id.includes('educator') || id.includes('policy')).length);
  return (
    <section className="active-projects" aria-label="Active projects">
      <p>Active Projects</p>
      <div>
        <ProjectToken kind="ap" value={shield || 2} />
        <ProjectToken kind="ecology" value={ecology} />
        <ProjectToken kind="trust" value={trust} />
      </div>
    </section>
  );
}

function ProjectToken({ kind, value }: { kind: 'ap' | 'ecology' | 'trust'; value: number }) {
  return (
    <span className={`project-token ${kind}`}>
      {kind === 'ap' ? <Droplet size={21} /> : kind === 'ecology' ? <Leaf size={21} /> : <Users size={21} />}
      <strong>{value}</strong>
    </span>
  );
}

function countStatus(game: GameState, defId: string): number {
  return [...game.deck, ...game.hand, ...game.discard].filter((card) => card.defId === defId).length;
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=\\.)\\s+/).map((item) => item.trim()).filter(Boolean);
}

function resourceIcon(kind: 'turn' | 'health' | 'ap' | 'pp') {
  if (kind === 'health') return <Heart size={22} />;
  if (kind === 'ap') return <Droplet size={22} />;
  if (kind === 'pp') return <Landmark size={22} />;
  return null;
}

function indexIcon(key: IndexKey) {
  if (key === 'trust') return <Users size={24} />;
  if (key === 'ecology') return <Leaf size={24} />;
  if (key === 'economy') return <Landmark size={24} />;
  return <Recycle size={24} />;
}
