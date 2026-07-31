interface EmployeeWithRelations {
  id: string
  organizationId: string
  fullName: string
  phone: string | null
  jobTitle: string | null
  hireDate: Date | null
  active: boolean
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  roleId: string | null
  role: { id: string; name: string } | null
  user: { id: string; email: string; isActive: boolean } | null
}

/**
 * The repository's `include` already selects only { id, email, isActive }
 * off User (never passwordHash) — this mapper exists mainly to give the
 * frontend a stable, explicit response contract rather than "whatever
 * Prisma happened to return," and is the seam where field-level shaping
 * changes if the contract needs to diverge from the ORM shape later.
 */
export function toEmployeeResponse(employee: EmployeeWithRelations) {
  return {
    id: employee.id,
    fullName: employee.fullName,
    phone: employee.phone,
    jobTitle: employee.jobTitle,
    hireDate: employee.hireDate,
    active: employee.active,
    role: employee.role,
    account: employee.user ? { email: employee.user.email, isActive: employee.user.isActive } : null,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  }
}
