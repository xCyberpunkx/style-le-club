import { toMemberResponse } from '../members/member-response.mapper'
import { toPlanResponse } from '../plans/plan-response.mapper'
import type { PaymentWithRelations } from './payments.repository'

export function toPaymentResponse(payment: PaymentWithRelations) {
  return {
    id: payment.id,
    receiptNumber: payment.receiptNumber,
    amount: Number(payment.amount),
    method: payment.method,
    status: payment.status,
    paidAt: payment.paidAt,
    refundedAt: payment.refundedAt,
    notes: payment.notes,
    member: toMemberResponse(payment.member),
    subscription: {
      id: payment.subscription.id,
      status: payment.subscription.status,
      plan: toPlanResponse(payment.subscription.plan),
    },
    splits: payment.splits.map((s) => ({ method: s.method, amount: Number(s.amount) })),
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  }
}
