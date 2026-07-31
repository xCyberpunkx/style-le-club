import { Controller, Post, Body, Req, Res, UnauthorizedException } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { Public } from '../common/decorators/public.decorator'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { loginSchema, type LoginInput } from '@style-le-club/shared'
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  AUTH_COOKIE_PATH,
} from './cookie.constants'
import { env } from '../config/env'

function deviceContextFrom(req: Request) {
  return {
    deviceInfo: req.headers['user-agent'],
    ipAddress: req.ip,
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const secure = env.NODE_ENV === 'production'

    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: env.JWT_ACCESS_EXPIRES_IN_MINUTES * 60 * 1000, // cookie expiry is just cleanup — the JWT's own exp claim is what actually matters
    })

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: AUTH_COOKIE_PATH,
      maxAge: env.JWT_REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
    })
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie(ACCESS_TOKEN_COOKIE)
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: AUTH_COOKIE_PATH })
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // blunt brute-force attempts specifically here
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.auth.login(
      body.email,
      body.password,
      deviceContextFrom(req),
    )
    this.setAuthCookies(res, accessToken, refreshToken)
    return { data: { loggedIn: true } }
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE]
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new UnauthorizedException('No refresh token provided.')
    }

    const { accessToken, refreshToken } = await this.auth.refresh(
      rawRefreshToken,
      deviceContextFrom(req),
    )
    this.setAuthCookies(res, accessToken, refreshToken)
    return { data: { refreshed: true } }
  }

  @Public()
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE]
    if (rawRefreshToken && typeof rawRefreshToken === 'string') {
      await this.auth.logout(rawRefreshToken)
    }
    this.clearAuthCookies(res)
    return { data: { loggedOut: true } }
  }
}
