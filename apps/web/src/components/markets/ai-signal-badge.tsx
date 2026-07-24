import type { AiSignalDto } from '@declawd/shared';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatPercent } from '@/lib/utils';

/** Compact badge summarizing an AI signal's direction, confidence, and EV. */
export function AiSignalBadge({ signal }: { signal: AiSignalDto | null | undefined }) {
  if (!signal || !signal.suggestedDirection) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <Minus className="h-3 w-3" />
        No signal
      </Badge>
    );
  }

  const isYes = signal.suggestedDirection === 'YES';

  return (
    <Badge variant={isYes ? 'success' : 'destructive'} title={signal.reasoning}>
      {isYes ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {signal.suggestedDirection} &middot; {formatPercent(signal.confidenceScore * 100)} conf &middot;{' '}
      EV {signal.expectedValue >= 0 ? '+' : ''}
      {(signal.expectedValue * 100).toFixed(1)}%
    </Badge>
  );
}
