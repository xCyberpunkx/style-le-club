import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { Member } from './types'

export function useMember(id: string | undefined) {
  return useQuery({
    queryKey: ['members', 'detail', id],
    queryFn: async () => {
      const res = await api.get<{ data: Member }>(`/members/${id}`)
      return res.data
    },
    enabled: Boolean(id),
  })
}
