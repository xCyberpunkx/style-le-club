import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common'
import {
  attendanceListQuerySchema,
  checkInSchema,
  checkOutSchema,
  type AttendanceListQuery,
  type CheckInInput,
  type CheckOutInput,
} from '@style-le-club/shared'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import type { AuthenticatedUser } from '../auth/authenticated-user.interface'
import { AttendanceService } from './attendance.service'
import { toAttendanceResponse } from './attendance-response.mapper'

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get()
  @RequirePermission('attendance.view')
  async list(
    @Query(new ZodValidationPipe(attendanceListQuerySchema)) query: AttendanceListQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { data, meta } = await this.attendance.list(user.organizationId, query)
    return { data: data.map(toAttendanceResponse), meta }
  }

  @Post('check-in')
  @RequirePermission('attendance.manage')
  async checkIn(
    @Body(new ZodValidationPipe(checkInSchema)) body: CheckInInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const record = await this.attendance.checkIn(
      { organizationId: user.organizationId, actorUserId: user.sub },
      body.memberId,
    )
    return { data: toAttendanceResponse(record) }
  }

  @Post('check-out')
  @RequirePermission('attendance.manage')
  @HttpCode(HttpStatus.OK)
  async checkOut(
    @Body(new ZodValidationPipe(checkOutSchema)) body: CheckOutInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const record = await this.attendance.checkOut(
      { organizationId: user.organizationId, actorUserId: user.sub },
      body.memberId,
    )
    return { data: toAttendanceResponse(record) }
  }
}
