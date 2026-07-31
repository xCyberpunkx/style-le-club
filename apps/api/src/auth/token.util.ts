import { randomBytes, createHash } from 'crypto'

/**
 * Refresh tokens are opaque random strings, NOT JWTs — unlike access
 * tokens, they must be revocable by server-side lookup (log out this
 * device, revoke all sessions), which a self-contained signed JWT can't
 * do without an additional denylist anyway. Simpler to make the
 * revocable case the only case.
 */
export function generateOpaqueToken(): string {
  return randomBytes(48).toString('base64url')
}

/**
 * SHA-256 is intentionally used here, not argon2 — this hashes a
 * high-entropy 48-byte random token (not a human password), so there's no
 * offline brute-force risk to defend against with a slow hash. Argon2 is
 * reserved for actual user passwords in auth.service.ts.
 */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}
