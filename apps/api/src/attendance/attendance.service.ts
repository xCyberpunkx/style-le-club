import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common'
import type { AttendanceListQuery } from '@style-le-club/shared'
import { buildPaginationMeta, paginationSkipTake } from '../common/pagination/pagination.util'
import { MembersService } from '../members/members.service'
import { SubscriptionsService } from '../subscriptions/subscriptions.service'
import { AttendanceRepository } from './attendance.repository'
import {
  ACCESS_CONTROL_ADAPTER,
  type AccessControlAdapter,
} from './access-control/access-control-adapter.interface'

interface ActorContext {
  organizationId: string
  actorUserId: string | null
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendance: AttendanceRepository,
    private readonly members: MembersService,
    private readonly subscriptions: SubscriptionsService,
    @Inject(ACCESS_CONTROL_ADAPTER) private readonly accessControl: AccessControlAdapter,
  ) {}

  async list(organizationId: string, query: AttendanceListQuery) {
    const { skip, take } = paginationSkipTake(query)
    const filters = { memberId: query.memberId, open: query.open }
    const [data, total] = await Promise.all([
      this.attendance.findMany(organizationId, skip, take, filters),
      this.attendance.count(organizationId, filters),
    ])
    return { data, meta: buildPaginationMeta(query, total) }
  }

  /**
   * Not audit-logged — attendance check-in/out isn't on the blueprint's
   * "every sensitive action" list (payments, role/permission changes,
   * employee changes). It's a high-frequency, low-stakes front-desk
   * action; an AuditLog row per check-in would mostly be noise. This
   * table itself is already the historical record.
   */
  async checkIn(ctx: ActorContext, memberId: string) {
    const member = await this.members.getOneOrThrow(ctx.organizationId, memberId)
    if (!member.active) {
      throw new BadRequestException('This member is archived and cannot check in.')
    }

    const status = await this.subscriptions.getCurrentStatusForMember(ctx.organizationId, memberId)
    if (status !== 'ACTIVE') {
      throw new ForbiddenException(
        status === 'FROZEN'
          ? 'This membership is frozen — check-in is not allowed until it is reactivated.'
          : 'This member has no active subscription.',
      )
    }

    const existingOpen = await this.attendance.findOpenForMember(ctx.organizationId, memberId)
    if (existingOpen) {
      throw new BadRequestException('This member is already checked in.')
    }

    // The swap point: today this is the mock and always grants once the
    // rules above pass. A future real adapter could still say no here
    // (hardware fault, badge not recognized) without AttendanceService
    // needing to change at all.
    const decision = await this.accessControl.evaluateEntry({
      organizationId: ctx.organizationId,
      memberId,
    })
    if (!decision.granted) {
      throw new ForbiddenException(decision.reason ?? 'Access denied.')
    }

    return this.attendance.create(ctx.organizationId, memberId)
  }

  async checkOut(ctx: ActorContext, memberId: string) {
    const existingOpen = await this.attendance.findOpenForMember(ctx.organizationId, memberId)
    if (!existingOpen) {
      throw new BadRequestException('This member is not currently checked in.')
    }
    return this.attendance.checkOut(existingOpen.id)
  }
}
