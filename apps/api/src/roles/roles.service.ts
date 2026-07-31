import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { AssignRolePermissionsInput, PaginationQuery } from '@style-le-club/shared'
import { buildPaginationMeta, paginationSkipTake } from '../common/pagination/pagination.util'
import { AuditLogService } from '../audit/audit-log.service'
import { RolesRepository } from './roles.repository'

interface ActorContext {
  organizationId: string
  actorUserId: string | null
}

@Injectable()
export class RolesService {
  constructor(
    private readonly roles: RolesRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(organizationId: string, query: PaginationQuery) {
    const { skip, take } = paginationSkipTake(query)
    const [data, total] = await Promise.all([
      this.roles.findMany(organizationId, skip, take),
      this.roles.count(organizationId),
    ])
    return { data, meta: buildPaginationMeta(query, total) }
  }

  async getOneOrThrow(organizationId: string, id: string) {
    const role = await this.roles.findById(organizationId, id)
    if (!role) throw new NotFoundException('Role not found.')
    return role
  }

  async create(ctx: ActorContext, name: string) {
    const existing = await this.roles.findByName(ctx.organizationId, name)
    if (existing) throw new ConflictException('A role with this name already exists.')

    const role = await this.roles.create(ctx.organizationId, name)

    await this.auditLog.record({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      action: 'CREATE',
      entityName: 'Role',
      entityId: role.id,
      newValue: { name: role.name },
    })

    return role
  }

  async rename(ctx: ActorContext, id: string, name: string) {
    const existing = await this.getOneOrThrow(ctx.organizationId, id)

    const conflicting = await this.roles.findByName(ctx.organizationId, name)
    if (conflicting && conflicting.id !== id) {
      throw new ConflictException('A role with this name already exists.')
    }

    const updated = await this.roles.rename(id, name)

    await this.auditLog.record({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      action: 'UPDATE',
      entityName: 'Role',
      entityId: id,
      oldValue: { name: existing.name },
      newValue: { name: updated.name },
    })

    return updated
  }

  async delete(ctx: ActorContext, id: string) {
    const existing = await this.getOneOrThrow(ctx.organizationId, id)

    if (existing.isSystemDefault) {
      throw new ForbiddenException('The default Administrateur role cannot be deleted.')
    }
    if (existing._count.employees > 0) {
      throw new ConflictException(
        'This role is still assigned to employees. Reassign them before deleting it.',
      )
    }

    await this.roles.delete(id)

    await this.auditLog.record({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      action: 'DELETE',
      entityName: 'Role',
      entityId: id,
      oldValue: { name: existing.name },
    })
  }

  async setPermissions(ctx: ActorContext, id: string, input: AssignRolePermissionsInput) {
    const existing = await this.getOneOrThrow(ctx.organizationId, id)

    const uniqueKeys = Array.from(new Set(input.permissionKeys))
    const validKeys = await this.roles.findExistingPermissionKeys(uniqueKeys)
    const unknownKeys = uniqueKeys.filter((key) => !validKeys.has(key))
    if (unknownKeys.length > 0) {
      throw new BadRequestException(`Unknown permission key(s): ${unknownKeys.join(', ')}`)
    }

    const updated = await this.roles.setPermissions(id, uniqueKeys)

    await this.auditLog.record({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      action: 'UPDATE',
      entityName: 'Role',
      entityId: id,
      oldValue: { permissions: existing.permissions.map((p) => p.permissionKey) },
      newValue: { permissions: uniqueKeys },
    })

    return updated
  }
}
