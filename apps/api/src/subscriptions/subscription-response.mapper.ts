import { toPlanResponse } from '../plans/plan-response.mapper'
import { toMemberResponse } from '../members/member-response.mapper'
import type { SubscriptionWithRelations } from './subscriptions.repository'

export function toSubscriptionResponse(subscription: SubscriptionWithRelations) {
  return {
    id: subscription.id,
    status: subscription.status,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    priceAtPurchase: Number(subscription.priceAtPurchase),
    frozenAt: subscription.frozenAt,
    cancelledAt: subscription.cancelledAt,
    plan: toPlanResponse(subscription.plan),
    members: subscription.members.map((sm) => ({
      isPrimary: sm.isPrimary,
      member: toMemberResponse(sm.member),
    })),
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
  }
}
