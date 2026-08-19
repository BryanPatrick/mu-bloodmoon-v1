import {
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException
} from '@nestjs/common'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { NextFunction, Request, Response } from 'express'
import type { Server } from 'node:http'
import { SafeExceptionFilter } from '../src/common/safe-exception.filter'
import { RequestContextService } from '../src/common/request-context.service'
import { ObservabilityService } from '../src/modules/observability/observability.service'

@Controller('error-contract')
class ErrorContractController {
  @Get('missing-resource')
  missingResource() {
    throw new NotFoundException('Recurso nao encontrado.')
  }

  @Get('forbidden')
  forbidden() {
    throw new ForbiddenException('Acesso nao autorizado.')
  }

  @Get('unauthenticated')
  unauthenticated() {
    throw new UnauthorizedException('Autenticacao necessaria.')
  }

  @Get('rate-limited')
  rateLimited() {
    throw new HttpException('Muitas tentativas. Aguarde e tente novamente.', 429)
  }

  @Get('unavailable')
  unavailable() {
    throw new ServiceUnavailableException('Servico temporariamente indisponivel.')
  }

  @Get('failure')
  failure() {
    throw new Error('database credential must remain internal')
  }

  // Shaped exactly like what express.static (via the `send` package's
  // http-errors) throws on a missing file, fallthrough:false -- this is
  // what main.ts's community/guild media mounts hit on a 404, and it is not
  // a Nest HttpException. Regression coverage for SafeExceptionFilter's
  // statusFromExpressError fallback.
  @Get('static-like-404')
  staticLike404() {
    const error = new Error('ENOENT: no such file or directory, stat \'/internal/fs/path/should-not-leak.webp\'') as Error & {
      status: number
      statusCode: number
      expose: boolean
    }
    error.status = 404
    error.statusCode = 404
    error.expose = true
    throw error
  }

  // Same http-errors shape, but a 5xx -- proves the >=500 branch (masked
  // public message, SystemError recorded, internals never leaked) still
  // applies to this new code path exactly as it does to a plain Error.
  @Get('static-like-502')
  staticLike502() {
    const error = new Error('upstream gateway unreachable, internal-path=/secret/internal') as Error & {
      status: number
      statusCode: number
    }
    error.status = 502
    error.statusCode = 502
    throw error
  }

  // A genuine unexpected error that happens to carry an out-of-range
  // "status"-like field must not be misread as an intentional HTTP status --
  // proves the fallback is bounded to real HTTP status codes (400-599), not
  // "any object with a status property".
  @Get('unrelated-status-field')
  unrelatedStatusField() {
    const error = new Error('unrelated internal fault') as Error & { status: number }
    error.status = 12345
    throw error
  }
}

