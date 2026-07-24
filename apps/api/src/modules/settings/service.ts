import type { PrismaClient, UserSettings, NotificationPreference } from '@declawd/database';
import type {
  NotificationPreferenceDto,
  UpdateNotificationPreferenceInput,
  UpdateSettingsInput,
  UserSettingsDto,
} from '@declawd/shared';
import { ErrorCode } from '@declawd/shared';
import { ApiError } from '../../plugins/error-handler';

export async function getOrCreateSettings(prisma: PrismaClient, userId: string): Promise<UserSettings> {
  return prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

const ALLOCATION_TOLERANCE = 0.01;

export async function updateSettings(
  prisma: PrismaClient,
  userId: string,
  input: UpdateSettingsInput,
): Promise<UserSettings> {
  const existing = await getOrCreateSettings(prisma, userId);

  const nextVault = input.vaultAllocationPct ?? Number(existing.vaultAllocationPct);
  const nextPool = input.tradingPoolAllocationPct ?? Number(existing.tradingPoolAllocationPct);
  const touchesAllocation = input.vaultAllocationPct !== undefined || input.tradingPoolAllocationPct !== undefined;

  if (touchesAllocation && Math.abs(nextVault + nextPool - 100) > ALLOCATION_TOLERANCE) {
    throw new ApiError(
      ErrorCode.VALIDATION_ERROR,
      `vaultAllocationPct (${nextVault}) + tradingPoolAllocationPct (${nextPool}) must sum to 100`,
    );
  }

  return prisma.userSettings.update({
    where: { userId },
    data: {
      botEnabled: input.botEnabled,
      riskPct: input.riskPct,
      maxDailyLossUsd: input.maxDailyLossUsd,
      maxTradeSizeUsd: input.maxTradeSizeUsd,
      aiAggressiveness: input.aiAggressiveness,
      autoCompound: input.autoCompound,
      tradingScheduleMode: input.tradingScheduleMode,
      tradingScheduleCron: input.tradingScheduleCron,
      vaultAllocationPct: input.vaultAllocationPct,
      tradingPoolAllocationPct: input.tradingPoolAllocationPct,
    },
  });
}

export function toUserSettingsDto(settings: UserSettings): UserSettingsDto {
  return {
    botEnabled: settings.botEnabled,
    riskPct: Number(settings.riskPct),
    maxDailyLossUsd: Number(settings.maxDailyLossUsd),
    maxTradeSizeUsd: Number(settings.maxTradeSizeUsd),
    aiAggressiveness: settings.aiAggressiveness,
    autoCompound: settings.autoCompound,
    tradingScheduleMode: settings.tradingScheduleMode,
    tradingScheduleCron: settings.tradingScheduleCron,
    vaultAllocationPct: Number(settings.vaultAllocationPct),
    tradingPoolAllocationPct: Number(settings.tradingPoolAllocationPct),
  };
}

export async function listNotificationPreferences(
  prisma: PrismaClient,
  userId: string,
): Promise<NotificationPreferenceDto[]> {
  const prefs = await prisma.notificationPreference.findMany({ where: { userId } });
  return prefs.map(toNotificationPreferenceDto);
}

export async function upsertNotificationPreference(
  prisma: PrismaClient,
  userId: string,
  input: UpdateNotificationPreferenceInput,
): Promise<NotificationPreference> {
  return prisma.notificationPreference.upsert({
    where: { userId_channel_event: { userId, channel: input.channel, event: input.event } },
    update: { enabled: input.enabled, target: input.target },
    create: {
      userId,
      channel: input.channel,
      event: input.event,
      enabled: input.enabled,
      target: input.target,
    },
  });
}

export function toNotificationPreferenceDto(pref: NotificationPreference): NotificationPreferenceDto {
  return {
    channel: pref.channel,
    event: pref.event,
    enabled: pref.enabled,
    target: pref.target,
  };
}
