import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.module'
import type { Prisma } from '@prisma/client'

const subscriptionInclude = {
  plan: true,
  members: { include: { member: true } },
} satisfies Prisma.SubscriptionInclude

export type SubscriptionWithRelations = Prisma.SubscriptionGetPayload<{
  include: typeof subscriptionInclude
}>

export type SubscriptionStatusValue = 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED'

@Injectable()
export class SubscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    organizationId: string,
    skip: number,
    take: number,
    memberId?: string,
    status?: SubscriptionStatusValue,
  ): Promise<SubscriptionWithRelations[]> {
    return this.prisma.subscription.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
        ...(memberId ? { members: { some: { memberId } } } : {}),
      },
      include: subscriptionInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    })
  }

  async count(organizationId: string, memberId?: string, status?: SubscriptionStatusValue) {
    return this.prisma.subscription.count({
      where: {
        organizationId,
        ...(status ? { status } : {}),
        ...(memberId ? { members: { some: { memberId } } } : {}),
      },
    })
  }

  async findById(organizationId: string, id: string): Promise<SubscriptionWithRelations | null> {
    return this.prisma.subscription.findFirst({
      where: { id, organizationId },
      include: subscriptionInclude,
    })
  }

  /**
   * The overlap check that backs the "one ACTIVE/FROZEN subscription per
   * member" invariant (see the ASSUMPTION FLAGGED comment on the
   * Subscription model in schema.prisma). Returns every currently
   * ACTIVE or FROZEN SubscriptionMember row for any of the given member
   * ids, so the caller can report exactly who's already covered.
   */
  async findActiveOrFrozenForMembers(organizationId: string, memberIds: string[]) {
    return this.prisma.subscriptionMember.findMany({
      where: {
        memberId: { in: memberIds },
        subscription: { organizationId, status: { in: ['ACTIVE', 'FROZEN'] } },
      },
      include: { member: true, subscription: true },
    })
  }

  async create(
    organizationId: string,
    input: {
      planId: string
      memberIds: string[]
      startDate: Date
      endDate: Date
      priceAtPurchase: Prisma.Decimal | number
    },
  ): Promise<SubscriptionWithRelations> {
    return this.prisma.subscription.create({
      data: {
        organizationId,
        planId: input.planId,
        startDate: input.startDate,
        endDate: input.endDate,
        priceAtPurchase: input.priceAtPurchase,
        members: {
          create: input.memberIds.map((memberId, index) => ({
            memberId,
            isPrimary: index === 0,
          })),
        },
      },
      include: subscriptionInclude,
    })
  }

  async updateStatus(
    id: string,
    data: Partial<{
      status: SubscriptionStatusValue
      frozenAt: Date | null
      cancelledAt: Date | null
    }>,
  ) {
    return this.prisma.subscription.update({ where: { id }, data, include: subscriptionInclude })
  }

  /**
   * Renew/Upgrade: superseding an ACTIVE or FROZEN subscription with a
   * fresh one must be atomic — a crash between "cancel the old one" and
   * "create the new one" must never leave a member with neither (or
   * both). Wrapped in a single Prisma $transaction accordingly.
   */
  async renewInTransaction(
    organizationId: string,
    currentSubscriptionId: string,
    shouldSupersedeCurrent: boolean,
    createInput: {
      planId: string
      memberIds: string[]
      startDate: Date
      endDate: Date
      priceAtPurchase: Prisma.Decimal | number
    },
  ): Promise<SubscriptionWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      if (shouldSupersedeCurrent) {
        await tx.subscription.update({
          where: { id: currentSubscriptionId },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        })
      }

      return tx.subscription.create({
        data: {
          organizationId,
          planId: createInput.planId,
          startDate: createInput.startDate,
          endDate: createInput.endDate,
          priceAtPurchase: createInput.priceAtPurchase,
          members: {
            create: createInput.memberIds.map((memberId, index) => ({
              memberId,
              isPrimary: index === 0,
            })),
          },
        },
        include: subscriptionInclude,
      })
    })
  }
}
