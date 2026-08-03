import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common'
import {
  createPaymentSchema,
  paymentListQuerySchema,
  type CreatePaymentInput,
  type PaymentListQuery,
} from '@style-le-club/shared'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import type { AuthenticatedUser } from '../auth/authenticated-user.interface'
import { PaymentsService } from './payments.service'
import { toPaymentResponse } from './payment-response.mapper'

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  @RequirePermission('payments.view')
  async list(
    @Query(new ZodValidationPipe(paymentListQuerySchema)) query: PaymentListQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { data, meta } = await this.payments.list(user.organizationId, query)
    return { data: data.map(toPaymentResponse), meta }
  }

  @Get(':id')
  @RequirePermission('payments.view')
  async getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const payment = await this.payments.getOneOrThrow(user.organizationId, id)
    return { data: toPaymentResponse(payment) }
  }

  @Post()
  @RequirePermission('payments.create')
  async create(
    @Body(new ZodValidationPipe(createPaymentSchema)) body: CreatePaymentInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const payment = await this.payments.create(
      { organizationId: user.organizationId, actorUserId: user.sub },
      body,
    )
    return { data: toPaymentResponse(payment) }
  }

  // No update/delete route — a recorded Payment is immutable; refund is
  // the only supported state transition (see schema.prisma comment).
  @Post(':id/refund')
  @RequirePermission('payments.refund')
  @HttpCode(HttpStatus.OK)
  async refund(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const payment = await this.payments.refund(
      { organizationId: user.organizationId, actorUserId: user.sub },
      id,
    )
    return { data: toPaymentResponse(payment) }
  }
}
