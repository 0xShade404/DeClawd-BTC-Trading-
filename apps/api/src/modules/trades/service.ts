import type { Market, Position, PrismaClient, Trade } from '@declawd/database';
import type { PaginatedResult, TradeDto } from '@declawd/shared';
import { paginationSkipTake, toPaginatedResult } from '../../lib/pagination';

export type TradeWithRelations = Trade & { position: Position & { market: Market } };

export async function listTrades(
  prisma: PrismaClient,
  userId: string,
  params: { page: number; pageSize: number },
): Promise<PaginatedResult<TradeDto>> {
  const where = { userId };
  const [trades, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      include: { position: { include: { market: true } } },
      orderBy: { executedAt: 'desc' },
      ...paginationSkipTake(params.page, params.pageSize),
    }),
    prisma.trade.count({ where }),
  ]);

  return toPaginatedResult(trades.map(toTradeDto), params.page, params.pageSize, total);
}

export function toTradeDto(trade: TradeWithRelations): TradeDto {
  return {
    id: trade.id,
    positionId: trade.positionId,
    marketQuestion: trade.position.market.question,
    direction: trade.direction,
    side: trade.side as 'OPEN' | 'CLOSE',
    price: Number(trade.price),
    sizeUsd: Number(trade.sizeUsd),
    feesUsd: Number(trade.feesUsd),
    pnlUsd: trade.pnlUsd ? Number(trade.pnlUsd) : null,
    confidenceScore: trade.confidenceScore ? Number(trade.confidenceScore) : null,
    reasoning: trade.reasoning,
    executedAt: trade.executedAt.toISOString(),
  };
}
