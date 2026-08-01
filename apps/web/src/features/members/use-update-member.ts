import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { UpdateMemberInput } from '@style-le-club/shared'
import type { Member } from './types'

export function useUpdateMember(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateMemberInput) => api.patch<{ data: Member }>(`/members/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['members', 'detail', id] })
    },
  })
}
