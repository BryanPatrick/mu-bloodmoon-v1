import { ArgumentsHost, Catch, HttpException, HttpStatus } from '@nestjs/common'
import type { ExceptionFilter } from '@nestjs/common'
import { randomUUID } from 'node:crypto'

type HttpResponse = { status: (code: number) => { json: (body: unknown) => void } }

const PUBLIC_ERROR_CODES = new Set([
  'TWO_FACTOR_REQUIRED',
])

@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<HttpResponse>()
    const requestId = randomUUID()
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    const source = exception instanceof HttpException ? exception.getResponse() : null
    const sourceMessage = typeof source === 'string' ? source : source && typeof source === 'object' && 'message' in source ? (source as { message?: unknown }).message : null
    const sourceCode = source && typeof source === 'object' && 'code' in source ? (source as { code?: unknown }).code : null
    const code = typeof sourceCode === 'string' && PUBLIC_ERROR_CODES.has(sourceCode) ? sourceCode : undefined
    const message = status >= 500
      ? 'Nao foi possivel concluir a solicitacao.'
      : Array.isArray(sourceMessage) ? sourceMessage.join('. ') : typeof sourceMessage === 'string' ? sourceMessage : 'Solicitacao invalida.'

    if (status >= 500) console.error(`[${requestId}]`, exception)
    response.status(status).json({ statusCode: status, message, ...(code ? { code } : {}), requestId })
  }
}
