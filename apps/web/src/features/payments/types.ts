import type { Plan } from '@/features/plans/types'
import type { Member } from '@/features/members/types'

export type PaymentMethod = 'CASH' | 'CARD' | 'MIXED'
export type PaymentStatus = 'PAID' | 'PENDING' | 'REFUNDED'
export type PaymentSplitMethod = 'CASH' | 'CARD'

export interface PaymentSplit {
  method: PaymentSplitMethod
  amount: number
}

export interface Payment {
  id: string
  receiptNumber: string
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  paidAt: string
  refundedAt: string | null
  notes: string | null
  member: Member
  subscription: {
    id: string
    status: string
    plan: Plan
  }
  splits: PaymentSplit[]
  createdAt: string
  updatedAt: string
}
