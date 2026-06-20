import { Leaf, Landmark, Recycle, Users } from 'lucide-react';
import { useDeltaBadge } from './useDeltaBadge';
import type { IndexKey } from '../game/types';

const indexLabels: Record<IndexKey, string> = {
  trust: 'Trust',
  ecology: 'Ecology',
  economy: 'Economy',
  coordination: 'Coordination',
};

export function IndexMeter({ indexKey, value, flash }: { indexKey: IndexKey; value: number; flash?: 'gain' | 'loss' }) {
  const badge = useDeltaBadge(value);

  return (
    <div className={`index-meter ${indexKey} ${flash ? `flash-${flash}` : ''}`}>
      <span className="index-icon">{indexIcon(indexKey)}</span>
      <div className="meter-label">
        <span>{indexLabels[indexKey]}</span>
        <div className="value-container">
          <strong>{value}</strong>
          {badge && <span key={badge.id} className={`delta-badge ${badge.type}`}>{badge.text}</span>}
        </div>
      </div>
      <div className="meter-track">
        <div style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  );
}

function indexIcon(key: IndexKey) {
  if (key === 'trust') return <Users size={24} />;
  if (key === 'ecology') return <Leaf size={24} />;
  if (key === 'economy') return <Landmark size={24} />;
  return <Recycle size={24} />;
}
