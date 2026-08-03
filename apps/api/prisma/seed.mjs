import 'dotenv/config'
import argon2 from 'argon2'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg(process.env.DATABASE_URL)
const prisma = new PrismaClient({ adapter })

// Phase 1 scope only — more permission keys get added here as each later
// module (Members, Payments, POS, ...) is actually built. Not seeding
// speculative permissions for modules that don't exist yet.
const PERMISSIONS = [
  { key: 'employees.view', description: 'View employee profiles' },
  { key: 'employees.create', description: 'Create employees' },
  { key: 'employees.update', description: 'Edit employees' },
  { key: 'employees.delete', description: 'Deactivate/delete employees' },
  { key: 'roles.view', description: 'View roles' },
  { key: 'roles.manage', description: 'Create, edit, and assign roles' },
  { key: 'permissions.view', description: 'View the permission catalog' },
  { key: 'permissions.manage', description: 'Assign permissions to roles' },
  { key: 'members.view', description: 'View member profiles' },
  { key: 'members.create', description: 'Create members' },
  { key: 'members.update', description: 'Edit members' },
  { key: 'members.delete', description: 'Deactivate/archive members' },
  { key: 'plans.view', description: 'View membership plans' },
  { key: 'plans.create', description: 'Create membership plans' },
  { key: 'plans.update', description: 'Edit membership plans' },
  { key: 'plans.delete', description: 'Archive membership plans' },
  { key: 'subscriptions.view', description: 'View member subscriptions' },
  { key: 'subscriptions.create', description: 'Subscribe/renew/upgrade a member' },
  { key: 'subscriptions.update', description: 'Freeze/unfreeze a subscription' },
  { key: 'subscriptions.delete', description: 'Cancel a subscription' },
  // Payments has no update/delete key — a recorded payment is immutable
  // and there's no route to edit or hard-delete one (see the Payment
  // model comment in schema.prisma). "refund" replaces them as the one
  // real state transition a Payment can undergo after creation.
  { key: 'payments.view', description: 'View payments' },
  { key: 'payments.create', description: 'Record a payment' },
  { key: 'payments.refund', description: 'Refund a payment' },
  // Attendance also skips the view/create/update/delete template —
  // check-in and check-out are two halves of the same routine front-desk
  // action, performed by the same role, so one "manage" key covers both
  // rather than splitting hairs between create/update for a table with
  // no meaningful update outside that lifecycle.
  { key: 'attendance.view', description: 'View attendance records' },
  { key: 'attendance.manage', description: 'Check members in and out' },
]

const DEFAULT_ADMIN = {
  email: 'admin@styleleclub.local',
  password: 'ChangeMe123!', // change immediately after first login
  fullName: 'Administrateur',
}

async function main() {
  // 1. Global permission catalog — upsert so re-running the seed is safe.
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { description: perm.description },
      create: perm,
    })
  }
  console.log(`Seeded ${PERMISSIONS.length} permissions.`)

  // 2. The organization (tenant). Style Le Club is the first row here —
  // the schema supports more, but we only create this one today.
  const org = await prisma.organization.upsert({
    where: { slug: 'style-le-club' },
    update: {},
    create: { name: 'Style Le Club', slug: 'style-le-club' },
  })

  // 3. A default "Administrateur" role for this org, granted every
  // seeded permission.
  const adminRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Administrateur' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Administrateur',
      isSystemDefault: true,
    },
  })

  for (const perm of PERMISSIONS) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionKey: { roleId: adminRole.id, permissionKey: perm.key } },
      update: {},
      create: { roleId: adminRole.id, permissionKey: perm.key },
    })
  }

  // 4. Default admin User + linked Employee.
  const existingUser = await prisma.user.findUnique({ where: { email: DEFAULT_ADMIN.email } })
  if (existingUser) {
    console.log(`Admin user "${DEFAULT_ADMIN.email}" already exists — skipping.`)
  } else {
    const passwordHash = await argon2.hash(DEFAULT_ADMIN.password)
    const user = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: DEFAULT_ADMIN.email,
        passwordHash,
      },
    })
    await prisma.employee.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        fullName: DEFAULT_ADMIN.fullName,
        roleId: adminRole.id,
      },
    })
    console.log('----------------------------------------')
    console.log('Seeded default admin user:')
    console.log(`  email:    ${DEFAULT_ADMIN.email}`)
    console.log(`  password: ${DEFAULT_ADMIN.password}`)
    console.log('Change this after logging in for the first time.')
    console.log('----------------------------------------')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
