import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { Member } from './types'

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface MemberListParams {
  page: number
  pageSize?: number
  search?: string
}

export const MEMBERS_QUERY_KEY = (params: MemberListParams) => ['members', 'list', params] as const

export function useMembers(params: MemberListParams) {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize ?? 20),
  })
  if (params.search) query.set('search', params.search)

  return useQuery({
    queryKey: MEMBERS_QUERY_KEY(params),
    queryFn: async () => {
      return api.get<{ data: Member[]; meta: PaginationMeta }>(`/members?${query.toString()}`)
    },
    // Keeps the previous page's rows on screen while the next page loads,
    // instead of flashing an empty table between pages/searches.
    placeholderData: (previous) => previous,
  })
}
