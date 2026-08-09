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

const PUBLIC_ERROR_CODES = new Set([
  'TWO_FACTOR_REQUIRED',
  'TOKEN_INVALID',
  'TOKEN_EXPIRED',
  'TOKEN_USED',
  'PASSWORD_INVALID',
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
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    const source = exception instanceof HttpException ? exception.getResponse() : null
    const sourceMessage = typeof source === 'string' ? source : source && typeof source === 'object' && 'message' in source ? (source as { message?: unknown }).message : null
    const sourceCode = source && typeof source === 'object' && 'code' in source ? (source as { code?: unknown }).code : null
    const code = typeof sourceCode === 'string' && PUBLIC_ERROR_CODES.has(sourceCode) ? sourceCode : undefined
    const message = status >= 500
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
