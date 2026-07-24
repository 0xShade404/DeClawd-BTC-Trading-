import { z } from 'zod';
import { RISK_LIMITS } from '../constants';

export const updateSettingsSchema = z.object({
  botEnabled: z.boolean().optional(),
  riskPct: z.number().min(RISK_LIMITS.MIN_RISK_PCT).max(RISK_LIMITS.MAX_RISK_PCT).optional(),
  maxDailyLossUsd: z.number().min(0).optional(),
  maxTradeSizeUsd: z
    .number()
    .min(RISK_LIMITS.MIN_TRADE_SIZE_USD)
    .max(RISK_LIMITS.MAX_TRADE_SIZE_USD)
    .optional(),
  aiAggressiveness: z.enum(['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE']).optional(),
  autoCompound: z.boolean().optional(),
  tradingScheduleMode: z.enum(['ALWAYS_ON', 'MARKET_HOURS', 'CUSTOM']).optional(),
  tradingScheduleCron: z.string().optional(),
  vaultAllocationPct: z.number().min(0).max(100).optional(),
  tradingPoolAllocationPct: z.number().min(0).max(100).optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const updateNotificationPreferenceSchema = z.object({
  channel: z.enum(['EMAIL', 'TELEGRAM', 'DISCORD', 'BROWSER_PUSH']),
  event: z.enum([
    'TRADE_OPENED',
    'TRADE_CLOSED',
    'LARGE_PROFIT',
    'LARGE_LOSS',
    'BOT_STOPPED',
    'BOT_STARTED',
    'ERROR',
    'WITHDRAWAL_COMPLETED',
  ]),
  enabled: z.boolean(),
  target: z.string().optional(),
});
export type UpdateNotificationPreferenceInput = z.infer<typeof updateNotificationPreferenceSchema>;
