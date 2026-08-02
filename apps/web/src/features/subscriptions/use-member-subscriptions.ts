import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { Subscription } from './types'
import type { PaginationMeta } from '@/features/members/use-members'

export function useMemberSubscriptions(memberId: string | undefined) {
  return useQuery({
    queryKey: ['subscriptions', 'list', { memberId }],
    queryFn: async () => {
      const query = new URLSearchParams({ page: '1', pageSize: '50', memberId: memberId ?? '' })
      return api.get<{ data: Subscription[]; meta: PaginationMeta }>(`/subscriptions?${query.toString()}`)
    },
    enabled: Boolean(memberId),
  })
}
