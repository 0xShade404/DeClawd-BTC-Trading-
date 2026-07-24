import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserSettingsDto, UpdateSettingsInput } from '@declawd/shared';
import { apiGet, apiPatch } from '@/lib/api-client';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => apiGet<UserSettingsDto>('/settings'),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSettingsInput) => apiPatch<UserSettingsDto>('/settings', input),
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['bot-status'] });
    },
  });
}
