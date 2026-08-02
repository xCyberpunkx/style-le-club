import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import {
  createPlanSchema,
  planListQuerySchema,
  updatePlanSchema,
  type CreatePlanInput,
  type PlanListQuery,
  type UpdatePlanInput,
} from '@style-le-club/shared'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import type { AuthenticatedUser } from '../auth/authenticated-user.interface'
import { PlansService } from './plans.service'
import { toPlanResponse } from './plan-response.mapper'

@Controller('plans')
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  @RequirePermission('plans.view')
  async list(
    @Query(new ZodValidationPipe(planListQuerySchema)) query: PlanListQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { data, meta } = await this.plans.list(user.organizationId, query)
    return { data: data.map(toPlanResponse), meta }
  }

  @Get(':id')
  @RequirePermission('plans.view')
  async getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const plan = await this.plans.getOneOrThrow(user.organizationId, id)
    return { data: toPlanResponse(plan) }
  }

  @Post()
  @RequirePermission('plans.create')
  async create(
    @Body(new ZodValidationPipe(createPlanSchema)) body: CreatePlanInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const plan = await this.plans.create(
      { organizationId: user.organizationId, actorUserId: user.sub },
      body,
    )
    return { data: toPlanResponse(plan) }
  }

  @Patch(':id')
  @RequirePermission('plans.update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePlanSchema)) body: UpdatePlanInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const plan = await this.plans.update(
      { organizationId: user.organizationId, actorUserId: user.sub },
      id,
      body,
    )
    return { data: toPlanResponse(plan) }
  }

  @Delete(':id')
  @RequirePermission('plans.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.plans.delete({ organizationId: user.organizationId, actorUserId: user.sub }, id)
  }
}
