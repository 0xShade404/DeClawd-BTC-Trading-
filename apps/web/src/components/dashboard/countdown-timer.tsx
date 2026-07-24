'use client';

import * as React from 'react';

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'any moment now';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

/** Client-side ticking countdown to `target` (ISO timestamp), re-rendered every second. */
export function CountdownTimer({ target }: { target: string | null }) {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) {
    return <span className="text-muted-foreground">Not scheduled</span>;
  }

  const diff = new Date(target).getTime() - now;
  return <span data-testid="countdown-value">{formatCountdown(diff)}</span>;
}
