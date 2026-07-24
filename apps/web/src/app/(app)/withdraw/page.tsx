'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { WithdrawForm } from '@/components/withdraw/withdraw-form';
import { useWithdrawals } from '@/lib/hooks/use-withdrawals';
import { formatUsd, shortenAddress } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'success' | 'destructive' | 'outline' | 'secondary'> = {
  CONFIRMED: 'success',
  FAILED: 'destructive',
  PENDING: 'secondary',
  SIGNED: 'secondary',
  SUBMITTED: 'outline',
};

export default function WithdrawPage() {
  const { data } = useWithdrawals({ pageSize: 10 });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Withdraw</h1>
        <p className="text-sm text-muted-foreground">
          Move funds out of your trading pool or protected vault to any wallet you control.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WithdrawForm />

        <Card>
          <CardHeader>
            <CardTitle>Recent withdrawals</CardTitle>
            <CardDescription>Status updates as your withdrawal is signed and confirmed on-chain.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!data || data.items.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-muted-foreground">No withdrawals yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requested</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(w.requestedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>{w.sourceAccount === 'TRADING_POOL' ? 'Trading Pool' : 'Vault'}</TableCell>
                      <TableCell>{formatUsd(w.amountUsd)}</TableCell>
                      <TableCell className="font-mono text-xs">{shortenAddress(w.destinationAddress)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[w.status] ?? 'outline'}>{w.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
