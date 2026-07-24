'use client';

import type { NotificationChannel, NotificationEvent } from '@declawd/shared';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

const TARGET_PLACEHOLDER: Partial<Record<NotificationChannel, string>> = {
  EMAIL: 'you@example.com',
  TELEGRAM: '@yourhandle or chat id',
  DISCORD: 'webhook URL',
};

const NEEDS_TARGET: NotificationChannel[] = ['EMAIL', 'TELEGRAM', 'DISCORD'];

export interface NotificationChannelRowProps {
  channel: NotificationChannel;
  event: NotificationEvent;
  enabled: boolean;
  target: string | null;
  onToggle: (enabled: boolean) => void;
  onTargetChange: (target: string) => void;
  disabled?: boolean;
}

/** One row of the notification matrix: a channel/event pair with an enable toggle and optional target. */
export function NotificationChannelRow({
  channel,
  event,
  enabled,
  target,
  onToggle,
  onTargetChange,
  disabled,
}: NotificationChannelRowProps) {
  const needsTarget = NEEDS_TARGET.includes(channel);

  return (
    <div className="flex flex-col gap-3 border-b border-white/5 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-medium">{formatEvent(event)}</div>
        <div className="text-xs text-muted-foreground">{channel}</div>
      </div>
      <div className="flex items-center gap-3">
        {needsTarget && enabled && (
          <Input
            value={target ?? ''}
            placeholder={TARGET_PLACEHOLDER[channel]}
            onChange={(e) => onTargetChange(e.target.value)}
            disabled={disabled}
            className="h-9 w-48"
          />
        )}
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          disabled={disabled}
          aria-label={`Toggle ${channel} notifications for ${event}`}
        />
      </div>
    </div>
  );
}

function formatEvent(event: NotificationEvent): string {
  return event
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
