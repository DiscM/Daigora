import { useEffect, useRef, useState } from 'react';

export interface DeltaBadge {
  id: number;
  text: string;
  type: 'gain' | 'loss';
}

export function useDeltaBadge(value: number, skip = false) {
  const prevValueRef = useRef<number>(value);
  const [badge, setBadge] = useState<DeltaBadge | null>(null);
  const badgeCounter = useRef(0);

  useEffect(() => {
    if (skip) return;
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
  }, [value, skip]);

  useEffect(() => {
    if (badge) {
      const timeout = setTimeout(() => setBadge(null), 1000);
      return () => clearTimeout(timeout);
    }
  }, [badge]);

  return badge;
}
