import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import { env } from './config/env'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(cookieParser())

  // Versioned from day one — see blueprint section 5 (API architecture).
  app.setGlobalPrefix('api/v1', { exclude: ['health'] })

  await app.listen(env.PORT)
  console.log(`API listening on port ${env.PORT} (${env.NODE_ENV})`)
}

bootstrap()
