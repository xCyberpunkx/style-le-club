import { Controller, Get } from '@nestjs/common'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { PermissionsService } from './permissions.service'

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get()
  @RequirePermission('permissions.view')
  async list() {
    const data = await this.permissions.list()
    return { data }
  }
}
