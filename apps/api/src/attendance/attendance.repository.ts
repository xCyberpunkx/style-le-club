import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.module'

const attendanceInclude = {
  member: true,
} satisfies Prisma.AttendanceRecordInclude

export type AttendanceRecordWithMember = Prisma.AttendanceRecordGetPayload<{
  include: typeof attendanceInclude
}>

interface AttendanceFilters {
  memberId?: string
  open?: boolean
}

function buildWhere(organizationId: string, filters: AttendanceFilters): Prisma.AttendanceRecordWhereInput {
  return {
    organizationId,
    ...(filters.memberId ? { memberId: filters.memberId } : {}),
    ...(filters.open ? { checkOutAt: null } : {}),
  }
}

@Injectable()
export class AttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    organizationId: string,
    skip: number,
    take: number,
    filters: AttendanceFilters,
  ): Promise<AttendanceRecordWithMember[]> {
    return this.prisma.attendanceRecord.findMany({
      where: buildWhere(organizationId, filters),
      include: attendanceInclude,
      orderBy: { checkInAt: 'desc' },
      skip,
      take,
    })
  }

  async count(organizationId: string, filters: AttendanceFilters) {
    return this.prisma.attendanceRecord.count({ where: buildWhere(organizationId, filters) })
  }

  /**
   * The exact lookup both checkIn() and checkOut() need first: does this
   * member currently have an open (not yet checked out) record? At most
   * one should ever exist per member — enforced by checkIn() refusing to
   * create a second one, not by a DB constraint (Postgres can't express
   * "at most one NULL per memberId" as a simple unique index without a
   * partial index, which felt like more ceremony than this needs right
   * now; worth revisiting if this ever needs to be bulletproof against
   * concurrent double-taps rather than just the ordinary single-request
   * case).
   */
  async findOpenForMember(organizationId: string, memberId: string): Promise<AttendanceRecordWithMember | null> {
    return this.prisma.attendanceRecord.findFirst({
      where: { organizationId, memberId, checkOutAt: null },
      include: attendanceInclude,
      orderBy: { checkInAt: 'desc' },
    })
  }

  async create(organizationId: string, memberId: string): Promise<AttendanceRecordWithMember> {
    return this.prisma.attendanceRecord.create({
      data: { organizationId, memberId, method: 'MANUAL' },
      include: attendanceInclude,
    })
  }

  async checkOut(id: string): Promise<AttendanceRecordWithMember> {
    return this.prisma.attendanceRecord.update({
      where: { id },
      data: { checkOutAt: new Date() },
      include: attendanceInclude,
    })
  }
}
