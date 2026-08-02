import { z } from 'zod'
import { paginationQuerySchema } from './pagination'

export const createPlanSchema = z
  .object({
    name: z.string().trim().min(2, 'Le nom est requis').max(120),
    description: z.string().trim().max(1000).optional(),
    durationDays: z.coerce.number().int().positive('Doit être positif'),
    price: z.coerce.number().nonnegative('Doit être positif ou nul'),
    allowsLinkedMembers: z.boolean().optional().default(false),
    maxLinkedMembers: z.coerce.number().int().positive().optional().default(1),
    isPopular: z.boolean().optional().default(false),
  })
  .refine((data) => !data.allowsLinkedMembers || data.maxLinkedMembers >= 2, {
    message: 'Un plan couvrant plusieurs membres doit autoriser au moins 2 membres liés',
    path: ['maxLinkedMembers'],
  })
export type CreatePlanInput = z.infer<typeof createPlanSchema>

export const updatePlanSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  durationDays: z.coerce.number().int().positive().optional(),
  price: z.coerce.number().nonnegative().optional(),
  allowsLinkedMembers: z.boolean().optional(),
  maxLinkedMembers: z.coerce.number().int().positive().optional(),
  isPopular: z.boolean().optional(),
  active: z.boolean().optional(),
})
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>

export const planListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(120).optional(),
  activeOnly: z.coerce.boolean().optional(),
})
export type PlanListQuery = z.infer<typeof planListQuerySchema>
