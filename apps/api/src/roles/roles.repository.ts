import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.module'

const roleWithPermissionsInclude = {
  permissions: { include: { permission: true } },
  _count: { select: { employees: true } },
} as const

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(organizationId: string, skip: number, take: number) {
    return this.prisma.role.findMany({
      where: { organizationId },
      include: roleWithPermissionsInclude,
      orderBy: { name: 'asc' },
      skip,
      take,
    })
  }

  async count(organizationId: string) {
    return this.prisma.role.count({ where: { organizationId } })
  }

  async findById(organizationId: string, id: string) {
    return this.prisma.role.findFirst({
      where: { id, organizationId },
      include: roleWithPermissionsInclude,
    })
  }

  async findByName(organizationId: string, name: string) {
    return this.prisma.role.findUnique({
      where: { organizationId_name: { organizationId, name } },
    })
  }

  async create(organizationId: string, name: string) {
    return this.prisma.role.create({
      data: { organizationId, name },
      include: roleWithPermissionsInclude,
    })
  }

  async rename(id: string, name: string) {
    return this.prisma.role.update({
      where: { id },
      data: { name },
      include: roleWithPermissionsInclude,
    })
  }

  async delete(id: string) {
    return this.prisma.role.delete({ where: { id } })
  }

  async findExistingPermissionKeys(keys: string[]) {
    const found = await this.prisma.permission.findMany({
      where: { key: { in: keys } },
      select: { key: true },
    })
    return new Set(found.map((p) => p.key))
  }

  /** Replaces a role's full permission set atomically. */
  async setPermissions(roleId: string, permissionKeys: string[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } })
      if (permissionKeys.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionKeys.map((permissionKey) => ({ roleId, permissionKey })),
        })
      }
      return tx.role.findUniqueOrThrow({
        where: { id: roleId },
        include: roleWithPermissionsInclude,
      })
    })
  }
}
