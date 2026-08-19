import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Injectable
} from '@nestjs/common'
import type { ExceptionFilter } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import type { AuthenticatedUser } from '../modules/auth/auth.types'
import { ObservabilityService } from '../modules/observability/observability.service'
import { RequestContextService } from './request-context.service'

type HttpResponse = { status: (code: number) => { json: (body: unknown) => void } }
type HttpRequest = {
  user?: AuthenticatedUser
  method?: string
  originalUrl?: string
  url?: string
  ip?: string
  headers?: Record<string, string | string[] | undefined>
}

// express.static (main.ts's community/guild media mounts, both registered
// with fallthrough:false) throws a plain http-errors object on a missing
// file, not a Nest HttpException -- without this, every such 404 fell
// through to the generic 500 branch below, and got logged as a real
// SystemError for something as ordinary as a browser requesting a removed
// image. Scoped to a well-formed 4xx/5xx numeric status so an unrelated
// error object that happens to carry an unrelated `.status` property can't
// accidentally get misread as an intentional HTTP error.
function statusFromExpressError(exception: unknown): number | null {
  if (!exception || typeof exception !== 'object') return null
  const candidate = exception as { status?: unknown; statusCode?: unknown }
  const status = typeof candidate.status === 'number' ? candidate.status : typeof candidate.statusCode === 'number' ? candidate.statusCode : null
  return status !== null && Number.isInteger(status) && status >= 400 && status <= 599 ? status : null
}

const PUBLIC_ERROR_CODES = new Set([
  'TWO_FACTOR_REQUIRED',
  'TWO_FACTOR_SETUP_REQUIRED',
  'TWO_FACTOR_RATE_LIMITED',
  'STEP_UP_REQUIRED',
  'TOKEN_INVALID',
  'TOKEN_EXPIRED',
  'TOKEN_USED',
  'PASSWORD_INVALID',
  'PAYMENTS_DISABLED',
])

@Catch()
@Injectable()
export class SafeExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly observability: ObservabilityService,
    private readonly requestContext: RequestContextService
  ) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp()
    const response = http.getResponse<HttpResponse>()
    const request = http.getRequest<HttpRequest>()
    const requestId = this.requestContext.correlationId() || randomUUID()
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : statusFromExpressError(exception) ?? HttpStatus.INTERNAL_SERVER_ERROR
    const source = exception instanceof HttpException ? exception.getResponse() : null
    const sourceMessage = typeof source === 'string' ? source : source && typeof source === 'object' && 'message' in source ? (source as { message?: unknown }).message : null
    const sourceCode = source && typeof source === 'object' && 'code' in source ? (source as { code?: unknown }).code : null
    const code = typeof sourceCode === 'string' && PUBLIC_ERROR_CODES.has(sourceCode) ? sourceCode : undefined
    const message = status >= 500 && !code
      ? 'Nao foi possivel concluir a solicitacao.'
      : Array.isArray(sourceMessage) ? sourceMessage.join('. ') : typeof sourceMessage === 'string' ? sourceMessage : 'Solicitacao invalida.'

    if (status >= 500) {
      const internalMessage = exception instanceof Error
        ? exception.message
        : typeof sourceMessage === 'string'
          ? sourceMessage
          : 'Unhandled server exception'
      const criticalPattern = /database|deadlock|rollback|escrow|duplicate delivery|connection refused/i
      await this.observability.recordSystemError({
        severity: criticalPattern.test(internalMessage) ? 'CRITICAL' : 'ERROR',
        errorCode: typeof sourceCode === 'string' ? sourceCode : null,
        publicMessage: message,
        internalMessage,
        stackTrace: exception instanceof Error ? exception.stack : null,
        correlationId: requestId,
        userId: request.user?.id,
        accountId: request.user?.id,
        requestPath: request.originalUrl || request.url,
        requestMethod: request.method,
        ipAddress: request.ip,
        userAgent: Array.isArray(request.headers?.['user-agent'])
          ? request.headers?.['user-agent'][0]
          : request.headers?.['user-agent'],
        metadata: {
          statusCode: status,
          actorRole: request.user?.role,
          sessionId: request.user?.sessionId
        }
      })
      console.error(`[${requestId}]`, exception)
    }
    response.status(status).json({ statusCode: status, message, ...(code ? { code } : {}), requestId })
  }
}
