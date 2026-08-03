import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { PrismaModule } from './prisma/prisma.module'
import { HealthModule } from './health/health.module'
import { AuthModule } from './auth/auth.module'
import { AuditLogModule } from './audit/audit-log.module'
import { CountersModule } from './common/counters/counters.module'
import { EmployeesModule } from './employees/employees.module'
import { RolesModule } from './roles/roles.module'
import { PermissionsModule } from './permissions/permissions.module'
import { MembersModule } from './members/members.module'
import { PlansModule } from './plans/plans.module'
import { SubscriptionsModule } from './subscriptions/subscriptions.module'
import { PaymentsModule } from './payments/payments.module'
import { AttendanceModule } from './attendance/attendance.module'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { PermissionsGuard } from './common/guards/permissions.guard'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]), // global default; login overrides this more strictly
    PrismaModule,
    AuditLogModule,
    CountersModule,
    HealthModule,
    AuthModule,
    EmployeesModule,
    RolesModule,
    PermissionsModule,
    MembersModule,
    PlansModule,
    SubscriptionsModule,
    PaymentsModule,
    AttendanceModule,
  ],
  providers: [
    // Order matters: rate-limit first, then authenticate, then authorize.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    // Normalizes every error response to { error: { code, message } } —
    // see common/filters/http-exception.filter.ts.
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
