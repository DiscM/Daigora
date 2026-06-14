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
  return (
    <div className={`resource ${kind} ${tone ?? ''} ${flash ? `flash-${flash}` : ''}`}>
      <span className="resource-icon">{resourceIcon(kind)}</span>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function resourceIcon(kind: 'turn' | 'health' | 'ap' | 'pp') {
  if (kind === 'health') return <Heart size={22} />;
  if (kind === 'ap') return <Droplet size={22} />;
  if (kind === 'pp') return <Landmark size={22} />;
  return null;
}
