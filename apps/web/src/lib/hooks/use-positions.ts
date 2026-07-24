import { useQuery } from '@tanstack/react-query';
import type { PositionDto, PaginatedResult } from '@declawd/shared';
import { apiGet } from '@/lib/api-client';

export interface UsePositionsParams {
  status?: 'open' | 'closed';
  page?: number;
  pageSize?: number;
}

export function usePositions({ status, page = 1, pageSize = 20 }: UsePositionsParams = {}) {
  return useQuery({
    queryKey: ['positions', { status, page, pageSize }],
    queryFn: () => apiGet<PaginatedResult<PositionDto>>('/positions', { status, page, pageSize }),
  });
}
