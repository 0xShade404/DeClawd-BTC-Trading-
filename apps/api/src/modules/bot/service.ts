import type { BotRun, PrismaClient } from '@declawd/database';
import type { PaginatedResult } from '@declawd/shared';
import { TRADING_CYCLE_INTERVAL_MINUTES } from '@declawd/shared';
import { paginationSkipTake, toPaginatedResult } from '../../lib/pagination';

export class BotServiceError extends Error {}

export async function enableBot(prisma: PrismaClient, userId: string): Promise<void> {
  const walletCount = await prisma.wallet.count({ where: { userId } });
  if (walletCount === 0) {
    throw new BotServiceError('Link and verify at least one wallet before enabling the bot');
  }
  await prisma.userSettings.upsert({
    where: { userId },
    update: { botEnabled: true },
    create: { userId, botEnabled: true },
  });
}

export async function disableBot(prisma: PrismaClient, userId: string): Promise<void> {
  await prisma.userSettings.upsert({
    where: { userId },
    update: { botEnabled: false },
    create: { userId, botEnabled: false },
  });
}

export interface BotRunDto {
  id: string;
  status: BotRun['status'];
  marketsScanned: number;
  marketsEligible: number;
  tradesOpened: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export function toBotRunDto(run: BotRun): BotRunDto {
  return {
    id: run.id,
    status: run.status,
    marketsScanned: run.marketsScanned,
    marketsEligible: run.marketsEligible,
    tradesOpened: run.tradesOpened,
    errorMessage: run.errorMessage,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
  };
}

export interface BotStatus {
  botEnabled: boolean;
  lastRun: BotRunDto | null;
  nextScanAt: string;
}

export async function getBotStatus(prisma: PrismaClient, userId: string): Promise<BotStatus> {
  const [settings, lastRun] = await Promise.all([
    prisma.userSettings.upsert({ where: { userId }, update: {}, create: { userId } }),
    prisma.botRun.findFirst({ where: { userId }, orderBy: { startedAt: 'desc' } }),
  ]);

  const anchor = lastRun ? lastRun.startedAt : new Date();
  const nextScanAt = new Date(anchor.getTime() + TRADING_CYCLE_INTERVAL_MINUTES * 60_000);

  return {
    botEnabled: settings.botEnabled,
    lastRun: lastRun ? toBotRunDto(lastRun) : null,
    nextScanAt: nextScanAt.toISOString(),
  };
}

export async function listBotRuns(
  prisma: PrismaClient,
  userId: string,
  params: { page: number; pageSize: number },
): Promise<PaginatedResult<BotRunDto>> {
  const where = { userId };
  const [runs, total] = await Promise.all([
    prisma.botRun.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      ...paginationSkipTake(params.page, params.pageSize),
    }),
    prisma.botRun.count({ where }),
  ]);
  return toPaginatedResult(runs.map(toBotRunDto), params.page, params.pageSize, total);
}
