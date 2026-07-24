import { useQuery } from '@tanstack/react-query';
import type { TradeDto, PaginatedResult } from '@declawd/shared';
import { apiGet } from '@/lib/api-client';

export interface UseTradesParams {
  page?: number;
  pageSize?: number;
}

export function useTrades({ page = 1, pageSize = 20 }: UseTradesParams = {}) {
  return useQuery({
    queryKey: ['trades', { page, pageSize }],
    queryFn: () => apiGet<PaginatedResult<TradeDto>>('/trades', { page, pageSize }),
  });
}
