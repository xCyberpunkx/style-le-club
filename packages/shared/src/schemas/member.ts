import { z } from 'zod'
import { paginationQuerySchema } from './pagination'

// Phase 6 scope only. Deliberately no planId, status, or coachId here —
// see schema.prisma's Member model comment for why each is deferred to a
// later, not-yet-built module rather than faked now.

export const createMemberSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(120),
  phone: z.string().trim().min(6, 'Phone number is required').max(30),
  email: z.string().trim().email().optional(),
  dateOfBirth: z.coerce.date().optional(),
  weightKg: z.coerce.number().positive().max(500).optional(),
  heightCm: z.coerce.number().positive().max(300).optional(),
  goal: z.string().trim().max(500).optional(),
  joinDate: z.coerce.date().optional(),
})
export type CreateMemberInput = z.infer<typeof createMemberSchema>

export const updateMemberSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(6).max(30).optional(),
  email: z.string().trim().email().nullable().optional(),
  dateOfBirth: z.coerce.date().nullable().optional(),
  weightKg: z.coerce.number().positive().max(500).nullable().optional(),
  heightCm: z.coerce.number().positive().max(300).nullable().optional(),
  goal: z.string().trim().max(500).nullable().optional(),
  joinDate: z.coerce.date().optional(),
  active: z.boolean().optional(),
})
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>

export const memberListQuerySchema = paginationQuerySchema.extend({
  // Matches by name or phone — the two things a receptionist actually
  // searches by at the front desk.
  search: z.string().trim().min(1).max(120).optional(),
})
export type MemberListQuery = z.infer<typeof memberListQuerySchema>
