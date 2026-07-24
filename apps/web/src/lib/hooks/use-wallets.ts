import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WalletDto, LinkWalletInput } from '@declawd/shared';
import { apiDelete, apiGet, apiPost } from '@/lib/api-client';

export function useWallets() {
  return useQuery({
    queryKey: ['wallets'],
    queryFn: () => apiGet<WalletDto[]>('/wallet'),
  });
}

export function useWalletNonce() {
  return useMutation({
    mutationFn: (address: string) => apiPost<{ message: string }>('/wallet/nonce', { address }),
  });
}

export function useLinkWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LinkWalletInput) => apiPost<WalletDto>('/wallet/link', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
  });
}

export function useDeleteWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/wallet/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
  });
}
