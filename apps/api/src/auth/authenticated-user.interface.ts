/**
 * Shape of the access token payload, attached to `request.user` by
 * JwtAuthGuard. Permissions are embedded directly in the token (refreshed
 * every time a new access token is minted, at most every 15 minutes) rather
 * than queried from the database on every request — see auth.service.ts.
 */
export interface AuthenticatedUser {
  sub: string // User.id
  organizationId: string
  employeeId: string | null
  permissions: string[]
}
