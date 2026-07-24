'use client';

import { ShieldCheck, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useLedgerAccounts } from '@/lib/hooks/use-ledger-accounts';
import { useSettings } from '@/lib/hooks/use-settings';
import { usePositions } from '@/lib/hooks/use-positions';
import { formatUsd } from '@/lib/utils';

export default function VaultPage() {
  const { data: accounts, isLoading: accountsLoading } = useLedgerAccounts();
  const { data: settings } = useSettings();
  const { data: closedPositions } = usePositions({ status: 'closed', pageSize: 10 });

  const vault = accounts?.find((a) => a.type === 'PROTECTED_VAULT');
  const pool = accounts?.find((a) => a.type === 'TRADING_POOL');

  const vaultPct = settings?.vaultAllocationPct ?? 70;
  const poolPct = settings?.tradingPoolAllocationPct ?? 30;

  // Realized profit on settled positions is the closest proxy the current
  // API contract exposes for "profit allocated into the vault" — there is
  // no dedicated vault-ledger-entries endpoint yet.
  const allocations = (closedPositions?.items ?? []).filter(
    (p) => p.realizedPnlUsd != null && p.realizedPnlUsd > 0,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Protected vault</h1>
        <p className="text-sm text-muted-foreground">
          A share of every winning trade is set aside automatically so gains compound safely.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-bitcoin-500/15 text-bitcoin-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Protected vault balance
              </div>
              <div className="text-2xl font-semibold">
                {accountsLoading ? '...' : formatUsd(vault ? Number(vault.balanceUsd) : 0)}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-foreground">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Trading pool balance
              </div>
              <div className="text-2xl font-semibold">
                {accountsLoading ? '...' : formatUsd(pool ? Number(pool.balanceUsd) : 0)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>The split rule</CardTitle>
          <CardDescription>
            Every time a position settles for a profit, DeClawd splits the realized gain between
            your active trading pool and the protected vault. The vault is never used for new
            trades — it only grows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/10">
            <div className="bg-bitcoin-500" style={{ width: `${vaultPct}%` }} />
            <div className="bg-white/30" style={{ width: `${poolPct}%` }} />
          </div>
          <div className="mt-3 flex justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-bitcoin-500" />
              Protected vault &mdash; {vaultPct}%
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
              Trading pool &mdash; {poolPct}%
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Adjust this split any time from Settings &rarr; Auto-compound &amp; allocation.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent profit allocations</CardTitle>
          <CardDescription>Settled winning positions and the vault share they contributed.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {allocations.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">No profitable settlements yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Settled</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Realized PnL</TableHead>
                  <TableHead>To vault ({vaultPct}%)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.map((position) => {
                  const pnl = position.realizedPnlUsd ?? 0;
                  return (
                    <TableRow key={position.id}>
                      <TableCell className="text-muted-foreground">
                        {position.closedAt ? new Date(position.closedAt).toLocaleString() : '--'}
                      </TableCell>
                      <TableCell className="max-w-[240px] whitespace-normal font-medium">
                        {position.marketQuestion}
                      </TableCell>
                      <TableCell className="text-success">{formatUsd(pnl)}</TableCell>
                      <TableCell className="text-bitcoin-500">{formatUsd((pnl * vaultPct) / 100)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{position.settlementStatus ?? 'PENDING'}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
