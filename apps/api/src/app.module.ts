import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { PrismaModule } from './prisma/prisma.module'
import { HealthModule } from './health/health.module'
import { AuthModule } from './auth/auth.module'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { PermissionsGuard } from './common/guards/permissions.guard'

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]), // global default; login overrides this more strictly
    PrismaModule,
    HealthModule,
    AuthModule,
  ],
  providers: [
    // Order matters: rate-limit first, then authenticate, then authorize.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
