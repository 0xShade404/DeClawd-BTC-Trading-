import { createPublicClient, formatUnits, http, type Address } from 'viem';
import { polygon } from 'viem/chains';
import type { PrismaClient } from '@declawd/database';
import type { DashboardSummaryDto } from '@declawd/shared';
import { USDC_DECIMALS } from '@declawd/shared';
import { env } from '../../config/env';
import { getBotStatus } from '../bot/service';
import { toPositionDto } from '../positions/service';

const ERC20_BALANCE_OF_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

/**
 * Reads the caller's primary wallet's on-chain USDC balance via a public
 * Polygon RPC. Best-effort: returns null (rather than throwing) if no
 * wallet is linked or the RPC call fails, since this is a supplementary
 * figure and shouldn't break the whole dashboard.
 */
async function getOnChainWalletBalanceUsd(prisma: PrismaClient, userId: string): Promise<number | null> {
  const wallet = await prisma.wallet.findFirst({ where: { userId, isPrimary: true } });
  if (!wallet) return null;

  try {
    const client = createPublicClient({ chain: polygon, transport: http(env.POLYGON_RPC_URL) });
    const balance = await client.readContract({
      address: env.USDC_CONTRACT_ADDRESS as Address,
      abi: ERC20_BALANCE_OF_ABI,
      functionName: 'balanceOf',
      args: [wallet.address as Address],
    });
    return Number(formatUnits(balance, USDC_DECIMALS));
  } catch {
    return null;
  }
}

function startOfDay(daysAgo: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

async function sumRealizedPnlSince(prisma: PrismaClient, userId: string, since: Date): Promise<number> {
  const result = await prisma.position.aggregate({
    where: { userId, status: 'SETTLED', closedAt: { gte: since } },
    _sum: { realizedPnlUsd: true },
  });
  return Number(result._sum.realizedPnlUsd ?? 0);
}

/**
 * Sharpe-style ratio computed from the user's actual daily realized P&L
 * history (grouped by day, normalized against the current trading pool
 * balance as a proxy capital base - there is no stored daily equity curve
 * to compute true percentage returns against). Returns 0 rather than a
 * fabricated value when fewer than 2 distinct days of settled trades exist,
 * since a standard deviation over 0-1 points is meaningless.
 */
async function computeSharpeRatio(prisma: PrismaClient, userId: string, tradingPoolBalanceUsd: number): Promise<number> {
  const settled = await prisma.position.findMany({
    where: { userId, status: 'SETTLED', closedAt: { not: null } },
    select: { closedAt: true, realizedPnlUsd: true },
  });
  if (settled.length === 0 || tradingPoolBalanceUsd <= 0) return 0;

  const dailyPnl = new Map<string, number>();
  for (const position of settled) {
    const day = position.closedAt!.toISOString().slice(0, 10);
    dailyPnl.set(day, (dailyPnl.get(day) ?? 0) + Number(position.realizedPnlUsd ?? 0));
  }

  if (dailyPnl.size < 2) return 0;

  const dailyReturns = Array.from(dailyPnl.values()).map((pnl) => pnl / tradingPoolBalanceUsd);
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (dailyReturns.length - 1);
  const stddev = Math.sqrt(variance);

  if (stddev === 0) return 0;
  return Number(((mean / stddev) * Math.sqrt(365)).toFixed(4));
}

export async function getDashboardSummary(prisma: PrismaClient, userId: string): Promise<DashboardSummaryDto> {
  const [tradingPool, vault, openPositions, settings, botStatus, walletBalanceUsd] = await Promise.all([
    prisma.ledgerAccount.upsert({
      where: { userId_type: { userId, type: 'TRADING_POOL' } },
      update: {},
      create: { userId, type: 'TRADING_POOL' },
    }),
    prisma.ledgerAccount.upsert({
      where: { userId_type: { userId, type: 'PROTECTED_VAULT' } },
      update: {},
      create: { userId, type: 'PROTECTED_VAULT' },
    }),
    prisma.position.findMany({
      where: { userId, status: { in: ['PENDING', 'OPEN', 'CLOSING'] } },
      include: { market: true, settlement: true },
      orderBy: { openedAt: 'desc' },
    }),
    prisma.userSettings.upsert({ where: { userId }, update: {}, create: { userId } }),
    getBotStatus(prisma, userId),
    getOnChainWalletBalanceUsd(prisma, userId),
  ]);

  const [dailyProfitUsd, weeklyProfitUsd, monthlyProfitUsd] = await Promise.all([
    sumRealizedPnlSince(prisma, userId, startOfDay(0)),
    sumRealizedPnlSince(prisma, userId, startOfDay(7)),
    sumRealizedPnlSince(prisma, userId, startOfDay(30)),
  ]);

  const [totalDepositedResult, totalRealizedResult, settlementCounts] = await Promise.all([
    prisma.ledgerEntry.aggregate({
      where: { userId, type: 'DEPOSIT' },
      _sum: { amount: true },
    }),
    prisma.position.aggregate({
      where: { userId, status: 'SETTLED' },
      _sum: { realizedPnlUsd: true },
    }),
    prisma.settlement.groupBy({
      by: ['status'],
      where: { position: { userId }, status: { in: ['WON', 'LOST'] } },
      _count: { _all: true },
    }),
  ]);

  const totalDepositedUsd = Number(totalDepositedResult._sum.amount ?? 0);
  const totalRealizedPnlUsd = Number(totalRealizedResult._sum.realizedPnlUsd ?? 0);
  const roiPct = totalDepositedUsd > 0 ? Number(((totalRealizedPnlUsd / totalDepositedUsd) * 100).toFixed(4)) : 0;

  const wins = settlementCounts.find((s) => s.status === 'WON')?._count._all ?? 0;
  const totalDecided = settlementCounts.reduce((sum, s) => sum + s._count._all, 0);
  const winRatePct = totalDecided > 0 ? Number(((wins / totalDecided) * 100).toFixed(2)) : 0;

  const sharpeRatio = await computeSharpeRatio(prisma, userId, Number(tradingPool.balance));

  return {
    walletBalanceUsd,
    tradingPoolUsd: Number(tradingPool.balance),
    protectedVaultUsd: Number(vault.balance),
    openPositions: openPositions.map(toPositionDto),
    dailyProfitUsd,
    weeklyProfitUsd,
    monthlyProfitUsd,
    roiPct,
    winRatePct,
    sharpeRatio,
    botEnabled: settings.botEnabled,
    nextScanAt: botStatus.nextScanAt,
  };
}
