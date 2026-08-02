import { Module } from '@nestjs/common'
import { SubscriptionsController } from './subscriptions.controller'
import { SubscriptionsService } from './subscriptions.service'
import { SubscriptionsRepository } from './subscriptions.repository'
import { PlansModule } from '../plans/plans.module'
import { MembersModule } from '../members/members.module'

@Module({
  imports: [PlansModule, MembersModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionsRepository],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
