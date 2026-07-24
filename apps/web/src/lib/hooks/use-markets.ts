import { useQuery } from '@tanstack/react-query';
import type { AiSignalDto, MarketDto, MarketStatus } from '@declawd/shared';
import type { PaginatedResult } from '@declawd/shared';
import { apiGet } from '@/lib/api-client';

export interface UseMarketsParams {
  status?: MarketStatus;
  page?: number;
  pageSize?: number;
}

export function useMarkets({ status = 'OPEN', page = 1, pageSize = 20 }: UseMarketsParams = {}) {
  return useQuery({
    queryKey: ['markets', { status, page, pageSize }],
    queryFn: () =>
      apiGet<PaginatedResult<MarketDto>>('/markets', { status, page, pageSize }),
    refetchInterval: 30_000,
  });
}

export function useMarket(id: string | undefined) {
  return useQuery({
    queryKey: ['market', id],
    queryFn: () => apiGet<MarketDto & { aiSignal?: AiSignalDto }>(`/markets/${id}`),
    enabled: Boolean(id),
  });
}
