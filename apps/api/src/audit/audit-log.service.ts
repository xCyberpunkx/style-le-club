import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.module'

interface RecordAuditEntryInput {
  organizationId: string
  actorUserId: string | null
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  entityName: string
  entityId: string
  oldValue?: unknown
  newValue?: unknown
}

/**
 * Every sensitive action (payments, role changes, permission changes,
 * employee changes) writes an AuditLog row — actor, action, entity,
 * before/after snapshot. No exceptions (blueprint section 4/development
 * rules). Centralized here so every module calls the same code path
 * instead of hand-rolling `prisma.auditLog.create` per service.
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditEntryInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: input.action,
        entityName: input.entityName,
        entityId: input.entityId,
        oldValue: input.oldValue === undefined ? undefined : (input.oldValue as object),
        newValue: input.newValue === undefined ? undefined : (input.newValue as object),
      },
    })
  }
}
