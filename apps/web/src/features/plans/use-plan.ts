import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { Plan } from './types'

export function usePlan(id: string | undefined) {
  return useQuery({
    queryKey: ['plans', 'detail', id],
    queryFn: async () => {
      const res = await api.get<{ data: Plan }>(`/plans/${id}`)
      return res.data
    },
    enabled: Boolean(id),
  })
}
