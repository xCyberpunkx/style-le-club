import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.module'
import type { CreateMemberInput, UpdateMemberInput } from '@style-le-club/shared'

@Injectable()
export class MembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Soft-delete convention (blueprint section 4): normal queries
  // transparently exclude archived members. Every method below filters
  // deletedAt: null unless explicitly stated otherwise.

  async findMany(organizationId: string, skip: number, take: number, search?: string) {
    return this.prisma.member.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { memberCode: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    })
  }

  async count(organizationId: string, search?: string) {
    return this.prisma.member.count({
      where: {
        organizationId,
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { memberCode: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    })
  }

  async findById(organizationId: string, id: string) {
    return this.prisma.member.findFirst({
      where: { id, organizationId, deletedAt: null },
    })
  }

  async create(organizationId: string, memberCode: string, input: CreateMemberInput) {
    return this.prisma.member.create({
      data: {
        organizationId,
        memberCode,
        fullName: input.fullName,
        phone: input.phone,
        email: input.email,
        dateOfBirth: input.dateOfBirth,
        weightKg: input.weightKg,
        heightCm: input.heightCm,
        goal: input.goal,
        ...(input.joinDate !== undefined ? { joinDate: input.joinDate } : {}),
      },
    })
  }

  async update(id: string, input: UpdateMemberInput) {
    return this.prisma.member.update({
      where: { id },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth } : {}),
        ...(input.weightKg !== undefined ? { weightKg: input.weightKg } : {}),
        ...(input.heightCm !== undefined ? { heightCm: input.heightCm } : {}),
        ...(input.goal !== undefined ? { goal: input.goal } : {}),
        ...(input.joinDate !== undefined ? { joinDate: input.joinDate } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    })
  }

  /**
   * Archive, don't erase (blueprint section 4) — a member's check-in,
   * payment, and appointment history must survive them leaving the club.
   */
  async softDelete(id: string) {
    return this.prisma.member.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    })
  }
}
