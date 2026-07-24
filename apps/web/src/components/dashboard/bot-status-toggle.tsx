'use client';

import { Bot } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CountdownTimer } from '@/components/dashboard/countdown-timer';
import { useBotStatus, useEnableBot, useDisableBot } from '@/lib/hooks/use-bot';
import { formatRelativeTime } from '@/lib/utils';

export function BotStatusToggle() {
  const { data: status, isLoading } = useBotStatus();
  const enableBot = useEnableBot();
  const disableBot = useDisableBot();

  const busy = enableBot.isPending || disableBot.isPending;
  const enabled = status?.botEnabled ?? false;

  function handleToggle(next: boolean) {
    if (next) {
      enableBot.mutate();
    } else {
      disableBot.mutate();
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bitcoin-500/15 text-bitcoin-500">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">AI trading agent</span>
              <Badge variant={enabled ? 'success' : 'secondary'}>
                {enabled ? 'Running' : 'Paused'}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isLoading
                ? 'Loading status...'
                : status?.lastRun
                  ? `Last scan ${formatRelativeTime(status.lastRun)}`
                  : 'No scans yet'}
              {enabled && status?.nextScanAt ? (
                <>
                  {' '}
                  &middot; next scan in <CountdownTimer target={status.nextScanAt} />
                </>
              ) : null}
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={isLoading || busy}
          aria-label="Toggle AI trading agent"
        />
      </CardContent>
    </Card>
  );
}
