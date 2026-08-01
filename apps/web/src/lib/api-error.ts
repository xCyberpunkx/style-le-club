export interface ApiErrorIssue {
  path: string
  message: string
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    issues?: ApiErrorIssue[]
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly issues?: ApiErrorIssue[]

  constructor(status: number, body: unknown) {
    const parsed = isApiErrorBody(body) ? body.error : null
    super(parsed?.message ?? 'Something went wrong. Please try again.')
    // Extending a built-in like Error can silently break `instanceof`
    // checks after transpilation unless the prototype chain is restored
    // explicitly — cheap insurance against a hard-to-diagnose failure mode.
    Object.setPrototypeOf(this, ApiError.prototype)
    this.name = 'ApiError'
    this.status = status
    this.code = parsed?.code ?? 'UNKNOWN_ERROR'
    this.issues = parsed?.issues
  }
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as ApiErrorBody).error === 'object'
  )
}
