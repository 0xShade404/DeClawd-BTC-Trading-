import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WithdrawalDto, PaginatedResult, CreateWithdrawalInput } from '@declawd/shared';
import { apiGet, apiPost } from '@/lib/api-client';

export interface UseWithdrawalsParams {
  page?: number;
  pageSize?: number;
}

export function useWithdrawals({ page = 1, pageSize = 20 }: UseWithdrawalsParams = {}) {
  return useQuery({
    queryKey: ['withdrawals', { page, pageSize }],
    queryFn: () => apiGet<PaginatedResult<WithdrawalDto>>('/withdrawals', { page, pageSize }),
  });
}

export function useCreateWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWithdrawalInput) => apiPost<WithdrawalDto>('/withdrawals', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      void queryClient.invalidateQueries({ queryKey: ['ledger-accounts'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}
