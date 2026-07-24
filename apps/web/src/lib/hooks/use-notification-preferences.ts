import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationPreferenceDto, UpdateNotificationPreferenceInput } from '@declawd/shared';
import { apiGet, apiPatch } from '@/lib/api-client';

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => apiGet<NotificationPreferenceDto[]>('/settings/notifications'),
  });
}

export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateNotificationPreferenceInput) =>
      apiPatch<NotificationPreferenceDto>('/settings/notifications', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
}
