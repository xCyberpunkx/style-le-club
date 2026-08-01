import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { CurrentUser } from './types'

export const CURRENT_USER_QUERY_KEY = ['auth', 'me'] as const

export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: async () => {
      const res = await api.get<{ data: CurrentUser }>('/auth/me')
      return res.data
    },
    // A 401 here just means "not logged in" — not a transient failure to
    // retry into. apiFetch already tried the silent-refresh dance once;
    // if it still 401s, the session is genuinely gone. Duck-typed on
    // `status` rather than `instanceof ApiError` — immune to any
    // class-identity mismatch across module boundaries.
    retry: (failureCount, error) => {
      const status = error && typeof error === 'object' && 'status' in error ? (error as { status: unknown }).status : null
      if (status === 401) return false
      return failureCount < 2
    },
  })
}
