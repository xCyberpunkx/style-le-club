import { PipeTransform, BadRequestException } from '@nestjs/common'
import type { ZodType } from 'zod'

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body.',
        issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      })
    }
    return result.data
  }
}
