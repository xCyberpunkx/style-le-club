import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type {
  CreateSubscriptionInput,
  RenewSubscriptionInput,
  SubscriptionListQuery,
} from '@style-le-club/shared'
import { buildPaginationMeta, paginationSkipTake } from '../common/pagination/pagination.util'
import { AuditLogService } from '../audit/audit-log.service'
import { PlansService } from '../plans/plans.service'
import { MembersService } from '../members/members.service'
import { SubscriptionsRepository, type SubscriptionWithRelations } from './subscriptions.repository'

interface ActorContext {
  organizationId: string
  actorUserId: string | null
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptions: SubscriptionsRepository,
    private readonly plans: PlansService,
    private readonly members: MembersService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(organizationId: string, query: SubscriptionListQuery) {
    const { skip, take } = paginationSkipTake(query)
    const [data, total] = await Promise.all([
      this.subscriptions.findMany(organizationId, skip, take, query.memberId, query.status),
      this.subscriptions.count(organizationId, query.memberId, query.status),
    ])
    return { data, meta: buildPaginationMeta(query, total) }
  }

  async getOneOrThrow(organizationId: string, id: string): Promise<SubscriptionWithRelations> {
    const subscription = await this.subscriptions.findById(organizationId, id)
    if (!subscription) throw new NotFoundException('Subscription not found.')
    return subscription
  }

  /**
   * Validates plan capacity + member ownership shared by both create()
   * and renew(). Throws BadRequestException on any violation.
   */
  private async resolvePlanAndMembers(organizationId: string, planId: string, memberIds: string[]) {
    const plan = await this.plans.getOneOrThrow(organizationId, planId)
    if (!plan.active) throw new BadRequestException('This plan is archived and cannot be subscribed to.')

    if (!plan.allowsLinkedMembers && memberIds.length > 1) {
      throw new BadRequestException('This plan does not support more than one linked member.')
    }
    if (memberIds.length > plan.maxLinkedMembers) {
      throw new BadRequestException(
        `This plan allows at most ${plan.maxLinkedMembers} linked member(s).`,
      )
    }

    const foundMembers = await this.members.findManyByIds(organizationId, memberIds)
    if (foundMembers.length !== memberIds.length) {
      throw new BadRequestException('One or more members were not found in this organization.')
    }

    return plan
  }

  /**
   * Enforces the flagged overlap assumption — see the ASSUMPTION comment
   * on the Subscription model in schema.prisma. `excludeSubscriptionId`
   * lets renew() check for overlaps against subscriptions *other than*
   * the one it's about to supersede.
   */
  private async assertNoOverlap(
    organizationId: string,
    memberIds: string[],
    excludeSubscriptionId?: string,
  ) {
    const conflicts = await this.subscriptions.findActiveOrFrozenForMembers(organizationId, memberIds)
    const blocking = conflicts.filter((c) => c.subscriptionId !== excludeSubscriptionId)
    if (blocking.length > 0) {
      const names = [...new Set(blocking.map((c) => c.member.fullName))].join(', ')
      throw new ConflictException(
        `Already has an active or frozen subscription: ${names}. Renew, freeze, or cancel it first.`,
      )
    }
  }

  async create(ctx: ActorContext, input: CreateSubscriptionInput) {
    const plan = await this.resolvePlanAndMembers(ctx.organizationId, input.planId, input.memberIds)
    await this.assertNoOverlap(ctx.organizationId, input.memberIds)

    const startDate = input.startDate ?? new Date()
    const endDate = addDays(startDate, plan.durationDays)

    const subscription = await this.subscriptions.create(ctx.organizationId, {
      planId: plan.id,
      memberIds: input.memberIds,
      startDate,
      endDate,
      priceAtPurchase: plan.price,
    })

    await this.auditLog.record({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      action: 'CREATE',
      entityName: 'Subscription',
      entityId: subscription.id,
      newValue: { planId: plan.id, memberIds: input.memberIds, endDate },
    })

    return subscription
  }

  /**
   * Renew (same plan) and Upgrade (different plan) share this path — see
   * renewSubscriptionSchema's comment in packages/shared. If the current
   * subscription is still ACTIVE or FROZEN, it's superseded (cancelled)
   * atomically as part of creating the new one, per the flagged overlap
   * assumption: this system has no notion of a "queued" future
   * subscription.
   */
  async renew(ctx: ActorContext, currentSubscriptionId: string, input: RenewSubscriptionInput) {
    const current = await this.getOneOrThrow(ctx.organizationId, currentSubscriptionId)
    if (current.status === 'CANCELLED') {
      throw new BadRequestException('A cancelled subscription cannot be renewed. Create a new one instead.')
    }

    const memberIds = current.members.map((m) => m.memberId)
    const targetPlanId = input.planId ?? current.planId
    const plan = await this.resolvePlanAndMembers(ctx.organizationId, targetPlanId, memberIds)

    const shouldSupersedeCurrent = current.status === 'ACTIVE' || current.status === 'FROZEN'
    const startDate = new Date()
    const endDate = addDays(startDate, plan.durationDays)

    const subscription = await this.subscriptions.renewInTransaction(
      ctx.organizationId,
      current.id,
      shouldSupersedeCurrent,
      { planId: plan.id, memberIds, startDate, endDate, priceAtPurchase: plan.price },
    )

    await this.auditLog.record({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      action: 'CREATE',
      entityName: 'Subscription',
      entityId: subscription.id,
      oldValue: { supersededSubscriptionId: shouldSupersedeCurrent ? current.id : null },
      newValue: { planId: plan.id, memberIds, endDate },
    })

    return subscription
  }

  async freeze(ctx: ActorContext, id: string) {
    const current = await this.getOneOrThrow(ctx.organizationId, id)
    if (current.status !== 'ACTIVE') {
      throw new BadRequestException('Only an active subscription can be frozen.')
    }

    const updated = await this.subscriptions.updateStatus(id, { status: 'FROZEN', frozenAt: new Date() })

    await this.auditLog.record({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      action: 'UPDATE',
      entityName: 'Subscription',
      entityId: id,
      oldValue: { status: 'ACTIVE' },
      newValue: { status: 'FROZEN' },
    })

    return updated
  }

  async unfreeze(ctx: ActorContext, id: string) {
    const current = await this.getOneOrThrow(ctx.organizationId, id)
    if (current.status !== 'FROZEN') {
      throw new BadRequestException('Only a frozen subscription can be unfrozen.')
    }

    const updated = await this.subscriptions.updateStatus(id, { status: 'ACTIVE', frozenAt: null })

    await this.auditLog.record({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      action: 'UPDATE',
      entityName: 'Subscription',
      entityId: id,
      oldValue: { status: 'FROZEN' },
      newValue: { status: 'ACTIVE' },
    })

    return updated
  }

  async cancel(ctx: ActorContext, id: string) {
    const current = await this.getOneOrThrow(ctx.organizationId, id)
    if (current.status === 'CANCELLED' || current.status === 'EXPIRED') {
      throw new BadRequestException('This subscription is already inactive.')
    }

    const updated = await this.subscriptions.updateStatus(id, {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    })

    await this.auditLog.record({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      action: 'DELETE',
      entityName: 'Subscription',
      entityId: id,
      oldValue: { status: current.status },
      newValue: { status: 'CANCELLED' },
    })

    return updated
  }
}
