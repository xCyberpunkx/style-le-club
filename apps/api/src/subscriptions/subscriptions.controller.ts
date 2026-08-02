import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common'
import {
  createSubscriptionSchema,
  renewSubscriptionSchema,
  subscriptionListQuerySchema,
  type CreateSubscriptionInput,
  type RenewSubscriptionInput,
  type SubscriptionListQuery,
} from '@style-le-club/shared'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import type { AuthenticatedUser } from '../auth/authenticated-user.interface'
import { SubscriptionsService } from './subscriptions.service'
import { toSubscriptionResponse } from './subscription-response.mapper'

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get()
  @RequirePermission('subscriptions.view')
  async list(
    @Query(new ZodValidationPipe(subscriptionListQuerySchema)) query: SubscriptionListQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { data, meta } = await this.subscriptions.list(user.organizationId, query)
    return { data: data.map(toSubscriptionResponse), meta }
  }

  @Get(':id')
  @RequirePermission('subscriptions.view')
  async getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const subscription = await this.subscriptions.getOneOrThrow(user.organizationId, id)
    return { data: toSubscriptionResponse(subscription) }
  }

  @Post()
  @RequirePermission('subscriptions.create')
  async create(
    @Body(new ZodValidationPipe(createSubscriptionSchema)) body: CreateSubscriptionInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const subscription = await this.subscriptions.create(
      { organizationId: user.organizationId, actorUserId: user.sub },
      body,
    )
    return { data: toSubscriptionResponse(subscription) }
  }

  @Post(':id/renew')
  @RequirePermission('subscriptions.create')
  async renew(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(renewSubscriptionSchema)) body: RenewSubscriptionInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const subscription = await this.subscriptions.renew(
      { organizationId: user.organizationId, actorUserId: user.sub },
      id,
      body,
    )
    return { data: toSubscriptionResponse(subscription) }
  }

  @Post(':id/freeze')
  @RequirePermission('subscriptions.update')
  async freeze(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const subscription = await this.subscriptions.freeze(
      { organizationId: user.organizationId, actorUserId: user.sub },
      id,
    )
    return { data: toSubscriptionResponse(subscription) }
  }

  @Post(':id/unfreeze')
  @RequirePermission('subscriptions.update')
  async unfreeze(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const subscription = await this.subscriptions.unfreeze(
      { organizationId: user.organizationId, actorUserId: user.sub },
      id,
    )
    return { data: toSubscriptionResponse(subscription) }
  }

  @Post(':id/cancel')
  @RequirePermission('subscriptions.delete')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const subscription = await this.subscriptions.cancel(
      { organizationId: user.organizationId, actorUserId: user.sub },
      id,
    )
    return { data: toSubscriptionResponse(subscription) }
  }
}
