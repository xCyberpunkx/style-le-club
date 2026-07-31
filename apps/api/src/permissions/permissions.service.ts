import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.module'

/**
 * Permission is a fixed, global system catalog (schema.prisma) — seeded via
 * seed.mjs, never created ad-hoc through the API. This module only exposes
 * read access, so an Admin's permission-matrix UI (for building/editing
 * Roles) knows the full set of assignable capability strings.
 */
@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.permission.findMany({ orderBy: { key: 'asc' } })
  }
}
