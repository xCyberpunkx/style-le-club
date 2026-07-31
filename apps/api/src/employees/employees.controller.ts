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
  createEmployeeSchema,
  employeeListQuerySchema,
  updateEmployeeSchema,
  type CreateEmployeeInput,
  type EmployeeListQuery,
  type UpdateEmployeeInput,
} from '@style-le-club/shared'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import type { AuthenticatedUser } from '../auth/authenticated-user.interface'
import { EmployeesService } from './employees.service'
import { toEmployeeResponse } from './employee-response.mapper'

// NOTE: pipes are bound per-parameter (@Body(new ZodValidationPipe(...)))
// rather than method-level (@UsePipes(...)) — see roles.controller.ts for
// why: a method-level pipe also runs against @CurrentUser(), silently
// validating the wrong object.

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  @RequirePermission('employees.view')
  async list(
    @Query(new ZodValidationPipe(employeeListQuerySchema)) query: EmployeeListQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { data, meta } = await this.employees.list(user.organizationId, query)
    return { data: data.map(toEmployeeResponse), meta }
  }

  @Get(':id')
  @RequirePermission('employees.view')
  async getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const employee = await this.employees.getOneOrThrow(user.organizationId, id)
    return { data: toEmployeeResponse(employee) }
  }

  @Post()
  @RequirePermission('employees.create')
  async create(
    @Body(new ZodValidationPipe(createEmployeeSchema)) body: CreateEmployeeInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const employee = await this.employees.create(
      { organizationId: user.organizationId, actorUserId: user.sub },
      body,
    )
    return { data: toEmployeeResponse(employee) }
  }

  @Patch(':id')
  @RequirePermission('employees.update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateEmployeeSchema)) body: UpdateEmployeeInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const employee = await this.employees.update(
      { organizationId: user.organizationId, actorUserId: user.sub },
      id,
      body,
    )
    return { data: toEmployeeResponse(employee) }
  }

  @Delete(':id')
  @RequirePermission('employees.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.employees.delete({ organizationId: user.organizationId, actorUserId: user.sub }, id)
  }
}
