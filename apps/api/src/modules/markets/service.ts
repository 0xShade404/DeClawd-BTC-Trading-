import type { AiSignal, Market, MarketStatus, PrismaClient } from '@declawd/database';
import type { AiSignalDto, MarketDto, PaginatedResult } from '@declawd/shared';
import { paginationSkipTake, toPaginatedResult } from '../../lib/pagination';

export async function listMarkets(
  prisma: PrismaClient,
  params: { page: number; pageSize: number; status?: MarketStatus },
): Promise<PaginatedResult<MarketDto>> {
  const where = params.status ? { status: params.status } : {};
  const [markets, total] = await Promise.all([
    prisma.market.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...paginationSkipTake(params.page, params.pageSize),
    }),
    prisma.market.count({ where }),
  ]);

  return toPaginatedResult(markets.map(toMarketDto), params.page, params.pageSize, total);
}

export async function getMarketWithLatestSignal(
  prisma: PrismaClient,
  marketId: string,
): Promise<{ market: MarketDto; latestSignal: AiSignalDto | null } | null> {
  const market = await prisma.market.findUnique({ where: { id: marketId } });
  if (!market) return null;

  const latestSignal = await prisma.aiSignal.findFirst({
    where: { marketId },
    orderBy: { createdAt: 'desc' },
  });

  return {
    market: toMarketDto(market),
    latestSignal: latestSignal ? toAiSignalDto(latestSignal) : null,
  };
}

export function toMarketDto(market: Market): MarketDto {
  const outcomePrices = (market.outcomePrices ?? {}) as { yes?: number | null; no?: number | null };
  return {
    id: market.id,
    provider: market.provider,
    providerMarketId: market.providerMarketId,
    question: market.question,
    category: market.category,
    status: market.status,
    yesPrice: typeof outcomePrices.yes === 'number' ? outcomePrices.yes : null,
    noPrice: typeof outcomePrices.no === 'number' ? outcomePrices.no : null,
    liquidityUsd: market.liquidityUsd ? Number(market.liquidityUsd) : null,
    volume24hUsd: market.volume24hUsd ? Number(market.volume24hUsd) : null,
    spreadBps: market.spreadBps,
    feeBps: market.feeBps,
    closesAt: market.closesAt ? market.closesAt.toISOString() : null,
  };
}

export function toAiSignalDto(signal: AiSignal): AiSignalDto {
  return {
    id: signal.id,
    marketId: signal.marketId,
    confidenceScore: Number(signal.confidenceScore),
    expectedValue: Number(signal.expectedValue),
    suggestedDirection: signal.suggestedDirection,
    riskScore: Number(signal.riskScore),
    suggestedSizeUsd: signal.suggestedSizeUsd ? Number(signal.suggestedSizeUsd) : null,
    reasoning: signal.reasoning,
    createdAt: signal.createdAt.toISOString(),
  };
}
