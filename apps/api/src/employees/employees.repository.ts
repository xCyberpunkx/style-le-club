import { Injectable } from '@nestjs/common'
import * as argon2 from 'argon2'
import { PrismaService } from '../prisma/prisma.module'
import type { CreateEmployeeInput, UpdateEmployeeInput } from '@style-le-club/shared'

const employeeInclude = {
  role: { select: { id: true, name: true } },
  user: { select: { id: true, email: true, isActive: true } },
} as const

@Injectable()
export class EmployeesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Soft-delete convention (blueprint section 4): normal queries transparently
  // exclude archived employees. Every method below filters deletedAt: null
  // unless explicitly stated otherwise.

  async findMany(organizationId: string, skip: number, take: number, search?: string) {
    return this.prisma.employee.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: employeeInclude,
      orderBy: { fullName: 'asc' },
      skip,
      take,
    })
  }

  async count(organizationId: string, search?: string) {
    return this.prisma.employee.count({
      where: {
        organizationId,
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    })
  }

  async findById(organizationId: string, id: string) {
    return this.prisma.employee.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: employeeInclude,
    })
  }

  async roleBelongsToOrg(organizationId: string, roleId: string): Promise<boolean> {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, organizationId } })
    return role !== null
  }

  /**
   * Creates the Employee profile and, if an `account` was supplied, the
   * linked login User in the same transaction — a half-created
   * employee-with-no-user (or vice versa) must never be possible.
   */
  async create(organizationId: string, input: CreateEmployeeInput) {
    return this.prisma.$transaction(async (tx) => {
      let userId: string | undefined

      if (input.account) {
        const passwordHash = await argon2.hash(input.account.password)
        const user = await tx.user.create({
          data: { organizationId, email: input.account.email, passwordHash },
        })
        userId = user.id
      }

      return tx.employee.create({
        data: {
          organizationId,
          userId,
          fullName: input.fullName,
          phone: input.phone,
          jobTitle: input.jobTitle,
          hireDate: input.hireDate,
          roleId: input.roleId,
        },
        include: employeeInclude,
      })
    })
  }

  async update(id: string, input: UpdateEmployeeInput) {
    return this.prisma.employee.update({
      where: { id },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle } : {}),
        ...(input.hireDate !== undefined ? { hireDate: input.hireDate } : {}),
        ...(input.roleId !== undefined ? { roleId: input.roleId } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
      include: employeeInclude,
    })
  }

  /**
   * Archive, don't erase (blueprint section 4). Also deactivates and signs
   * out any linked login account — a departed employee's session and
   * password must stop working immediately, not just their HR record.
   */
  async softDelete(id: string, userId: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.update({
        where: { id },
        data: { deletedAt: new Date(), active: false },
        include: employeeInclude,
      })

      if (userId) {
        await tx.user.update({ where: { id: userId }, data: { isActive: false } })
        await tx.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        })
      }

      return employee
    })
  }
}
