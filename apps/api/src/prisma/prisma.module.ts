import { Injectable, Module, OnModuleInit, OnModuleDestroy, Global } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '../config/env'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: new PrismaPg(env.DATABASE_URL) })
  }

  async onModuleInit() {
    try {
      await this.$connect()
    } catch (error) {
      // Do NOT rethrow — a database that's briefly unreachable at boot must
      // not crash the whole API process. The health check (and every real
      // query) will surface the actual connectivity state on demand instead.
      console.error(
        'Database connection failed at startup — API will still boot. ' +
          'Health check will report this as degraded until the database is reachable.',
        error instanceof Error ? error.message : error,
      )
    }
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
