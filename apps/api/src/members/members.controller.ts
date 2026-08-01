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
  createMemberSchema,
  memberListQuerySchema,
  updateMemberSchema,
  type CreateMemberInput,
  type MemberListQuery,
  type UpdateMemberInput,
} from '@style-le-club/shared'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import type { AuthenticatedUser } from '../auth/authenticated-user.interface'
import { MembersService } from './members.service'
import { toMemberResponse } from './member-response.mapper'

// NOTE: pipes are bound per-parameter, not method-level — see
// employees.controller.ts for why (a method-level pipe also runs against
// @CurrentUser(), silently validating the wrong object).

@Controller('members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @RequirePermission('members.view')
  async list(
    @Query(new ZodValidationPipe(memberListQuerySchema)) query: MemberListQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { data, meta } = await this.members.list(user.organizationId, query)
    return { data: data.map(toMemberResponse), meta }
  }

  @Get(':id')
  @RequirePermission('members.view')
  async getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const member = await this.members.getOneOrThrow(user.organizationId, id)
    return { data: toMemberResponse(member) }
  }

  @Post()
  @RequirePermission('members.create')
  async create(
    @Body(new ZodValidationPipe(createMemberSchema)) body: CreateMemberInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const member = await this.members.create(
      { organizationId: user.organizationId, actorUserId: user.sub },
      body,
    )
    return { data: toMemberResponse(member) }
  }

  @Patch(':id')
  @RequirePermission('members.update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateMemberSchema)) body: UpdateMemberInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const member = await this.members.update(
      { organizationId: user.organizationId, actorUserId: user.sub },
      id,
      body,
    )
    return { data: toMemberResponse(member) }
  }

  @Delete(':id')
  @RequirePermission('members.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.members.delete({ organizationId: user.organizationId, actorUserId: user.sub }, id)
  }
}
