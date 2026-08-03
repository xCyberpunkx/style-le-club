import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.module'

/**
 * Generic, per-organization atomic sequence generator (schema.prisma:
 * Counter). First consumer is Member.memberCode; kept name-keyed and
 * reusable rather than hand-rolled per entity, since the same "give me
 * the next sequential number for this org" need resurfaces verbatim for
 * invoice/receipt numbering in the Payments phase.
 *
 * Atomicity: `upsert` with an `increment` update compiles to a single
 * INSERT ... ON CONFLICT DO UPDATE statement — there's no separate
 * read-then-write window for two concurrent requests to race through, so
 * two receptionists creating a member at the same moment can never be
 * handed the same number.
 *
 * Transaction-aware: `tx` optionally accepts an in-flight Prisma
 * transaction client. Member.memberCode never needed this (member
 * creation is a single insert), but Payments does — the blueprint's
 * Phase 8 DoD is specifically "confirm receipt numbering is atomic under
 * the DB transaction," meaning the counter increment and the Payment
 * INSERT must commit or roll back together, not as two independent
 * writes that could diverge on a crash between them. Passing `tx` routes
 * the upsert through the caller's transaction instead of a fresh
 * connection; omitting it keeps every existing call site (memberCode)
 * working exactly as before.
 */
@Injectable()
export class CountersService {
  constructor(private readonly prisma: PrismaService) {}

  async next(organizationId: string, name: string, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx ?? this.prisma
    const counter = await client.counter.upsert({
      where: { organizationId_name: { organizationId, name } },
      create: { organizationId, name, value: 1 },
      update: { value: { increment: 1 } },
    })
    return counter.value
  }
}
