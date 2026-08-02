import type { Prisma } from '@prisma/client'

interface PlanEntity {
  id: string
  name: string
  description: string | null
  durationDays: number
  price: Prisma.Decimal
  allowsLinkedMembers: boolean
  maxLinkedMembers: number
  isPopular: boolean
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export function toPlanResponse(plan: PlanEntity) {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    durationDays: plan.durationDays,
    price: Number(plan.price),
    allowsLinkedMembers: plan.allowsLinkedMembers,
    maxLinkedMembers: plan.maxLinkedMembers,
    isPopular: plan.isPopular,
    active: plan.active,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  }
}
