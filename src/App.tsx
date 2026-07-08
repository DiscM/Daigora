import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Menu, Play, RotateCcw, Sparkles } from 'lucide-react';
import { projectAids, cardById } from './game/content';
import { createGame, endTurn, playCard, draftCard, upgradeCard, retireCard, getRetireableCards, resolveCrisisChoice, useAdvisorAbility, skipDraftOrUpgrade } from './game/engine';
import type { GameState, IndexKey } from './game/types';
import { INDEX_KEYS } from './game/types';
import { Resource } from './components/Resource';
import { IndexMeter } from './components/IndexMeter';
import { ActionCard } from './components/ActionCard';
import { ActiveProjects } from './components/ActiveProjects';
import { CrisisPanel } from './components/CrisisPanel';

const SAVE_KEY = 'heal-the-planet-save-v1';
const DEFAULT_AIDS = ['educator', 'disaster-responder'];
type FeedbackKind = 'card' | 'damage' | 'debuff' | 'avert' | 'gain';

function useViewportScale(ref: React.RefObject<HTMLElement | null>, reFitDeps: React.DependencyList = []) {
  const refitRef = useRef<(() => void) | null>(null);
  const lastScaleRef = useRef(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    let resizeTimer: ReturnType<typeof setTimeout>;
    const SCALE_THRESHOLD = 0.03;

    const applyScale = (scale: number) => {
      if (Math.abs(scale - lastScaleRef.current) < SCALE_THRESHOLD) return;
      lastScaleRef.current = scale;
      el.style.transform = `scale(${scale})`;
    };

    const refit = () => {
      const w = el.scrollWidth;
      const h = el.scrollHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (!w || !h || !vw || !vh) return;
      const scale = Math.min(vw / w, vh / h);
      applyScale(scale);
    };

    const debouncedRefit = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(refit, 120);
    };

    refitRef.current = refit;
    refit();
    window.addEventListener('resize', debouncedRefit);
    return () => {
      window.removeEventListener('resize', debouncedRefit);
      clearTimeout(resizeTimer);
    };
  }, [ref]);

  useLayoutEffect(() => {
    refitRef.current?.();
  }, reFitDeps);
}

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
      const parsed = JSON.parse(raw);
      if (!isSavedGameShape(parsed)) throw new Error('Invalid save');
      return normalizeSavedGame(parsed);
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
  const [gameMode, setGameMode] = useState<'campaign' | 'workshop'>(game?.gameMode ?? 'campaign');
  const [difficulty, setDifficulty] = useState<'normal' | 'hard' | 'apocalypse'>('normal');
  const [feedback, setFeedback] = useState<FeedbackEvent[]>([]);
  const [flashes, setFlashes] = useState<FlashState>({ indexes: {} });
  const [flashTick, setFlashTick] = useState(0);
  const previousGame = useRef<GameState | null>(game);
  const feedbackId = useRef(0);
  const scalerRef = useRef<HTMLDivElement>(null);

  useViewportScale(scalerRef, [game?.phase, game?.hand.length, game]);

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

  const gameAids = useMemo(() => projectAids.filter((aid) => game?.selectedAidIds.includes(aid.id)), [game?.selectedAidIds]);

  const upgradableCards = useMemo(() => {
    if (!game) return [];
    const allInstances = [...game.hand, ...game.deck, ...game.discard];
    const uniqueDefIds = Array.from(new Set(allInstances.map((c) => c.defId)));
    return uniqueDefIds
      .map((defId) => cardById[defId])
      .filter((card) => card && card.upgradesTo);
  }, [game]);

  function startGameFromSetup() {
    const chosen = selectedAidIds.slice(0, 3);
    const next = createGame(seed.trim() || 'earth-month', chosen.length ? chosen : DEFAULT_AIDS, gameMode, difficulty);
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
    const next = createGame(seed.trim() || 'earth-month', currentAids.length ? currentAids : DEFAULT_AIDS, game?.gameMode ?? gameMode);
    previousGame.current = null;
    setFeedback([]);
    setFlashes({ indexes: {} });
    setGame(next);
  }

  function randomizeSeed() {
    const next = `seed-${Math.floor(Math.random() * 99999)}`;
    setSeed(next);
  }

  const toggleAid = useCallback((id: string) => {
    setSelectedAidIds((ids) => {
      if (ids.includes(id)) return ids.filter((item) => item !== id);
      if (ids.length >= 3) return ids;
      return [...ids, id];
    });
  }, []);

  if (!game) {
    const startMenu = (
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
            Twenty crisis waves are approaching. Build trust, repair ecosystems, keep the economy moving, and coordinate policy before the final cascading crisis arrives.
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
          <AidPicker selectedAidIds={selectedAidIds} toggleAid={toggleAid} className="advisor-picker" />
          <div className="start-controls">
            <label className="seed-control select-mode-control">
              <span>Mode</span>
              <select
                value={gameMode}
                onChange={(event) => setGameMode(event.target.value as 'campaign' | 'workshop')}
                className="game-mode-select"
              >
                <option value="campaign">Campaign Mode (20 Turns, 24 HP)</option>
                <option value="workshop">Workshop Mode (10 Turns, 20 HP)</option>
              </select>
            </label>
            <label className="seed-control select-mode-control">
              <span>Difficulty</span>
              <select
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value as 'normal' | 'hard' | 'apocalypse')}
                className="game-mode-select"
              >
                <option value="normal">Normal</option>
                <option value="hard">Hard (start: indexes 2, HP -2)</option>
                <option value="apocalypse">Apocalypse (start: indexes 1, HP -4)</option>
              </select>
            </label>
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
    return (
      <div className="viewport">
        <div className="scaler" ref={scalerRef}>{startMenu}</div>
      </div>
    );
  }

  const gameShell = (
    <main className={`app-shell ${game.phase === 'gameOver' ? 'is-game-over' : ''}`}>
      <section className={`planet-stage ${flashes.health === 'loss' ? 'has-damage-flash' : ''}`} aria-label="Planet board">
        <div className="planet-damage-flash" aria-hidden="true" />
        <div className="sky-effects" aria-hidden="true">
          <span className="leaf-drift leaf-drift-a" />
          <span className="leaf-drift leaf-drift-b" />
          <span className="sky-glow glow-a" />
          <span className="sky-glow glow-b" />
          <span className="wind-gust gust-a" />
          <span className="wind-gust gust-b" />
          <span className="sun-orbit"><span className="sun" /></span>
        </div>
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
          <span className="planet-surface">
            <span className="planet-map">
              <span className="continent north-america" />
              <span className="continent south-america" />
              <span className="continent eurasia" />
              <span className="continent africa" />
              <span className="continent australia" />
              <span className="continent greenland" />
              <span className="damage-zone damage-a" />
              <span className="damage-zone damage-b" />
              <span className="cloud-band cloud-a" />
              <span className="cloud-band cloud-b" />
            </span>
            <span className="planet-map" aria-hidden="true">
              <span className="continent north-america" />
              <span className="continent south-america" />
              <span className="continent eurasia" />
              <span className="continent africa" />
              <span className="continent australia" />
              <span className="continent greenland" />
              <span className="damage-zone damage-a" />
              <span className="damage-zone damage-b" />
              <span className="cloud-band cloud-a" />
              <span className="cloud-band cloud-b" />
            </span>
            <span className="planet-map" aria-hidden="true">
              <span className="continent north-america" />
              <span className="continent south-america" />
              <span className="continent eurasia" />
              <span className="continent africa" />
              <span className="continent australia" />
              <span className="continent greenland" />
              <span className="damage-zone damage-a" />
              <span className="damage-zone damage-b" />
              <span className="cloud-band cloud-a" />
              <span className="cloud-band cloud-b" />
            </span>
          </span>
        </div>
        <div className="aid-row">
          {gameAids.map((aid) => (
            <div className="aid-token" key={aid.id} tabIndex={0}>
              <span>{aid.name.replace('The ', '')}</span>
              {aid.ability && (
                <button
                  className={`aid-ability-btn ${game.advisorAbilityUsed[aid.id] ? 'used' : ''}`}
                  disabled={game.advisorAbilityUsed[aid.id] || game.phase === 'gameOver'}
                  onClick={() => setGame((s) => s ? useAdvisorAbility(s, aid.id) : s)}
                  type="button"
                  title={aid.ability}
                >
                  {game.advisorAbilityUsed[aid.id] ? 'Used' : 'Ability'}
                </button>
              )}
              <span className="aid-tooltip" role="tooltip">
                <b>Benefit</b>
                {aid.passive}
                <b>Drawback</b>
                {aid.drawback}
                {aid.ability && <><b>Ability</b>{aid.ability}</>}
              </span>
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
            <Resource label="Turn" value={`${Math.min(game.turn, game.turnLimit)}/${game.turnLimit}`} kind="turn" />
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
              </div>
            </details>
            <button className="end-turn" onClick={() => setGame((state) => (state ? endTurn(state) : state))} disabled={game.phase !== 'play' || Boolean(game.pendingCrisisChoice)}>
              End Turn
            </button>
          </div>
        </div>
      </section>
    </main>
  );

  const crisisChoiceOverlay = game.pendingCrisisChoice && (
    <div className="crisis-choice-overlay">
      <div className="draft-upgrade-container">
        <div className="draft-upgrade-header">
          <h2>Crisis Response Required</h2>
          <p>{game.pendingCrisisChoice.text}</p>
        </div>
        <div className="crisis-choice-grid">
          {game.pendingCrisisChoice.options.map((option, index) => (
            <div key={index} className="crisis-choice-card">
              <p className="choice-text">{option.text}</p>
              <button
                className="filled-button crisis-choice-btn"
                onClick={() => setGame((state) => state ? resolveCrisisChoice(state, index) : null)}
                type="button"
              >
                Choose This Response
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const draftUpgradeOverlay = game.phase === 'draftOrUpgrade' && (
    <div className="draft-upgrade-overlay">
      <div className="draft-upgrade-container">
        <div className="draft-upgrade-header">
          <h2>Deck Improvement Phase</h2>
          <p>Choose <strong>one</strong> action to improve your deck for upcoming crises.</p>
        </div>

        <section className="improv-section">
          <h3 className="improv-section-title">Draft a New Card</h3>
          <p className="improv-section-sub">Add one of these 3 random actions to your discard pile</p>
          <div className="improv-card-grid improv-card-grid--fixed">
            {game.draftOptions.map((defId) => (
              <StaticCard
                key={defId}
                defId={defId}
                onClick={() => setGame((state) => state ? draftCard(state, defId) : null)}
              />
            ))}
          </div>
        </section>

        <section className="improv-section">
          <h3 className="improv-section-title">Upgrade an Existing Card</h3>
          <p className="improv-section-sub">Choose one card in your deck to upgrade permanently</p>
          {upgradableCards.length === 0 ? (
            <div className="improv-empty">
              <p>No upgradable cards in your current deck.</p>
            </div>
          ) : (
            <div className="improv-card-grid">
              {upgradableCards.map((card) => (
                <div key={card.id} className="improv-card-cell">
                  <StaticCard defId={card.upgradesTo!} />
                  <button
                    className="filled-button improv-action-btn"
                    onClick={() => setGame((state) => state ? upgradeCard(state, card.id) : null)}
                    type="button"
                  >
                    Upgrade {card.name}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="improv-section">
          <h3 className="improv-section-title">Retire a Card</h3>
          <p className="improv-section-sub">Remove a card from your deck to improve consistency</p>
          {(() => {
            const retireable = getRetireableCards(game);
            if (retireable.length === 0) {
              return <div className="improv-empty"><p>No cards to retire.</p></div>;
            }
            return (
              <div className="improv-card-grid">
                {retireable.map((card) => (
                  <div key={card.id} className="improv-card-cell">
                    <StaticCard defId={card.id} />
                    <button
                      className="tonal-button improv-action-btn"
                      onClick={() => setGame((state) => state ? retireCard(state, card.id) : null)}
                      type="button"
                    >
                      Retire {card.name}
                    </button>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>

        <div className="draft-upgrade-footer">
          <button
            className="tonal-button skip-phase-btn"
            onClick={() => setGame((state) => state ? skipDraftOrUpgrade(state) : null)}
            type="button"
          >
            Skip (Keep Deck Unchanged)
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="viewport">
        <div className="scaler" ref={scalerRef}>{gameShell}</div>
      </div>
      {crisisChoiceOverlay && createPortal(crisisChoiceOverlay, document.body)}
      {draftUpgradeOverlay && createPortal(draftUpgradeOverlay, document.body)}
    </>
  );
}

function StaticCard({ defId, onClick, className }: { defId: string; onClick?: () => void; className?: string }) {
  const card = cardById[defId];
  if (!card) return null;
  const typeClass = card.type.toLowerCase().replaceAll(' ', '-');
  const isUpgraded = defId.endsWith('-upgraded');
  const displayName = card.name.endsWith('+') ? card.name.slice(0, -1) : card.name;
  
  const apCost = card.costAp ?? 0;
  const ppCost = card.costPp ?? 0;

  const content = (
    <>
      <span className="card-head">
        <span className="card-costs">
          {apCost > 0 || ppCost === 0 ? <span className="card-cost ap">{apCost}</span> : null}
          {ppCost > 0 ? <span className="card-cost pp">{ppCost}</span> : null}
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

  if (onClick) {
    return (
      <button
        className={`action-card static-card draft-option-card ${typeClass} ${isUpgraded ? 'is-upgraded' : ''} ${className ?? ''}`}
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`action-card static-card ${typeClass} ${isUpgraded ? 'is-upgraded' : ''} ${className ?? ''}`}>
      {content}
    </div>
  );
}

function AidPicker({ selectedAidIds, toggleAid, className }: { selectedAidIds: string[]; toggleAid: (id: string) => void; className?: string }) {
  return (
    <div className={className ?? 'aid-picker'}>
      {projectAids.map((aid) => (
        <button
          key={aid.id}
          className={`${selectedAidIds.includes(aid.id) ? 'aid-chip selected' : 'aid-chip'} ${aid.id === 'disaster-responder' ? 'tooltip-above' : ''}`}
          disabled={!selectedAidIds.includes(aid.id) && selectedAidIds.length >= 3}
          onClick={() => toggleAid(aid.id)}
        >
          <strong>{aid.name.replace('The ', '')}</strong>
          <span>{aid.role}</span>
          <span className="advisor-benefit"><b>Benefit</b>{aid.passive}</span>
          <span className="advisor-drawback"><b>Drawback</b>{aid.drawback}</span>
        </button>
      ))}
    </div>
  );
}

function normalizeSavedGame(saved: GameState): GameState {
  const cardCount = saved.deck.length + saved.hand.length + saved.discard.length + saved.exhausted.length;
  return {
    ...saved,
    gameMode: saved.gameMode ?? 'campaign',
    difficulty: saved.difficulty ?? 'normal',
    turnLimit: saved.turnLimit ?? (saved.gameMode === 'workshop' ? 10 : 20),
    draftOptions: saved.draftOptions ?? [],
    nextInstanceId: saved.nextInstanceId ?? cardCount + 1,
    educationPlayedThisTurn: saved.educationPlayedThisTurn ?? false,
    desperationApBonusNextTurn: saved.desperationApBonusNextTurn ?? 0,
    cascadingCooldownTurns: saved.cascadingCooldownTurns ?? 0,
    crisisAppearanceCount: saved.crisisAppearanceCount ?? {},
    advisorAbilityUsed: saved.advisorAbilityUsed ?? {},
    midGameBonuses: saved.midGameBonuses ?? {},
    maxPolicyPoints: saved.maxPolicyPoints ?? 10,
  };
}

function isSavedGameShape(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GameState>;
  return (
    typeof candidate.seed === 'string' &&
    typeof candidate.rngState === 'number' &&
    typeof candidate.turn === 'number' &&
    typeof candidate.planetHealth === 'number' &&
    typeof candidate.maxPlanetHealth === 'number' &&
    typeof candidate.actionPoints === 'number' &&
    typeof candidate.policyPoints === 'number' &&
    Boolean(candidate.indexes) &&
    typeof candidate.indexes?.trust === 'number' &&
    typeof candidate.indexes.ecology === 'number' &&
    typeof candidate.indexes.economy === 'number' &&
    typeof candidate.indexes.coordination === 'number' &&
    Array.isArray(candidate.selectedAidIds) &&
    Array.isArray(candidate.crisisDeck) &&
    Array.isArray(candidate.crisisDiscard) &&
    Array.isArray(candidate.deck) &&
    Array.isArray(candidate.hand) &&
    Array.isArray(candidate.discard) &&
    Array.isArray(candidate.exhausted) &&
    Array.isArray(candidate.ongoing) &&
    Array.isArray(candidate.log) &&
    (candidate.gameMode === undefined || candidate.gameMode === 'campaign' || candidate.gameMode === 'workshop') &&
    (candidate.turnLimit === undefined || typeof candidate.turnLimit === 'number') &&
    (candidate.draftOptions === undefined || Array.isArray(candidate.draftOptions))
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