describe('Global API error contract', () => {
  const requestId = 'error-contract-request-19-4'
  const recordSystemError = jest.fn().mockResolvedValue(undefined)
  let app: INestApplication
  let server: Server
  let requestContext: RequestContextService

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ErrorContractController],
      providers: [
        RequestContextService,
        SafeExceptionFilter,
        { provide: ObservabilityService, useValue: { recordSystemError } }
      ]
    }).compile()

    app = moduleRef.createNestApplication()
    requestContext = moduleRef.get(RequestContextService)
    app.setGlobalPrefix('api')
    app.use((request: Request, response: Response, next: NextFunction) => {
      response.setHeader('X-Correlation-ID', requestId)
      requestContext.run({ correlationId: requestId }, next)
    })
    app.useGlobalFilters(moduleRef.get(SafeExceptionFilter))
    await app.init()
    server = app.getHttpServer()
  })

  afterAll(async () => app?.close())
  beforeEach(() => recordSystemError.mockClear())

  const client = () => import('supertest').then((module) => module.default(server))

  it('preserves an explicit resource 404 and returns the public contract', async () => {
    const response = await (await client()).get('/api/error-contract/missing-resource')

    expect(response.status).toBe(404)
    expect(response.headers['x-correlation-id']).toBe(requestId)
    expect(response.body).toEqual({
      statusCode: 404,
      message: 'Recurso nao encontrado.',
      requestId
    })
    expect(recordSystemError).not.toHaveBeenCalled()
  })

  it('keeps unknown API routes as 404 instead of converting them to 500', async () => {
    const response = await (await client()).get('/api/route-that-does-not-exist')

    expect(response.status).toBe(404)
    expect(response.body.statusCode).toBe(404)
    expect(response.body.requestId).toBe(requestId)
    expect(recordSystemError).not.toHaveBeenCalled()
  })

  it('preserves forbidden responses', async () => {
    const response = await (await client()).get('/api/error-contract/forbidden')

    expect(response.status).toBe(403)
    expect(response.body).toEqual({
      statusCode: 403,
      message: 'Acesso nao autorizado.',
      requestId
    })
  })

  it('preserves unauthenticated responses', async () => {
    const response = await (await client()).get('/api/error-contract/unauthenticated')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      statusCode: 401,
      message: 'Autenticacao necessaria.',
      requestId
    })
    expect(recordSystemError).not.toHaveBeenCalled()
  })

  it('preserves rate-limited responses', async () => {
    const response = await (await client()).get('/api/error-contract/rate-limited')

    expect(response.status).toBe(429)
    expect(response.body).toEqual({
      statusCode: 429,
      message: 'Muitas tentativas. Aguarde e tente novamente.',
      requestId
    })
    expect(recordSystemError).not.toHaveBeenCalled()
  })

  it('masks service-unavailable responses the same way as any other 5xx and records the correlation id', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const response = await (await client()).get('/api/error-contract/unavailable')
    consoleError.mockRestore()

    expect(response.status).toBe(503)
    expect(response.body).toEqual({
      statusCode: 503,
      message: 'Nao foi possivel concluir a solicitacao.',
      requestId
    })
    expect(JSON.stringify(response.body)).not.toContain('temporariamente indisponivel')
    expect(recordSystemError).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: requestId,
        publicMessage: 'Nao foi possivel concluir a solicitacao.',
        requestPath: '/api/error-contract/unavailable'
      })
    )
  })

  it('masks controlled API failures and records their correlation id', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const response = await (await client()).get('/api/error-contract/failure')
    consoleError.mockRestore()

    expect(response.status).toBe(500)
    expect(response.body).toEqual({
      statusCode: 500,
      message: 'Nao foi possivel concluir a solicitacao.',
      requestId
    })
    expect(JSON.stringify(response.body)).not.toContain('credential')
    expect(JSON.stringify(response.body)).not.toContain('stack')
    expect(recordSystemError).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: requestId,
        publicMessage: 'Nao foi possivel concluir a solicitacao.',
        requestPath: '/api/error-contract/failure'
      })
    )
  })

  it('maps an express.static-shaped 404 (not a Nest HttpException) to a real 404, and does not log it as a SystemError', async () => {
    const response = await (await client()).get('/api/error-contract/static-like-404')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      statusCode: 404,
      message: 'Solicitacao invalida.',
      requestId
    })
    expect(JSON.stringify(response.body)).not.toContain('internal/fs/path')
    expect(JSON.stringify(response.body)).not.toContain('should-not-leak')
    expect(recordSystemError).not.toHaveBeenCalled()
  })

  it('still masks a 5xx that arrives in the same express.static-like shape, and still records it', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const response = await (await client()).get('/api/error-contract/static-like-502')
    consoleError.mockRestore()

    expect(response.status).toBe(502)
    expect(response.body).toEqual({
      statusCode: 502,
      message: 'Nao foi possivel concluir a solicitacao.',
      requestId
    })
    expect(JSON.stringify(response.body)).not.toContain('secret/internal')
    expect(recordSystemError).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: requestId,
        publicMessage: 'Nao foi possivel concluir a solicitacao.',
        requestPath: '/api/error-contract/static-like-502'
      })
    )
  })

  it('does not misread an unrelated out-of-range "status" field as an intentional HTTP status -- still a masked 500', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const response = await (await client()).get('/api/error-contract/unrelated-status-field')
    consoleError.mockRestore()

    expect(response.status).toBe(500)
    expect(response.body.statusCode).toBe(500)
    expect(JSON.stringify(response.body)).not.toContain('unrelated internal fault')
    expect(recordSystemError).toHaveBeenCalled()
  })
})
