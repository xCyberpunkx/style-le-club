import { Module } from '@nestjs/common'
import { AttendanceController } from './attendance.controller'
import { AttendanceService } from './attendance.service'
import { AttendanceRepository } from './attendance.repository'
import { ACCESS_CONTROL_ADAPTER } from './access-control/access-control-adapter.interface'
import { MockAccessControlAdapter } from './access-control/mock-access-control.adapter'
import { MembersModule } from '../members/members.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'

@Module({
  imports: [MembersModule, SubscriptionsModule],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    AttendanceRepository,
    // The one line that changes when real hardware integration lands —
    // see access-control-adapter.interface.ts.
    { provide: ACCESS_CONTROL_ADAPTER, useClass: MockAccessControlAdapter },
  ],
  exports: [AttendanceService],
})
export class AttendanceModule {}
