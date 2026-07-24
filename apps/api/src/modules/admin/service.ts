import type { AuditLog, PrismaClient } from '@declawd/database';
import type { AdminPlatformMetricsDto, PaginatedResult, PositionDto, UserDto } from '@declawd/shared';
import { paginationSkipTake, toPaginatedResult } from '../../lib/pagination';
import { toUserDto } from '../auth/service';
import { toPositionDto } from '../positions/service';
import { isRedisConnected } from '../../lib/redis';
import { env } from '../../config/env';

export async function listUsers(
  prisma: PrismaClient,
  params: { page: number; pageSize: number },
): Promise<PaginatedResult<UserDto>> {
  const [users, total] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, ...paginationSkipTake(params.page, params.pageSize) }),
    prisma.user.count(),
  ]);
  return toPaginatedResult(users.map(toUserDto), params.page, params.pageSize, total);
}

export async function getPlatformMetrics(prisma: PrismaClient): Promise<AdminPlatformMetricsDto> {
  const [totalUsers, activeBots, volumeAgg, vaultAgg, poolAgg, openPositions, closedPositions, feesAgg] =
    await Promise.all([
      prisma.user.count(),
      prisma.userSettings.count({ where: { botEnabled: true } }),
      prisma.trade.aggregate({ _sum: { sizeUsd: true } }),
      prisma.ledgerAccount.aggregate({ where: { type: 'PROTECTED_VAULT' }, _sum: { balance: true } }),
      prisma.ledgerAccount.aggregate({ where: { type: 'TRADING_POOL' }, _sum: { balance: true } }),
      prisma.position.count({ where: { status: { in: ['PENDING', 'OPEN', 'CLOSING'] } } }),
      prisma.position.count({ where: { status: 'SETTLED' } }),
      prisma.trade.aggregate({ _sum: { feesUsd: true } }),
    ]);

  return {
    totalUsers,
    activeBots,
    totalVolumeUsd: Number(volumeAgg._sum.sizeUsd ?? 0),
    totalVaultUsd: Number(vaultAgg._sum.balance ?? 0),
    totalTradingPoolUsd: Number(poolAgg._sum.balance ?? 0),
    openPositions,
    closedPositions,
    revenueUsd: Number(feesAgg._sum.feesUsd ?? 0),
    capturedAt: new Date().toISOString(),
  };
}

export interface AdminPositionDto extends PositionDto {
  userId: string;
  userEmail: string;
}

export async function listAllPositions(
  prisma: PrismaClient,
  params: { page: number; pageSize: number; status?: 'open' | 'closed' },
): Promise<PaginatedResult<AdminPositionDto>> {
  const OPEN = ['PENDING', 'OPEN', 'CLOSING'] as const;
  const CLOSED = ['SETTLED', 'CANCELLED', 'FAILED'] as const;
  const statusFilter = params.status === 'open' ? OPEN : params.status === 'closed' ? CLOSED : undefined;
  const where = statusFilter ? { status: { in: statusFilter } } : {};

  const [positions, total] = await Promise.all([
    prisma.position.findMany({
      where,
      include: { market: true, settlement: true, user: true },
      orderBy: { openedAt: 'desc' },
      ...paginationSkipTake(params.page, params.pageSize),
    }),
    prisma.position.count({ where }),
  ]);

  const dtos = positions.map((p) => ({
    ...toPositionDto(p),
    userId: p.userId,
    userEmail: p.user.email,
  }));

  return toPaginatedResult(dtos, params.page, params.pageSize, total);
}

export interface AuditLogDto {
  id: string;
  actorType: AuditLog['actorType'];
  actorId: string | null;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export async function listAuditLogs(
  prisma: PrismaClient,
  params: { page: number; pageSize: number },
): Promise<PaginatedResult<AuditLogDto>> {
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, ...paginationSkipTake(params.page, params.pageSize) }),
    prisma.auditLog.count(),
  ]);

  const dtos: AuditLogDto[] = logs.map((log) => ({
    id: log.id,
    actorType: log.actorType,
    actorId: log.actorId,
    userId: log.userId,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    metadata: log.metadata,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt.toISOString(),
  }));

  return toPaginatedResult(dtos, params.page, params.pageSize, total);
}

export interface AdminHealthReport {
  dbConnected: boolean;
  redisConnected: boolean;
  tradingEngineEnabled: boolean;
  tradingCycleCron: string;
}

export async function getAdminHealth(prisma: PrismaClient): Promise<AdminHealthReport> {
  let dbConnected = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbConnected = false;
  }

  return {
    dbConnected,
    redisConnected: await isRedisConnected(),
    tradingEngineEnabled: env.TRADING_ENGINE_ENABLED,
    tradingCycleCron: env.TRADING_CYCLE_CRON,
  };
}
