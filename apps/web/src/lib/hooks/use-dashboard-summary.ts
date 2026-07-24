import { useQuery } from '@tanstack/react-query';
import type { DashboardSummaryDto } from '@declawd/shared';
import { apiGet } from '@/lib/api-client';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => apiGet<DashboardSummaryDto>('/dashboard/summary'),
    refetchInterval: 30_000,
  });
}
