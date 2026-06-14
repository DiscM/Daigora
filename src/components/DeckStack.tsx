export function DeckStack({ label, value, variant }: { label: string; value: number; variant: 'deck' | 'discard' }) {
  return (
    <div className={`deck-stack ${variant}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
