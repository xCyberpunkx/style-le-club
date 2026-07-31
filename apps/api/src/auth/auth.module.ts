import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'

@Module({
  // No default secret registered here — access and refresh flows each pass
  // their own secret explicitly per sign()/verify() call (see auth.service.ts
  // and jwt-auth.guard.ts), so there's no ambiguity about which secret is
  // in effect for which token type.
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService],
  // JwtModule is exported too, not just AuthService — AppModule registers
  // JwtAuthGuard as a GLOBAL guard, and that guard depends on JwtService.
  // Without re-exporting JwtModule here, AppModule's injector scope has no
  // way to resolve that dependency.
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
