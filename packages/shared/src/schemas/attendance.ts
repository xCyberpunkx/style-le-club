import { z } from 'zod'
import { paginationQuerySchema } from './pagination'

export const checkInSchema = z.object({
  memberId: z.string().uuid(),
})
export type CheckInInput = z.infer<typeof checkInSchema>

export const checkOutSchema = z.object({
  memberId: z.string().uuid(),
})
export type CheckOutInput = z.infer<typeof checkOutSchema>

export const attendanceListQuerySchema = paginationQuerySchema.extend({
  memberId: z.string().uuid().optional(),
  // "Who's currently in the club" — filters to records with no
  // checkOutAt yet, the front desk's most common attendance view.
  open: z.coerce.boolean().optional(),
})
export type AttendanceListQuery = z.infer<typeof attendanceListQuerySchema>
