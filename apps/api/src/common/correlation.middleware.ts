import { Injectable } from '@nestjs/common'
import type { NestMiddleware } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { RequestContextService } from './request-context.service'

type RequestLike = {
  headers: Record<string, string | string[] | undefined>
  method?: string
  originalUrl?: string
  url?: string
  ip?: string
  socket?: { remoteAddress?: string }
}

type ResponseLike = {
  setHeader: (name: string, value: string) => void
}

const validCorrelationId = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length >= 8 &&
  value.length <= 80 &&
  /^[a-zA-Z0-9._:-]+$/.test(value)

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContextService) {}

  use(request: RequestLike, response: ResponseLike, next: () => void) {
    const received = request.headers['x-correlation-id']
    const candidate = Array.isArray(received) ? received[0] : received
    const correlationId = validCorrelationId(candidate) ? candidate : randomUUID()
    const forwardedFor = request.headers['x-forwarded-for']
    const ipAddress = (
      Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0]
    )?.trim() || request.ip || request.socket?.remoteAddress
    const userAgent = request.headers['user-agent']

    response.setHeader('X-Correlation-ID', correlationId)
    this.requestContext.run(
      {
        correlationId,
        ipAddress,
        userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
        requestPath: request.originalUrl || request.url,
        requestMethod: request.method
      },
      next
    )
  }
}
