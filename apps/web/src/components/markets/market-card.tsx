import type { AiSignalDto, MarketDto } from '@declawd/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AiSignalBadge } from '@/components/markets/ai-signal-badge';
import { formatUsd } from '@/lib/utils';

/**
 * The list contract (`GET /markets`) only guarantees `MarketDto` fields; the
 * per-market AI signal is documented on `GET /markets/:id`. Some backends
 * enrich the list response with an optional `aiSignal` for markets that
 * already have a fresh signal cached, so we read it defensively here rather
 * than requiring a second round-trip per row.
 */
type MarketWithOptionalSignal = MarketDto & { aiSignal?: AiSignalDto | null };

export interface MarketCardEligibility {
  eligible: boolean;
  reason?: string;
}

function isEligible(market: MarketDto): MarketCardEligibility {
  if (market.status !== 'OPEN') return { eligible: false, reason: 'Market is not open' };
  if (market.liquidityUsd == null || market.liquidityUsd < 500) {
    return { eligible: false, reason: 'Insufficient liquidity' };
  }
  if (market.spreadBps != null && market.spreadBps > 500) {
    return { eligible: false, reason: 'Spread too wide' };
  }
  return { eligible: true };
}

export function MarketCard({ market }: { market: MarketWithOptionalSignal }) {
  const eligibility = isEligible(market);

  return (
    <Card className="glass-hover flex h-full flex-col">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <CardTitle className="text-sm font-medium leading-snug">{market.question}</CardTitle>
        <Badge variant={eligibility.eligible ? 'success' : 'outline'} className="shrink-0">
          {eligibility.eligible ? 'Eligible' : 'Not eligible'}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <AiSignalBadge signal={market.aiSignal} />
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Yes price</div>
            <div className="font-medium">{market.yesPrice != null ? market.yesPrice.toFixed(3) : '--'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">No price</div>
            <div className="font-medium">{market.noPrice != null ? market.noPrice.toFixed(3) : '--'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Liquidity</div>
            <div className="font-medium">{formatUsd(market.liquidityUsd)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">24h volume</div>
            <div className="font-medium">{formatUsd(market.volume24hUsd)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Spread</div>
            <div className="font-medium">{market.spreadBps != null ? `${market.spreadBps} bps` : '--'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Fee</div>
            <div className="font-medium">{market.feeBps != null ? `${market.feeBps} bps` : '--'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
