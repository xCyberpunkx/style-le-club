import { z } from 'zod'
import { paginationQuerySchema } from './pagination'

// One line item per tender type actually used in a MIXED payment.
// CASH/CARD only — MIXED itself isn't a valid split method (see
// PaymentSplitMethod in schema.prisma).
export const paymentSplitInputSchema = z.object({
  method: z.enum(['CASH', 'CARD']),
  amount: z.coerce.number().positive('Le montant doit être positif'),
})
export type PaymentSplitInput = z.infer<typeof paymentSplitInputSchema>

// "Record a payment" (blueprint Phase 8 DoD). subscriptionId is required
// today — it's the only real payment source until Appointment/Sale exist
// (see the schema.prisma comment on Payment). memberId must be one of
// that subscription's linked members; enforced server-side in
// payments.service.ts, not here, since it requires a DB lookup.
export const createPaymentSchema = z
  .object({
    subscriptionId: z.string().uuid(),
    memberId: z.string().uuid(),
    amount: z.coerce.number().positive('Le montant doit être positif'),
    method: z.enum(['CASH', 'CARD', 'MIXED']),
    splits: z.array(paymentSplitInputSchema).optional(),
    // REFUNDED is deliberately excluded — only reachable via the refund
    // action on an existing Payment, never set directly at creation.
    status: z.enum(['PAID', 'PENDING']).default('PAID'),
    notes: z.preprocess(
      (v) => (v === '' ? undefined : v),
      z.string().trim().max(500).optional(),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.method === 'MIXED') {
      if (!data.splits || data.splits.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['splits'],
          message: 'Un paiement mixte nécessite au moins deux méthodes de règlement.',
        })
        return
      }
      const total = data.splits.reduce((sum, s) => sum + s.amount, 0)
      if (Math.abs(total - data.amount) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['splits'],
          message: 'La somme des méthodes de règlement doit correspondre au montant total.',
        })
      }
    } else if (data.splits && data.splits.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['splits'],
        message: 'Les méthodes multiples ne s\'appliquent qu\'aux paiements mixtes.',
      })
    }
  })
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>

export const paymentListQuerySchema = paginationQuerySchema.extend({
  memberId: z.string().uuid().optional(),
  subscriptionId: z.string().uuid().optional(),
  status: z.enum(['PAID', 'PENDING', 'REFUNDED']).optional(),
  method: z.enum(['CASH', 'CARD', 'MIXED']).optional(),
})
export type PaymentListQuery = z.infer<typeof paymentListQuerySchema>
