import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import { env } from './config/env'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(cookieParser())

  // credentials: true is required for httpOnly cookies to travel cross-origin
  // (Next.js dev server on :3000, API on :3001) — without it the browser
  // silently drops the Set-Cookie / Cookie headers entirely.
  app.enableCors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })

  // Versioned from day one — see blueprint section 5 (API architecture).
  app.setGlobalPrefix('api/v1', { exclude: ['health'] })

  await app.listen(env.PORT)
  console.log(`API listening on port ${env.PORT} (${env.NODE_ENV})`)
}

bootstrap()
