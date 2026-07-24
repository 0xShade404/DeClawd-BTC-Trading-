import type { PositionDto } from '@declawd/shared';
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

export function PositionsTable({ positions }: { positions: PositionDto[] }) {
  if (positions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No open positions right now.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Market</TableHead>
          <TableHead>Direction</TableHead>
          <TableHead>Entry</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Unrealized PnL</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {positions.map((position) => (
          <TableRow key={position.id}>
            <TableCell className="max-w-[240px] whitespace-normal font-medium">
              {position.marketQuestion}
            </TableCell>
            <TableCell>
              <Badge variant={position.direction === 'YES' ? 'success' : 'destructive'}>
                {position.direction}
              </Badge>
            </TableCell>
            <TableCell>{position.entryPrice.toFixed(3)}</TableCell>
            <TableCell>{formatUsd(position.sizeUsd)}</TableCell>
            <TableCell
              className={
                position.realizedPnlUsd == null
                  ? 'text-muted-foreground'
                  : position.realizedPnlUsd >= 0
                    ? 'text-success'
                    : 'text-destructive'
              }
            >
              {position.realizedPnlUsd == null ? '--' : formatUsd(position.realizedPnlUsd)}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{position.status}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
