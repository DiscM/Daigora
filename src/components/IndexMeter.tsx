import { Leaf, Landmark, Recycle, Users } from 'lucide-react';
import type { IndexKey } from '../game/types';

const indexLabels: Record<IndexKey, string> = {
  trust: 'Trust',
  ecology: 'Ecology',
  economy: 'Economy',
  coordination: 'Coordination',
};

export function IndexMeter({ indexKey, value }: { indexKey: IndexKey; value: number }) {
  return (
    <div className={`index-meter ${indexKey}`}>
      <span className="index-icon">{indexIcon(indexKey)}</span>
      <div className="meter-label">
        <span>{indexLabels[indexKey]}</span>
        <strong>{value}</strong>
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
