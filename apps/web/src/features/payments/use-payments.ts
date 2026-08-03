import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { Payment, PaymentMethod, PaymentStatus } from './types'
import type { PaginationMeta } from '@/features/members/use-members'

interface PaymentListParams {
  page: number
  pageSize?: number
  memberId?: string
  subscriptionId?: string
  status?: PaymentStatus
  method?: PaymentMethod
}

export function usePayments(params: PaymentListParams) {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize ?? 20),
  })
  if (params.memberId) query.set('memberId', params.memberId)
  if (params.subscriptionId) query.set('subscriptionId', params.subscriptionId)
  if (params.status) query.set('status', params.status)
  if (params.method) query.set('method', params.method)

  return useQuery({
    queryKey: ['payments', 'list', params],
    queryFn: async () => api.get<{ data: Payment[]; meta: PaginationMeta }>(`/payments?${query.toString()}`),
    placeholderData: (previous) => previous,
  })
}
