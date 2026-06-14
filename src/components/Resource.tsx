import { useEffect, useRef, useState } from 'react';
import { Droplet, Heart, Landmark } from 'lucide-react';

export function Resource({
  label,
  value,
  kind,
  tone,
  flash,
}: {
  label: string;
  value: string | number;
  kind: 'turn' | 'health' | 'ap' | 'pp';
  tone?: 'good' | 'danger';
  flash?: 'gain' | 'loss';
}) {
  const numValue = typeof value === 'number' ? value : parseInt(String(value).split('/')[0]) || 0;
  const prevValueRef = useRef<number>(numValue);
  const [badge, setBadge] = useState<{ id: number; text: string; type: 'gain' | 'loss' } | null>(null);
  const badgeCounter = useRef(0);

  useEffect(() => {
    if (kind === 'turn') return;
    const prev = prevValueRef.current;
    if (prev !== numValue) {
      const diff = numValue - prev;
      badgeCounter.current += 1;
      setBadge({
        id: badgeCounter.current,
        text: diff > 0 ? `+${diff}` : `${diff}`,
        type: diff > 0 ? 'gain' : 'loss',
      });
      prevValueRef.current = numValue;
    }
  }, [numValue, kind]);

  useEffect(() => {
    if (badge) {
      const timeout = setTimeout(() => {
        setBadge(null);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [badge]);

  return (
    <div className={`resource ${kind} ${tone ?? ''} ${flash ? `flash-${flash}` : ''}`}>
      <span className="resource-icon">{resourceIcon(kind)}</span>
      <span>{label}</span>
      <div className="value-container">
        <strong>{value}</strong>
        {badge && (
          <span key={badge.id} className={`delta-badge ${badge.type}`}>
            {badge.text}
          </span>
        )}
      </div>
    </div>
  );
}

function resourceIcon(kind: 'turn' | 'health' | 'ap' | 'pp') {
  if (kind === 'health') return <Heart size={22} />;
  if (kind === 'ap') return <Droplet size={22} />;
  if (kind === 'pp') return <Landmark size={22} />;
  return null;
}
