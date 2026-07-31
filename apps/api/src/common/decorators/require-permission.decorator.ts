import { SetMetadata } from '@nestjs/common'

export const REQUIRED_PERMISSION_KEY = 'requiredPermission'

/**
 * Declares the permission key a route requires (e.g. 'employees.create').
 * Checked by PermissionsGuard against the permissions embedded in the
 * caller's access token — see auth.service.ts for why permissions are
 * embedded in the token rather than queried per-request.
 */
export const RequirePermission = (permission: string) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, permission)
