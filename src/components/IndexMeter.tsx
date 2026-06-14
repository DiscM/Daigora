import { useEffect, useRef, useState } from 'react';
import { Leaf, Landmark, Recycle, Users } from 'lucide-react';
import type { IndexKey } from '../game/types';

const indexLabels: Record<IndexKey, string> = {
  trust: 'Trust',
  ecology: 'Ecology',
  economy: 'Economy',
  coordination: 'Coordination',
};

export function IndexMeter({ indexKey, value, flash }: { indexKey: IndexKey; value: number; flash?: 'gain' | 'loss' }) {
  const prevValueRef = useRef<number>(value);
  const [badge, setBadge] = useState<{ id: number; text: string; type: 'gain' | 'loss' } | null>(null);
  const badgeCounter = useRef(0);

  useEffect(() => {
    const prev = prevValueRef.current;
    if (prev !== value) {
      const diff = value - prev;
      badgeCounter.current += 1;
      setBadge({
        id: badgeCounter.current,
        text: diff > 0 ? `+${diff}` : `${diff}`,
        type: diff > 0 ? 'gain' : 'loss',
      });
      prevValueRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    if (badge) {
      const timeout = setTimeout(() => {
        setBadge(null);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [badge]);

  return (
    <div className={`index-meter ${indexKey} ${flash ? `flash-${flash}` : ''}`}>
      <span className="index-icon">{indexIcon(indexKey)}</span>
      <div className="meter-label">
        <span>{indexLabels[indexKey]}</span>
        <div className="value-container">
          <strong>{value}</strong>
          {badge && (
            <span key={badge.id} className={`delta-badge ${badge.type}`}>
              {badge.text}
            </span>
          )}
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
