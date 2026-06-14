import { Droplet, Leaf, Users } from 'lucide-react';
import type { GameState } from '../game/types';

export function ActiveProjects({ game }: { game: GameState }) {
  const shield = game.incomingDamagePrevention + game.ongoing.reduce((sum, effect) => sum + effect.amount, 0);
  return (
    <section className="active-projects" aria-label="Active projects">
      <p>Active Projects</p>
      <div>
        <ProjectToken kind="ap" value={shield} />
        <ProjectToken kind="ecology" value={ecologyCount(game)} />
        <ProjectToken kind="trust" value={trustCount(game)} />
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

function ecologyCount(game: GameState): number {
  const fromAids = game.selectedAidIds.filter((id) => id === 'ecologist' || id === 'disaster-responder').length;
  const fromOngoing = game.ongoing.filter((e) => e.tag === 'habitat' || e.tag === 'climate').length;
  return fromAids + fromOngoing;
}

function trustCount(game: GameState): number {
  const fromAids = game.selectedAidIds.filter((id) => id === 'educator' || id === 'policy-advocate').length;
  return fromAids || 1;
}
