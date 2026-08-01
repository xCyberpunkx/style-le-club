import { useCurrentUser } from './use-current-user'

/**
 * UX nicety only — hiding a button the user has no permission to use.
 * This is never a substitute for the backend's PermissionsGuard actually
 * enforcing the same check server-side (see blueprint section 6).
 */
export function usePermission(permission: string): boolean {
  const { data: user } = useCurrentUser()
  return user?.permissions.includes(permission) ?? false
}
