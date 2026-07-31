import { z } from 'zod'
import { paginationQuerySchema } from './pagination'

export const createRoleSchema = z.object({
  name: z.string().trim().min(2, 'Role name is required').max(80),
})
export type CreateRoleInput = z.infer<typeof createRoleSchema>

export const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(80),
})
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>

export const roleListQuerySchema = paginationQuerySchema
export type RoleListQuery = z.infer<typeof roleListQuerySchema>

/**
 * Sets a Role's full permission set in one call (replace, not patch) — the
 * frontend's permission-matrix UI naturally produces "here is the complete
 * list this role should have now" rather than an incremental diff.
 */
export const assignRolePermissionsSchema = z.object({
  permissionKeys: z.array(z.string().min(1)).max(200),
})
export type AssignRolePermissionsInput = z.infer<typeof assignRolePermissionsSchema>
