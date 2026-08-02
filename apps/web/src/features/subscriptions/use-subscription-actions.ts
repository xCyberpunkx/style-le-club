import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { RenewSubscriptionInput } from '@style-le-club/shared'
import type { Subscription } from './types'

function useSubscriptionAction() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['subscriptions', 'list'] })
  return { queryClient, invalidate }
}

export function useRenewSubscription() {
  const { invalidate } = useSubscriptionAction()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RenewSubscriptionInput }) =>
      api.post<{ data: Subscription }>(`/subscriptions/${id}/renew`, input),
    onSuccess: invalidate,
  })
}

export function useFreezeSubscription() {
  const { invalidate } = useSubscriptionAction()
  return useMutation({
    mutationFn: (id: string) => api.post<{ data: Subscription }>(`/subscriptions/${id}/freeze`),
    onSuccess: invalidate,
  })
}

export function useUnfreezeSubscription() {
  const { invalidate } = useSubscriptionAction()
  return useMutation({
    mutationFn: (id: string) => api.post<{ data: Subscription }>(`/subscriptions/${id}/unfreeze`),
    onSuccess: invalidate,
  })
}

export function useCancelSubscription() {
  const { invalidate } = useSubscriptionAction()
  return useMutation({
    mutationFn: (id: string) => api.post<{ data: Subscription }>(`/subscriptions/${id}/cancel`),
    onSuccess: invalidate,
  })
}
