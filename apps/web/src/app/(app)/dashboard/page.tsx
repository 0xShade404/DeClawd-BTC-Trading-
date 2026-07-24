'use client';

import { Wallet, Landmark, ShieldCheck, TrendingUp, Percent, Activity, Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/stat-card';
import { PositionsTable } from '@/components/dashboard/positions-table';
import { ProfitChart, type ProfitChartPoint } from '@/components/dashboard/profit-chart';
import { BotStatusToggle } from '@/components/dashboard/bot-status-toggle';
import { useDashboardSummary } from '@/lib/hooks/use-dashboard-summary';
import { formatUsd, formatPercent } from '@/lib/utils';

export default function DashboardPage() {
  const { data: summary, isLoading } = useDashboardSummary();

  // The API contract doesn't expose a dedicated PnL time-series endpoint yet,
  // so we chart the daily/weekly/monthly aggregates DashboardSummaryDto
  // already gives us. Swap for a real series once /dashboard/pnl-series (or
  // similar) exists on the backend.
  const chartData: ProfitChartPoint[] = summary
    ? [
        { label: 'Today', pnlUsd: summary.dailyProfitUsd },
        { label: 'This week', pnlUsd: summary.weeklyProfitUsd },
        { label: 'This month', pnlUsd: summary.monthlyProfitUsd },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your wallet, trading pool, and vault at a glance.
        </p>
      </div>

      <BotStatusToggle />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Wallet balance"
          icon={Wallet}
          value={isLoading ? '...' : formatUsd(summary?.walletBalanceUsd ?? null)}
        />
        <StatCard
          label="Trading pool"
          icon={Landmark}
          value={isLoading ? '...' : formatUsd(summary?.tradingPoolUsd ?? 0)}
        />
        <StatCard
          label="Protected vault"
          icon={ShieldCheck}
          value={isLoading ? '...' : formatUsd(summary?.protectedVaultUsd ?? 0)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatCard label="Daily P&L" value={isLoading ? '...' : formatUsd(summary?.dailyProfitUsd ?? 0)} trend={(summary?.dailyProfitUsd ?? 0) >= 0 ? 'up' : 'down'} />
        <StatCard label="Weekly P&L" value={isLoading ? '...' : formatUsd(summary?.weeklyProfitUsd ?? 0)} trend={(summary?.weeklyProfitUsd ?? 0) >= 0 ? 'up' : 'down'} />
        <StatCard label="Monthly P&L" value={isLoading ? '...' : formatUsd(summary?.monthlyProfitUsd ?? 0)} trend={(summary?.monthlyProfitUsd ?? 0) >= 0 ? 'up' : 'down'} />
        <StatCard label="ROI" icon={TrendingUp} value={isLoading ? '...' : formatPercent(summary?.roiPct ?? 0)} />
        <StatCard label="Win rate" icon={Percent} value={isLoading ? '...' : formatPercent(summary?.winRatePct ?? 0)} />
        <StatCard label="Sharpe ratio" icon={Activity} value={isLoading ? '...' : (summary?.sharpeRatio ?? 0).toFixed(2)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent PnL</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfitChart data={chartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-bitcoin-500" />
            Open positions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PositionsTable positions={summary?.openPositions ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
