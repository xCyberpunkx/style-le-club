import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { CURRENT_USER_QUERY_KEY } from './use-current-user'

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.post<{ data: { loggedOut: true } }>('/auth/logout'),
    onSuccess: () => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, null)
    },
  })
}
