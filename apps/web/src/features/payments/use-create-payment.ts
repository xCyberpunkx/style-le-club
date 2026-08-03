import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { CreatePaymentInput } from '@style-le-club/shared'
import type { Payment } from './types'

export function useCreatePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreatePaymentInput) => api.post<{ data: Payment }>('/payments', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', 'list'] })
    },
  })
}

export function useRefundPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.post<{ data: Payment }>(`/payments/${id}/refund`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', 'list'] })
    },
  })
}
