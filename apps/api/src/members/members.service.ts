import { Injectable, NotFoundException } from '@nestjs/common'
import type { CreateMemberInput, MemberListQuery, UpdateMemberInput } from '@style-le-club/shared'
import { buildPaginationMeta, paginationSkipTake } from '../common/pagination/pagination.util'
import { CountersService } from '../common/counters/counters.service'
import { AuditLogService } from '../audit/audit-log.service'
import { MembersRepository } from './members.repository'

interface ActorContext {
  organizationId: string
  actorUserId: string | null
}

const MEMBER_CODE_COUNTER_NAME = 'member_code'

@Injectable()
export class MembersService {
  constructor(
    private readonly members: MembersRepository,
    private readonly counters: CountersService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(organizationId: string, query: MemberListQuery) {
    const { skip, take } = paginationSkipTake(query)
    const [data, total] = await Promise.all([
      this.members.findMany(organizationId, skip, take, query.search),
      this.members.count(organizationId, query.search),
    ])
    return { data, meta: buildPaginationMeta(query, total) }
  }

  async getOneOrThrow(organizationId: string, id: string) {
    const member = await this.members.findById(organizationId, id)
    if (!member) throw new NotFoundException('Member not found.')
    return member
  }

  /**
   * "M-000001" style, six digits, per-organization sequence. Six digits
   * gives headroom to a million members before it needs re-visiting —
   * comfortably beyond anything a single club will ever reach.
   */
  private async generateMemberCode(organizationId: string): Promise<string> {
    const sequence = await this.counters.next(organizationId, MEMBER_CODE_COUNTER_NAME)
    return `M-${String(sequence).padStart(6, '0')}`
  }

  async create(ctx: ActorContext, input: CreateMemberInput) {
    const memberCode = await this.generateMemberCode(ctx.organizationId)
    const member = await this.members.create(ctx.organizationId, memberCode, input)

    await this.auditLog.record({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      action: 'CREATE',
      entityName: 'Member',
      entityId: member.id,
      newValue: { memberCode: member.memberCode, fullName: member.fullName, phone: member.phone },
    })

    return member
  }

  async update(ctx: ActorContext, id: string, input: UpdateMemberInput) {
    const existing = await this.getOneOrThrow(ctx.organizationId, id)
    const updated = await this.members.update(id, input)

    await this.auditLog.record({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      action: 'UPDATE',
      entityName: 'Member',
      entityId: id,
      oldValue: { fullName: existing.fullName, phone: existing.phone, active: existing.active },
      newValue: { fullName: updated.fullName, phone: updated.phone, active: updated.active },
    })

    return updated
  }

  async delete(ctx: ActorContext, id: string) {
    const existing = await this.getOneOrThrow(ctx.organizationId, id)
    await this.members.softDelete(id)

    await this.auditLog.record({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      action: 'DELETE',
      entityName: 'Member',
      entityId: id,
      oldValue: { memberCode: existing.memberCode, fullName: existing.fullName },
    })
  }
}
