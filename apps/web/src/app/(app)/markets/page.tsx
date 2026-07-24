'use client';

import * as React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MarketCard } from '@/components/markets/market-card';
import { MarketsTable } from '@/components/markets/markets-table';
import { useMarkets } from '@/lib/hooks/use-markets';
import type { MarketStatus } from '@declawd/shared';

const STATUS_OPTIONS: { value: MarketStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'INVALID', label: 'Invalid' },
];

export default function MarketsPage() {
  const [status, setStatus] = React.useState<MarketStatus>('OPEN');
  const [view, setView] = React.useState<'grid' | 'table'>('grid');
  const [page, setPage] = React.useState(1);

  const { data, isLoading } = useMarkets({ status, page, pageSize: 12 });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Markets</h1>
          <p className="text-sm text-muted-foreground">
            BTC prediction markets scanned by the AI agent on Polymarket.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as MarketStatus);
              setPage(1);
            }}
            options={STATUS_OPTIONS}
            className="w-36"
            aria-label="Filter by market status"
          />
          <Tabs value={view} onValueChange={(v) => setView(v as 'grid' | 'table')}>
            <TabsList>
              <TabsTrigger value="grid" aria-label="Grid view">
                <LayoutGrid className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="table" aria-label="Table view">
                <List className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading markets...</p>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.items ?? []).map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
          {data && data.items.length === 0 && (
            <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
              No markets match this filter.
            </p>
          )}
        </div>
      ) : (
        <MarketsTable markets={data?.items ?? []} />
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
