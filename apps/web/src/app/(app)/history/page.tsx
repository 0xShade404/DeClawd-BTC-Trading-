'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { TradesTable } from '@/components/history/trades-table';
import { useTrades } from '@/lib/hooks/use-trades';

const DIRECTION_OPTIONS = [
  { value: 'ALL', label: 'All directions' },
  { value: 'YES', label: 'YES only' },
  { value: 'NO', label: 'NO only' },
];

export default function HistoryPage() {
  const [page, setPage] = React.useState(1);
  const [direction, setDirection] = React.useState('ALL');
  const { data, isLoading } = useTrades({ page, pageSize: 20 });

  const filtered = React.useMemo(() => {
    const items = data?.items ?? [];
    if (direction === 'ALL') return items;
    return items.filter((t) => t.direction === direction);
  }, [data, direction]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trade history</h1>
          <p className="text-sm text-muted-foreground">
            Every trade DeClawd has executed on your behalf, with the AI's confidence and reasoning.
          </p>
        </div>
        <Select
          value={direction}
          onValueChange={setDirection}
          options={DIRECTION_OPTIONS}
          className="w-44"
          aria-label="Filter by direction"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Loading trades...</p>
          ) : (
            <TradesTable trades={filtered} />
          )}
        </CardContent>
      </Card>

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
