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
  Put,
  Query,
} from '@nestjs/common'
import {
  assignRolePermissionsSchema,
  createRoleSchema,
  roleListQuerySchema,
  updateRoleSchema,
  type AssignRolePermissionsInput,
  type CreateRoleInput,
  type RoleListQuery,
  type UpdateRoleInput,
} from '@style-le-club/shared'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import type { AuthenticatedUser } from '../auth/authenticated-user.interface'
import { RolesService } from './roles.service'

// NOTE: pipes are bound per-parameter (@Body(new ZodValidationPipe(...)))
// rather than method-level (@UsePipes(...)). A method-level pipe runs
// against EVERY parameter of the handler — including @CurrentUser(), since
// it's a custom decorator and not exempted the way @Req()/@Res() are. That
// silently fails required-field schemas against the user payload instead
// of the body. Scoping the pipe to @Body()/@Query() avoids this entirely.

@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermission('roles.view')
  async list(
    @Query(new ZodValidationPipe(roleListQuerySchema)) query: RoleListQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roles.list(user.organizationId, query)
  }

  @Get(':id')
  @RequirePermission('roles.view')
  async getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.roles.getOneOrThrow(user.organizationId, id)
    return { data }
  }

  @Post()
  @RequirePermission('roles.manage')
  async create(
    @Body(new ZodValidationPipe(createRoleSchema)) body: CreateRoleInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.roles.create(
      { organizationId: user.organizationId, actorUserId: user.sub },
      body.name,
    )
    return { data }
  }

  @Patch(':id')
  @RequirePermission('roles.manage')
  async rename(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateRoleSchema)) body: UpdateRoleInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.roles.rename(
      { organizationId: user.organizationId, actorUserId: user.sub },
      id,
      body.name,
    )
    return { data }
  }

  @Put(':id/permissions')
  @RequirePermission('permissions.manage')
  async setPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(assignRolePermissionsSchema)) body: AssignRolePermissionsInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.roles.setPermissions(
      { organizationId: user.organizationId, actorUserId: user.sub },
      id,
      body,
    )
    return { data }
  }

  @Delete(':id')
  @RequirePermission('roles.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.roles.delete({ organizationId: user.organizationId, actorUserId: user.sub }, id)
  }
}
