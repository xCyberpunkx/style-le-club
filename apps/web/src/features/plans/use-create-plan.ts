import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { CreatePlanInput } from '@style-le-club/shared'
import type { Plan } from './types'

export function useCreatePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreatePlanInput) => api.post<{ data: Plan }>('/plans', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans', 'list'] })
    },
  })
}
