import { Heart, Droplet, Landmark } from 'lucide-react';
import { useDeltaBadge } from './useDeltaBadge';

export function Resource({ label, value, kind, tone, flash }: {
  label: string;
  value: string | number;
  kind: 'turn' | 'health' | 'ap' | 'pp';
  tone?: 'good' | 'danger';
  flash?: 'gain' | 'loss';
}) {
  const numValue = typeof value === 'number' ? value : parseInt(String(value).split('/')[0]) || 0;
  const badge = useDeltaBadge(numValue, kind === 'turn');

  return (
    <div className={`resource ${kind} ${tone ?? ''} ${flash ? `flash-${flash}` : ''}`}>
      <span className="resource-icon">{resourceIcon(kind)}</span>
      <span>{label}</span>
      <div className="value-container">
        <strong>{value}</strong>
        {badge && <span key={badge.id} className={`delta-badge ${badge.type}`}>{badge.text}</span>}
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
