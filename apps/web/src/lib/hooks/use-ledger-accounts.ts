import { useQuery } from '@tanstack/react-query';
import type { LedgerAccountDto } from '@declawd/shared';
import { apiGet } from '@/lib/api-client';

export function useLedgerAccounts() {
  return useQuery({
    queryKey: ['ledger-accounts'],
    queryFn: () => apiGet<LedgerAccountDto[]>('/ledger/accounts'),
  });
}
