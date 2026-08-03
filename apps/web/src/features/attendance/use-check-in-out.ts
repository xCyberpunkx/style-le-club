import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { AttendanceRecord } from './types'

export function useCheckIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (memberId: string) =>
      api.post<{ data: AttendanceRecord }>('/attendance/check-in', { memberId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'list'] })
    },
  })
}

export function useCheckOut() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (memberId: string) =>
      api.post<{ data: AttendanceRecord }>('/attendance/check-out', { memberId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'list'] })
    },
  })
}
