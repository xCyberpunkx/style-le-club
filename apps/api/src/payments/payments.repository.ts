import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.module'
import { CountersService } from '../common/counters/counters.service'

const RECEIPT_NUMBER_COUNTER_NAME = 'receipt_number'

const paymentInclude = {
  member: true,
  subscription: { include: { plan: true } },
  splits: true,
} satisfies Prisma.PaymentInclude

export type PaymentWithRelations = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>

export type PaymentMethodValue = 'CASH' | 'CARD' | 'MIXED'
export type PaymentStatusValue = 'PAID' | 'PENDING' | 'REFUNDED'

interface CreatePaymentData {
  memberId: string
  subscriptionId: string
  amount: number
  method: PaymentMethodValue
  status: PaymentStatusValue
  notes?: string
  splits?: { method: 'CASH' | 'CARD'; amount: number }[]
}

interface PaymentFilters {
  memberId?: string
  subscriptionId?: string
  status?: PaymentStatusValue
  method?: PaymentMethodValue
}

function buildWhere(organizationId: string, filters: PaymentFilters): Prisma.PaymentWhereInput {
  return {
    organizationId,
    ...(filters.memberId ? { memberId: filters.memberId } : {}),
    ...(filters.subscriptionId ? { subscriptionId: filters.subscriptionId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.method ? { method: filters.method } : {}),
  }
}

@Injectable()
export class PaymentsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly counters: CountersService,
  ) {}

  async findMany(
    organizationId: string,
    skip: number,
    take: number,
    filters: PaymentFilters,
  ): Promise<PaymentWithRelations[]> {
    return this.prisma.payment.findMany({
      where: buildWhere(organizationId, filters),
      include: paymentInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    })
  }

  async count(organizationId: string, filters: PaymentFilters) {
    return this.prisma.payment.count({ where: buildWhere(organizationId, filters) })
  }

  async findById(organizationId: string, id: string): Promise<PaymentWithRelations | null> {
    return this.prisma.payment.findFirst({
      where: { id, organizationId },
      include: paymentInclude,
    })
  }

  /**
   * "Record a payment, confirm receipt numbering is atomic under the DB
   * transaction" (blueprint Phase 8 DoD). The counter increment and the
   * Payment (+ splits) INSERT run inside one Prisma `$transaction` via
   * CountersService's tx-aware `next()` — a crash mid-way rolls back
   * both, so a receipt number can never be burned without a matching
   * Payment row, and vice versa.
   */
  async createInTransaction(
    organizationId: string,
    input: CreatePaymentData,
  ): Promise<PaymentWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const sequence = await this.counters.next(organizationId, RECEIPT_NUMBER_COUNTER_NAME, tx)
      const receiptNumber = `R-${String(sequence).padStart(6, '0')}`

      return tx.payment.create({
        data: {
          organizationId,
          receiptNumber,
          memberId: input.memberId,
          subscriptionId: input.subscriptionId,
          amount: input.amount,
          method: input.method,
          status: input.status,
          notes: input.notes,
          ...(input.splits && input.splits.length > 0
            ? { splits: { create: input.splits.map((s) => ({ method: s.method, amount: s.amount })) } }
            : {}),
        },
        include: paymentInclude,
      })
    })
  }

  async markRefunded(id: string): Promise<PaymentWithRelations> {
    return this.prisma.payment.update({
      where: { id },
      data: { status: 'REFUNDED', refundedAt: new Date() },
      include: paymentInclude,
    })
  }
}
