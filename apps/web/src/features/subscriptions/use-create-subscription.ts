import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { CreateSubscriptionInput } from '@style-le-club/shared'
import type { Subscription } from './types'

export function useCreateSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateSubscriptionInput) =>
      api.post<{ data: Subscription }>('/subscriptions', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'list'] })
    },
  })
}
