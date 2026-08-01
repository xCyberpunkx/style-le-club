import type { Prisma } from '@prisma/client'

interface MemberEntity {
  id: string
  memberCode: string
  fullName: string
  phone: string
  email: string | null
  dateOfBirth: Date | null
  weightKg: Prisma.Decimal | null
  heightCm: Prisma.Decimal | null
  goal: string | null
  joinDate: Date
  active: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * weightKg/heightCm come back from Prisma as Decimal instances (exact
 * numeric type, correctly avoiding float rounding at the DB layer) — this
 * mapper converts them to plain `number` for the API response, since the
 * frontend has no reason to deal with a Decimal wrapper type over values
 * this small. Same seam as employee-response.mapper.ts: the place field
 * shaping changes if the contract needs to diverge from the ORM shape.
 */
export function toMemberResponse(member: MemberEntity) {
  return {
    id: member.id,
    memberCode: member.memberCode,
    fullName: member.fullName,
    phone: member.phone,
    email: member.email,
    dateOfBirth: member.dateOfBirth,
    weightKg: member.weightKg !== null ? Number(member.weightKg) : null,
    heightCm: member.heightCm !== null ? Number(member.heightCm) : null,
    goal: member.goal,
    joinDate: member.joinDate,
    active: member.active,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  }
}
