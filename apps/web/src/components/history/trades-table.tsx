import type { TradeDto } from '@declawd/shared';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatUsd, formatPercent } from '@/lib/utils';

export function TradesTable({ trades }: { trades: TradeDto[] }) {
  if (trades.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No trades yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Market</TableHead>
          <TableHead>Direction</TableHead>
          <TableHead>Side</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Fees</TableHead>
          <TableHead>PnL</TableHead>
          <TableHead>Confidence</TableHead>
          <TableHead>Reason</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trades.map((trade) => (
          <TableRow key={trade.id}>
            <TableCell className="text-muted-foreground">
              {new Date(trade.executedAt).toLocaleString()}
            </TableCell>
            <TableCell className="max-w-[220px] whitespace-normal font-medium">
              {trade.marketQuestion}
            </TableCell>
            <TableCell>
              <Badge variant={trade.direction === 'YES' ? 'success' : 'destructive'}>
                {trade.direction}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{trade.side}</Badge>
            </TableCell>
            <TableCell>{trade.price.toFixed(3)}</TableCell>
            <TableCell>{formatUsd(trade.sizeUsd)}</TableCell>
            <TableCell>{formatUsd(trade.feesUsd)}</TableCell>
            <TableCell
              className={
                trade.pnlUsd == null
                  ? 'text-muted-foreground'
                  : trade.pnlUsd >= 0
                    ? 'text-success'
                    : 'text-destructive'
              }
            >
              {trade.pnlUsd == null ? '--' : formatUsd(trade.pnlUsd)}
            </TableCell>
            <TableCell>
              {trade.confidenceScore != null ? formatPercent(trade.confidenceScore * 100) : '--'}
            </TableCell>
            <TableCell className="max-w-[260px] whitespace-normal text-muted-foreground">
              {trade.reasoning ?? '--'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
