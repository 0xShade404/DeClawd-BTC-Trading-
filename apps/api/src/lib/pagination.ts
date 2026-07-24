import type { PaginatedResult } from '@declawd/shared';

export function toPaginatedResult<T>(items: T[], page: number, pageSize: number, total: number): PaginatedResult<T> {
  return {
    items,
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

export function paginationSkipTake(page: number, pageSize: number): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}
