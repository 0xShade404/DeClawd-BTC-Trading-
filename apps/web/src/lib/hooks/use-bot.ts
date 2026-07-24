import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginatedResult } from '@declawd/shared';
import { apiGet, apiPost } from '@/lib/api-client';

export interface BotStatus {
  botEnabled: boolean;
  lastRun: string | null;
  nextScanAt: string | null;
}

export interface BotRun {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  marketsScanned: number;
  tradesOpened: number;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  error: string | null;
}

export function useBotStatus() {
  return useQuery({
    queryKey: ['bot-status'],
    queryFn: () => apiGet<BotStatus>('/bot/status'),
    refetchInterval: 15_000,
  });
}

export function useBotRuns({ page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {}) {
  return useQuery({
    queryKey: ['bot-runs', { page, pageSize }],
    queryFn: () => apiGet<PaginatedResult<BotRun>>('/bot/runs', { page, pageSize }),
  });
}

export function useEnableBot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<{ botEnabled: boolean }>('/bot/enable'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bot-status'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useDisableBot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<{ botEnabled: boolean }>('/bot/disable'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bot-status'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
