import { Controller, Get, Module, HttpStatus, Res } from '@nestjs/common'
import type { Response } from 'express'
import { PrismaService } from '../prisma/prisma.module'
import { Public } from '../common/decorators/public.decorator'

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check(@Res() res: Response) {
    const base = { status: 'ok', timestamp: new Date().toISOString() }

    try {
      await this.prisma.$queryRaw`SELECT 1`
      return res.status(HttpStatus.OK).json({ ...base, database: 'connected' })
    } catch (error) {
      // The API itself booted fine even if the database is unreachable —
      // report that distinction clearly rather than crashing the process.
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        ...base,
        status: 'degraded',
        database: 'unreachable',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
