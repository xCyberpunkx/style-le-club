import { Injectable } from '@nestjs/common'
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
 */
@Injectable()
export class CountersService {
  constructor(private readonly prisma: PrismaService) {}

  async next(organizationId: string, name: string): Promise<number> {
    const counter = await this.prisma.counter.upsert({
      where: { organizationId_name: { organizationId, name } },
      create: { organizationId, name, value: 1 },
      update: { value: { increment: 1 } },
    })
    return counter.value
  }
}
