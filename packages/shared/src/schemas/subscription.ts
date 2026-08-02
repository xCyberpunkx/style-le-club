import { z } from 'zod'
import { paginationQuerySchema } from './pagination'

// "Subscribe a client" (blueprint Phase 7 DoD). memberIds is an array,
// not a single memberId, to cover the couple-plan case — the plan's
// allowsLinkedMembers/maxLinkedMembers is enforced server-side against
// however many ids are sent, not duplicated here.
export const createSubscriptionSchema = z.object({
  planId: z.string().uuid(),
  memberIds: z.array(z.string().uuid()).min(1, 'Sélectionnez au moins un membre'),
  startDate: z.coerce.date().optional(),
})
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>

// Renew and Upgrade (blueprint mockup's two distinct actions) are the
// same mechanism here: start a new Subscription for the same members,
// optionally against a different Plan. Renew = omit planId (keeps the
// current plan); Upgrade = pass a different planId. One code path
// instead of two near-duplicate ones.
export const renewSubscriptionSchema = z.object({
  planId: z.string().uuid().optional(),
})
export type RenewSubscriptionInput = z.infer<typeof renewSubscriptionSchema>

export const subscriptionListQuerySchema = paginationQuerySchema.extend({
  memberId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'FROZEN', 'CANCELLED']).optional(),
})
export type SubscriptionListQuery = z.infer<typeof subscriptionListQuerySchema>
