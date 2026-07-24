import type { Position, PositionStatus, PrismaClient, Settlement, Market } from '@declawd/database';
import type { PaginatedResult, PositionDto } from '@declawd/shared';
import { paginationSkipTake, toPaginatedResult } from '../../lib/pagination';

const OPEN_STATUSES: PositionStatus[] = ['PENDING', 'OPEN', 'CLOSING'];
const CLOSED_STATUSES: PositionStatus[] = ['SETTLED', 'CANCELLED', 'FAILED'];

export type PositionWithRelations = Position & { market: Market; settlement: Settlement | null };

export async function listPositions(
  prisma: PrismaClient,
  userId: string,
  params: { page: number; pageSize: number; status?: 'open' | 'closed' },
): Promise<PaginatedResult<PositionDto>> {
  const statusFilter =
    params.status === 'open' ? OPEN_STATUSES : params.status === 'closed' ? CLOSED_STATUSES : undefined;

  const where = { userId, ...(statusFilter ? { status: { in: statusFilter } } : {}) };

  const [positions, total] = await Promise.all([
    prisma.position.findMany({
      where,
      include: { market: true, settlement: true },
      orderBy: { openedAt: 'desc' },
      ...paginationSkipTake(params.page, params.pageSize),
    }),
    prisma.position.count({ where }),
  ]);

  return toPaginatedResult(positions.map(toPositionDto), params.page, params.pageSize, total);
}

export function toPositionDto(position: PositionWithRelations): PositionDto {
  return {
    id: position.id,
    marketId: position.marketId,
    marketQuestion: position.market.question,
    direction: position.direction,
    status: position.status,
    entryPrice: Number(position.entryPrice),
    exitPrice: position.exitPrice ? Number(position.exitPrice) : null,
    sizeUsd: Number(position.sizeUsd),
    feesUsd: Number(position.feesUsd),
    realizedPnlUsd: position.realizedPnlUsd ? Number(position.realizedPnlUsd) : null,
    confidenceScore: position.confidenceScore ? Number(position.confidenceScore) : null,
    reasoning: position.reasoning,
    settlementStatus: position.settlement?.status ?? null,
    openedAt: position.openedAt.toISOString(),
    closedAt: position.closedAt ? position.closedAt.toISOString() : null,
  };
}
