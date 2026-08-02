import type { Plan } from '@/features/plans/types'
import type { Member } from '@/features/members/types'

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED'

export interface Subscription {
  id: string
  status: SubscriptionStatus
  startDate: string
  endDate: string
  priceAtPurchase: number
  frozenAt: string | null
  cancelledAt: string | null
  plan: Plan
  members: { isPrimary: boolean; member: Member }[]
  createdAt: string
  updatedAt: string
}
