import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { UpdatePlanInput } from '@style-le-club/shared'
import type { Plan } from './types'

export function useUpdatePlan(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdatePlanInput) => api.patch<{ data: Plan }>(`/plans/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['plans', 'detail', id] })
    },
  })
}
