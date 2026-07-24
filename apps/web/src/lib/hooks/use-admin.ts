import { useQuery } from '@tanstack/react-query';
import type { AdminPlatformMetricsDto, PositionDto, UserDto, PaginatedResult } from '@declawd/shared';
import { apiGet } from '@/lib/api-client';

export interface AdminLogEntry {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  context: Record<string, unknown> | null;
  createdAt: string;
}

export interface AdminHealthCheck {
  service: string;
  status: 'ok' | 'degraded' | 'down';
  latencyMs: number | null;
  message: string | null;
}

export function useAdminMetrics() {
  return useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => apiGet<AdminPlatformMetricsDto>('/admin/metrics'),
    refetchInterval: 30_000,
  });
}

export function useAdminUsers({ page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {}) {
  return useQuery({
    queryKey: ['admin-users', { page, pageSize }],
    queryFn: () => apiGet<PaginatedResult<UserDto>>('/admin/users', { page, pageSize }),
  });
}

export function useAdminPositions({ page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {}) {
  return useQuery({
    queryKey: ['admin-positions', { page, pageSize }],
    queryFn: () => apiGet<PaginatedResult<PositionDto>>('/admin/positions', { page, pageSize }),
  });
}

export function useAdminLogs({ page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {}) {
  return useQuery({
    queryKey: ['admin-logs', { page, pageSize }],
    queryFn: () => apiGet<PaginatedResult<AdminLogEntry>>('/admin/logs', { page, pageSize }),
  });
}

export function useAdminHealth() {
  return useQuery({
    queryKey: ['admin-health'],
    queryFn: () => apiGet<AdminHealthCheck[]>('/admin/health'),
    refetchInterval: 20_000,
  });
}
