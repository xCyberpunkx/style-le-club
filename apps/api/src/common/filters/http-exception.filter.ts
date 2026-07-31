import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import type { Response } from 'express'

/**
 * Single global exception filter — every response the API sends back for
 * an error, no matter its origin (a thrown domain exception, a Zod
 * validation failure, an unexpected Prisma/runtime error), is normalized to
 * `{ error: { code, message, issues? } }`. Raw Prisma errors or stack
 * traces never reach the client (blueprint section 5).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse<Response>()

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const body = exception.getResponse()

      // ZodValidationPipe (and similar) already throw a structured
      // { code, message, issues } object — pass it through as-is instead
      // of re-wrapping it in Nest's default { statusCode, message } shape.
      if (typeof body === 'object' && body !== null && 'code' in body) {
        res.status(status).json({ error: body })
        return
      }

      const message = typeof body === 'string' ? body : (exception.message ?? 'Request failed.')
      res.status(status).json({
        error: { code: HttpStatus[status] ?? 'ERROR', message },
      })
      return
    }

    // Anything else is an unexpected server-side failure — log it for
    // ourselves, never leak internals to the caller.
    console.error('Unhandled exception:', exception)
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    })
  }
}
