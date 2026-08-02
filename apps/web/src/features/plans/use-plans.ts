import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { Plan } from './types'
import type { PaginationMeta } from '@/features/members/use-members'

interface PlanListParams {
  page: number
  pageSize?: number
  search?: string
  activeOnly?: boolean
}

export function usePlans(params: PlanListParams) {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize ?? 20),
  })
  if (params.search) query.set('search', params.search)
  if (params.activeOnly) query.set('activeOnly', 'true')

  return useQuery({
    queryKey: ['plans', 'list', params],
    queryFn: async () => api.get<{ data: Plan[]; meta: PaginationMeta }>(`/plans?${query.toString()}`),
    placeholderData: (previous) => previous,
  })
}
