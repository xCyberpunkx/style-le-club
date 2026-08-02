import { Injectable, NotFoundException } from '@nestjs/common'
import type { CreatePlanInput, PlanListQuery, UpdatePlanInput } from '@style-le-club/shared'
import { buildPaginationMeta, paginationSkipTake } from '../common/pagination/pagination.util'
import { AuditLogService } from '../audit/audit-log.service'
import { PlansRepository } from './plans.repository'

interface ActorContext {
  organizationId: string
  actorUserId: string | null
}

@Injectable()
export class PlansService {
  constructor(
    private readonly plans: PlansRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(organizationId: string, query: PlanListQuery) {
    const { skip, take } = paginationSkipTake(query)
    const [data, total] = await Promise.all([
      this.plans.findMany(organizationId, skip, take, query.search, query.activeOnly),
      this.plans.count(organizationId, query.search, query.activeOnly),
    ])
    return { data, meta: buildPaginationMeta(query, total) }
  }

  async getOneOrThrow(organizationId: string, id: string) {
    const plan = await this.plans.findById(organizationId, id)
    if (!plan) throw new NotFoundException('Plan not found.')
    return plan
  }

  async create(ctx: ActorContext, input: CreatePlanInput) {
    const plan = await this.plans.create(ctx.organizationId, input)

    await this.auditLog.record({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      action: 'CREATE',
      entityName: 'Plan',
      entityId: plan.id,
      newValue: { name: plan.name, price: plan.price.toString(), durationDays: plan.durationDays },
    })

    return plan
  }

  async update(ctx: ActorContext, id: string, input: UpdatePlanInput) {
    const existing = await this.getOneOrThrow(ctx.organizationId, id)
    const updated = await this.plans.update(id, input)

    await this.auditLog.record({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      action: 'UPDATE',
      entityName: 'Plan',
      entityId: id,
      oldValue: { name: existing.name, price: existing.price.toString(), active: existing.active },
      newValue: { name: updated.name, price: updated.price.toString(), active: updated.active },
    })

    return updated
  }

  async delete(ctx: ActorContext, id: string) {
    const existing = await this.getOneOrThrow(ctx.organizationId, id)
    await this.plans.softDelete(id)

    await this.auditLog.record({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      action: 'DELETE',
      entityName: 'Plan',
      entityId: id,
      oldValue: { name: existing.name },
    })
  }
}
