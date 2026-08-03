import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { CreatePaymentInput, PaymentListQuery } from '@style-le-club/shared'
import { buildPaginationMeta, paginationSkipTake } from '../common/pagination/pagination.util'
import { AuditLogService } from '../audit/audit-log.service'
import { SubscriptionsService } from '../subscriptions/subscriptions.service'
import { PaymentsRepository, type PaymentWithRelations } from './payments.repository'

interface ActorContext {
  organizationId: string
  actorUserId: string | null
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly payments: PaymentsRepository,
    private readonly subscriptions: SubscriptionsService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(organizationId: string, query: PaymentListQuery) {
    const { skip, take } = paginationSkipTake(query)
    const filters = { memberId: query.memberId, subscriptionId: query.subscriptionId, status: query.status, method: query.method }
    const [data, total] = await Promise.all([
      this.payments.findMany(organizationId, skip, take, filters),
      this.payments.count(organizationId, filters),
    ])
    return { data, meta: buildPaginationMeta(query, total) }
  }

  async getOneOrThrow(organizationId: string, id: string): Promise<PaymentWithRelations> {
    const payment = await this.payments.findById(organizationId, id)
    if (!payment) throw new NotFoundException('Payment not found.')
    return payment
  }

  /**
   * memberId must be one of the target subscription's linked members —
   * a couple plan has two, and the payer has to be one of them, not an
   * arbitrary member id from elsewhere in the org.
   */
  private async assertMemberBelongsToSubscription(
    organizationId: string,
    subscriptionId: string,
    memberId: string,
  ) {
    const subscription = await this.subscriptions.getOneOrThrow(organizationId, subscriptionId)
    const belongs = subscription.members.some((m) => m.memberId === memberId)
    if (!belongs) {
      throw new BadRequestException('This member is not linked to the given subscription.')
    }
    return subscription
  }

  async create(ctx: ActorContext, input: CreatePaymentInput) {
    await this.assertMemberBelongsToSubscription(ctx.organizationId, input.subscriptionId, input.memberId)

    // Cross-field split-vs-total validation already ran in
    // createPaymentSchema (packages/shared) — this is a second,
    // server-side-only invariant: split methods must be CASH/CARD only,
    // which the shared schema already restricts at the type level, so
    // nothing further to check here beyond what Zod guaranteed.

    const payment = await this.payments.createInTransaction(ctx.organizationId, {
      memberId: input.memberId,
      subscriptionId: input.subscriptionId,
      amount: input.amount,
      method: input.method,
      status: input.status,
      notes: input.notes,
      splits: input.method === 'MIXED' ? input.splits : undefined,
    })

    await this.auditLog.record({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      action: 'CREATE',
      entityName: 'Payment',
      entityId: payment.id,
      newValue: {
        receiptNumber: payment.receiptNumber,
        memberId: input.memberId,
        subscriptionId: input.subscriptionId,
        amount: input.amount,
        method: input.method,
        status: input.status,
      },
    })

    return payment
  }

  async refund(ctx: ActorContext, id: string) {
    const current = await this.getOneOrThrow(ctx.organizationId, id)
    if (current.status !== 'PAID') {
      throw new BadRequestException('Only a paid payment can be refunded.')
    }

    const updated = await this.payments.markRefunded(id)

    await this.auditLog.record({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      action: 'UPDATE',
      entityName: 'Payment',
      entityId: id,
      oldValue: { status: 'PAID' },
      newValue: { status: 'REFUNDED' },
    })

    return updated
  }
}
