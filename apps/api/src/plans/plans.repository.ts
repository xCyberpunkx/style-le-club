import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.module'
import type { CreatePlanInput, UpdatePlanInput } from '@style-le-club/shared'

@Injectable()
export class PlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(organizationId: string, skip: number, take: number, search?: string, activeOnly?: boolean) {
    return this.prisma.plan.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(activeOnly ? { active: true } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    })
  }

  async count(organizationId: string, search?: string, activeOnly?: boolean) {
    return this.prisma.plan.count({
      where: {
        organizationId,
        deletedAt: null,
        ...(activeOnly ? { active: true } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
    })
  }

  async findById(organizationId: string, id: string) {
    return this.prisma.plan.findFirst({ where: { id, organizationId, deletedAt: null } })
  }

  async create(organizationId: string, input: CreatePlanInput) {
    return this.prisma.plan.create({
      data: {
        organizationId,
        name: input.name,
        description: input.description,
        durationDays: input.durationDays,
        price: input.price,
        allowsLinkedMembers: input.allowsLinkedMembers,
        maxLinkedMembers: input.maxLinkedMembers,
        isPopular: input.isPopular,
      },
    })
  }

  async update(id: string, input: UpdatePlanInput) {
    return this.prisma.plan.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.durationDays !== undefined ? { durationDays: input.durationDays } : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.allowsLinkedMembers !== undefined
          ? { allowsLinkedMembers: input.allowsLinkedMembers }
          : {}),
        ...(input.maxLinkedMembers !== undefined ? { maxLinkedMembers: input.maxLinkedMembers } : {}),
        ...(input.isPopular !== undefined ? { isPopular: input.isPopular } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    })
  }

  /**
   * Archive, don't erase — every past Subscription still needs to resolve
   * its planId (blueprint section 4 soft-delete convention).
   */
  async softDelete(id: string) {
    return this.prisma.plan.update({ where: { id }, data: { deletedAt: new Date(), active: false } })
  }
}
