import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { CURRENT_USER_QUERY_KEY } from './use-current-user'

interface LoginInput {
  email: string
  password: string
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: LoginInput) => api.post<{ data: { loggedIn: true } }>('/auth/login', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY })
    },
  })
}
