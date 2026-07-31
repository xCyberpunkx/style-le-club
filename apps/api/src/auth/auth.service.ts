import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as argon2 from 'argon2'
import { PrismaService } from '../prisma/prisma.module'
import { env } from '../config/env'
import { generateOpaqueToken, hashToken } from './token.util'
import type { AuthenticatedUser } from './authenticated-user.interface'

interface DeviceContext {
  deviceInfo?: string
  ipAddress?: string
}

interface TokenPair {
  accessToken: string
  refreshToken: string
}

// Shared Prisma include shape — the same "load this user with their
// role's permissions" query is needed by both login and refresh, and
// duplicating it invites the two paths to quietly drift apart.
const userWithPermissionsInclude = {
  employee: {
    include: {
      role: {
        include: { permissions: true },
      },
    },
  },
} as const

function toAuthenticatedUser(user: {
  id: string
  organizationId: string
  employee: { id: string; role: { permissions: { permissionKey: string }[] } | null } | null
}): AuthenticatedUser {
  return {
    sub: user.id,
    organizationId: user.organizationId,
    employeeId: user.employee?.id ?? null,
    permissions: user.employee?.role?.permissions.map((p) => p.permissionKey) ?? [],
  }
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private signAccessToken(payload: AuthenticatedUser): string {
    return this.jwt.sign(payload, {
      secret: env.JWT_ACCESS_SECRET,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN_MINUTES * 60, // seconds — jsonwebtoken's typed expiresIn wants a number or a branded duration string, a plain number sidesteps that entirely
    })
  }

  private async issueRefreshToken(userId: string, ctx: DeviceContext): Promise<string> {
    const rawToken = generateOpaqueToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + env.JWT_REFRESH_EXPIRES_IN_DAYS)

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(rawToken),
        deviceInfo: ctx.deviceInfo ?? null,
        ipAddress: ctx.ipAddress ?? null,
        expiresAt,
      },
    })

    return rawToken
  }

  async login(email: string, password: string, ctx: DeviceContext): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: userWithPermissionsInclude,
    })

    // Deliberately identical error for "no such user" and "wrong password"
    // — never let a login endpoint reveal which part was wrong.
    const invalidCredentials = () => new UnauthorizedException('Invalid credentials.')

    if (!user || !user.isActive) throw invalidCredentials()

    const passwordValid = await argon2.verify(user.passwordHash, password)
    if (!passwordValid) throw invalidCredentials()

    const authenticatedUser = toAuthenticatedUser(user)
    const accessToken = this.signAccessToken(authenticatedUser)
    const refreshToken = await this.issueRefreshToken(user.id, ctx)

    return { accessToken, refreshToken }
  }

  async refresh(rawRefreshToken: string, ctx: DeviceContext): Promise<TokenPair> {
    const tokenHash = hashToken(rawRefreshToken)
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash } })

    const invalidToken = () => new UnauthorizedException('Invalid or expired refresh token.')

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw invalidToken()
    }

    const user = await this.prisma.user.findUnique({
      where: { id: existing.userId },
      include: userWithPermissionsInclude,
    })
    if (!user || !user.isActive) throw invalidToken()

    // Rotate: the old refresh token is invalidated the moment it's used,
    // whether or not this request is legitimate — this is what makes a
    // stolen-and-replayed refresh token detectable rather than silently
    // reusable forever.
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    })

    const authenticatedUser = toAuthenticatedUser(user)
    const accessToken = this.signAccessToken(authenticatedUser)
    const refreshToken = await this.issueRefreshToken(user.id, ctx)

    return { accessToken, refreshToken }
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken)
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash } })
    // Idempotent — logging out an already-invalid session is not an error.
    if (existing && !existing.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      })
    }
  }
}
