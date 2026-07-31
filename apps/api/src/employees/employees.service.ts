import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { CreateEmployeeInput, EmployeeListQuery, UpdateEmployeeInput } from '@style-le-club/shared'
import { buildPaginationMeta, paginationSkipTake } from '../common/pagination/pagination.util'
import { AuditLogService } from '../audit/audit-log.service'
import { EmployeesRepository } from './employees.repository'

interface ActorContext {
  organizationId: string
  actorUserId: string | null
}

@Injectable()
export class EmployeesService {
  constructor(
    private readonly employees: EmployeesRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(organizationId: string, query: EmployeeListQuery) {
    const { skip, take } = paginationSkipTake(query)
    const [data, total] = await Promise.all([
      this.employees.findMany(organizationId, skip, take, query.search),
      this.employees.count(organizationId, query.search),
    ])
    return { data, meta: buildPaginationMeta(query, total) }
  }

  async getOneOrThrow(organizationId: string, id: string) {
    const employee = await this.employees.findById(organizationId, id)
    if (!employee) throw new NotFoundException('Employee not found.')
    return employee
  }

  private async assertRoleBelongsToOrg(organizationId: string, roleId: string | null | undefined) {
    if (!roleId) return
    const belongs = await this.employees.roleBelongsToOrg(organizationId, roleId)
    if (!belongs) throw new BadRequestException('roleId does not belong to this organization.')
  }

  async create(ctx: ActorContext, input: CreateEmployeeInput) {
    await this.assertRoleBelongsToOrg(ctx.organizationId, input.roleId)

    let employee
    try {
      employee = await this.employees.create(ctx.organizationId, input)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An account with this email already exists.')
      }
      throw error
    }

    await this.auditLog.record({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      action: 'CREATE',
      entityName: 'Employee',
      entityId: employee.id,
      newValue: {
        fullName: employee.fullName,
        roleId: employee.roleId,
        hasAccount: employee.user !== null,
      },
    })

    return employee
  }

  async update(ctx: ActorContext, id: string, input: UpdateEmployeeInput) {
    const existing = await this.getOneOrThrow(ctx.organizationId, id)
    await this.assertRoleBelongsToOrg(ctx.organizationId, input.roleId)

    const updated = await this.employees.update(id, input)

    await this.auditLog.record({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      action: 'UPDATE',
      entityName: 'Employee',
      entityId: id,
      oldValue: {
        fullName: existing.fullName,
        phone: existing.phone,
        jobTitle: existing.jobTitle,
        roleId: existing.roleId,
        active: existing.active,
      },
      newValue: {
        fullName: updated.fullName,
        phone: updated.phone,
        jobTitle: updated.jobTitle,
        roleId: updated.roleId,
        active: updated.active,
      },
    })

    return updated
  }

  async delete(ctx: ActorContext, id: string) {
    const existing = await this.getOneOrThrow(ctx.organizationId, id)

    await this.employees.softDelete(id, existing.user?.id ?? null)

    await this.auditLog.record({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      action: 'DELETE',
      entityName: 'Employee',
      entityId: id,
      oldValue: { fullName: existing.fullName },
    })
  }
}
