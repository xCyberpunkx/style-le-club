import type { Member } from '@/features/members/types'

export type AttendanceMethod = 'MANUAL'

export interface AttendanceRecord {
  id: string
  method: AttendanceMethod
  checkInAt: string
  checkOutAt: string | null
  member: Member
  createdAt: string
}
