'use client';

import * as React from 'react';
import type { AiAggressiveness, NotificationPreferenceDto, TradingScheduleMode } from '@declawd/shared';
import { RISK_LIMITS } from '@declawd/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RiskSlider } from '@/components/settings/risk-slider';
import { AggressivenessSelector } from '@/components/settings/aggressiveness-selector';
import { NotificationChannelRow } from '@/components/settings/notification-channel-row';
import { useSettings, useUpdateSettings } from '@/lib/hooks/use-settings';
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from '@/lib/hooks/use-notification-preferences';
import { formatPercent } from '@/lib/utils';

const SCHEDULE_OPTIONS: { value: TradingScheduleMode; label: string }[] = [
  { value: 'ALWAYS_ON', label: 'Always on' },
  { value: 'MARKET_HOURS', label: 'Market hours only' },
  { value: 'CUSTOM', label: 'Custom (cron)' },
];

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: preferences } = useNotificationPreferences();
  const updatePreference = useUpdateNotificationPreference();

  const [riskPct, setRiskPct] = React.useState(1);
  const [maxDailyLossUsd, setMaxDailyLossUsd] = React.useState('');
  const [maxTradeSizeUsd, setMaxTradeSizeUsd] = React.useState('');
  const [aiAggressiveness, setAiAggressiveness] = React.useState<AiAggressiveness>('BALANCED');
  const [autoCompound, setAutoCompound] = React.useState(false);
  const [tradingScheduleMode, setTradingScheduleMode] = React.useState<TradingScheduleMode>('ALWAYS_ON');
  const [tradingScheduleCron, setTradingScheduleCron] = React.useState('');

  React.useEffect(() => {
    if (!settings) return;
    setRiskPct(settings.riskPct);
    setMaxDailyLossUsd(String(settings.maxDailyLossUsd));
    setMaxTradeSizeUsd(String(settings.maxTradeSizeUsd));
    setAiAggressiveness(settings.aiAggressiveness);
    setAutoCompound(settings.autoCompound);
    setTradingScheduleMode(settings.tradingScheduleMode);
    setTradingScheduleCron(settings.tradingScheduleCron ?? '');
  }, [settings]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateSettings.mutate({
      riskPct,
      maxDailyLossUsd: Number(maxDailyLossUsd),
      maxTradeSizeUsd: Number(maxTradeSizeUsd),
      aiAggressiveness,
      autoCompound,
      tradingScheduleMode,
      tradingScheduleCron: tradingScheduleMode === 'CUSTOM' ? tradingScheduleCron : undefined,
    });
  }

  const preferencesByChannel = React.useMemo(() => {
    const map = new Map<string, NotificationPreferenceDto[]>();
    for (const pref of preferences ?? []) {
      const list = map.get(pref.channel) ?? [];
      list.push(pref);
      map.set(pref.channel, list);
    }
    return map;
  }, [preferences]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure how the AI agent trades and how you're notified.
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Risk controls</CardTitle>
            <CardDescription>Bounds the AI agent must respect on every trade.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <RiskSlider
              id="riskPct"
              label="Risk per trade"
              value={riskPct}
              min={RISK_LIMITS.MIN_RISK_PCT}
              max={RISK_LIMITS.MAX_RISK_PCT}
              step={0.5}
              onChange={setRiskPct}
              formatValue={(v) => formatPercent(v)}
              disabled={isLoading}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="maxDailyLoss" className="text-sm font-medium">
                  Max daily loss (USD)
                </label>
                <Input
                  id="maxDailyLoss"
                  type="number"
                  min={0}
                  value={maxDailyLossUsd}
                  onChange={(e) => setMaxDailyLossUsd(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="maxTradeSize" className="text-sm font-medium">
                  Max trade size (USD)
                </label>
                <Input
                  id="maxTradeSize"
                  type="number"
                  min={RISK_LIMITS.MIN_TRADE_SIZE_USD}
                  max={RISK_LIMITS.MAX_TRADE_SIZE_USD}
                  value={maxTradeSizeUsd}
                  onChange={(e) => setMaxTradeSizeUsd(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">AI aggressiveness</span>
              <AggressivenessSelector
                value={aiAggressiveness}
                onChange={setAiAggressiveness}
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Auto-compound</div>
                <p className="text-xs text-muted-foreground">
                  Reinvest trading pool profit automatically instead of holding it as cash.
                </p>
              </div>
              <Switch
                checked={autoCompound}
                onCheckedChange={setAutoCompound}
                disabled={isLoading}
                aria-label="Toggle auto-compound"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="scheduleMode" className="text-sm font-medium">
                Trading schedule
              </label>
              <Select
                id="scheduleMode"
                value={tradingScheduleMode}
                onValueChange={(v) => setTradingScheduleMode(v as TradingScheduleMode)}
                options={SCHEDULE_OPTIONS}
                disabled={isLoading}
              />
              {tradingScheduleMode === 'CUSTOM' && (
                <Input
                  className="mt-2"
                  placeholder="*/15 * * * *"
                  value={tradingScheduleCron}
                  onChange={(e) => setTradingScheduleCron(e.target.value)}
                  disabled={isLoading}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={isLoading || updateSettings.isPending} className="w-fit">
          {updateSettings.isPending ? 'Saving...' : 'Save settings'}
        </Button>
        {updateSettings.isSuccess && (
          <p className="text-sm text-success">Settings saved.</p>
        )}
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Choose how you want to hear about trades and bot activity.</CardDescription>
        </CardHeader>
        <CardContent>
          {!preferences || preferences.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notification preferences configured yet.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {Array.from(preferencesByChannel.entries()).map(([channel, rows]) => (
                <div key={channel}>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {channel.replace('_', ' ')}
                  </h3>
                  <div>
                    {rows.map((pref) => (
                      <NotificationChannelRow
                        key={`${pref.channel}-${pref.event}`}
                        channel={pref.channel}
                        event={pref.event}
                        enabled={pref.enabled}
                        target={pref.target}
                        disabled={updatePreference.isPending}
                        onToggle={(enabled) =>
                          updatePreference.mutate({
                            channel: pref.channel,
                            event: pref.event,
                            enabled,
                            target: pref.target ?? undefined,
                          })
                        }
                        onTargetChange={(target) =>
                          updatePreference.mutate({
                            channel: pref.channel,
                            event: pref.event,
                            enabled: pref.enabled,
                            target,
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
