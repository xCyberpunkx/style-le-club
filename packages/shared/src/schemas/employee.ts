import { z } from 'zod'
import { paginationQuerySchema } from './pagination'

/**
 * Optional login account created alongside an Employee profile. Not every
 * staff member needs system access (schema.prisma: Employee vs User are
 * deliberately separate) — this is only sent when the Admin is also
 * granting this employee a login.
 */
const employeeAccountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const createEmployeeSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(120),
  phone: z.string().trim().min(6).max(30).optional(),
  jobTitle: z.string().trim().max(120).optional(),
  hireDate: z.coerce.date().optional(),
  roleId: z.string().uuid().optional(),
  account: employeeAccountSchema.optional(),
})
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>

export const updateEmployeeSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(6).max(30).nullable().optional(),
  jobTitle: z.string().trim().max(120).nullable().optional(),
  hireDate: z.coerce.date().nullable().optional(),
  roleId: z.string().uuid().nullable().optional(),
  active: z.boolean().optional(),
})
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>

export const employeeListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(120).optional(),
})
export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>
