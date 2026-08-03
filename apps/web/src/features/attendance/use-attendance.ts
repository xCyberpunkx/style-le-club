import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { AttendanceRecord } from './types'
import type { PaginationMeta } from '@/features/members/use-members'

interface AttendanceListParams {
  page: number
  pageSize?: number
  memberId?: string
  open?: boolean
}

export function useAttendance(params: AttendanceListParams) {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize ?? 20),
  })
  if (params.memberId) query.set('memberId', params.memberId)
  if (params.open) query.set('open', 'true')

  return useQuery({
    queryKey: ['attendance', 'list', params],
    queryFn: async () =>
      api.get<{ data: AttendanceRecord[]; meta: PaginationMeta }>(`/attendance?${query.toString()}`),
    placeholderData: (previous) => previous,
    // The front desk view leans on this being close to live even without
    // websockets (Phase 13) — a short poll while the tab is open beats a
    // manual refresh button for "who's in the club right now."
    refetchInterval: params.open ? 15_000 : false,
  })
}
