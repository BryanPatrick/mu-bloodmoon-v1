import { Controller, ForbiddenException, Get, NotFoundException } from '@nestjs/common'
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

  @Get('failure')
  failure() {
    throw new Error('database credential must remain internal')
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
})
