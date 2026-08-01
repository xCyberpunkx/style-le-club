import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { CreateMemberInput } from '@style-le-club/shared'
import type { Member } from './types'

export function useCreateMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateMemberInput) => api.post<{ data: Member }>('/members', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', 'list'] })
    },
  })
}
