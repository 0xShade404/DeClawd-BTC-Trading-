import type { MarketDto } from '@declawd/shared';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatUsd } from '@/lib/utils';

export function MarketsTable({ markets }: { markets: MarketDto[] }) {
  if (markets.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No markets found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Market</TableHead>
          <TableHead>Yes</TableHead>
          <TableHead>No</TableHead>
          <TableHead>Liquidity</TableHead>
          <TableHead>24h volume</TableHead>
          <TableHead>Spread</TableHead>
          <TableHead>Fee</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {markets.map((market) => (
          <TableRow key={market.id}>
            <TableCell className="max-w-[280px] whitespace-normal font-medium">
              {market.question}
            </TableCell>
            <TableCell>{market.yesPrice != null ? market.yesPrice.toFixed(3) : '--'}</TableCell>
            <TableCell>{market.noPrice != null ? market.noPrice.toFixed(3) : '--'}</TableCell>
            <TableCell>{formatUsd(market.liquidityUsd)}</TableCell>
            <TableCell>{formatUsd(market.volume24hUsd)}</TableCell>
            <TableCell>{market.spreadBps != null ? `${market.spreadBps} bps` : '--'}</TableCell>
            <TableCell>{market.feeBps != null ? `${market.feeBps} bps` : '--'}</TableCell>
            <TableCell>
              <Badge variant="outline">{market.status}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
