import type { ExecutionContext } from '@nestjs/common'
import { UnauthorizedException } from '@nestjs/common'
import { InternalOpsEventsGuard } from './internal-ops-events.guard'

function makeContext(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers })
    })
  } as unknown as ExecutionContext
}

describe('InternalOpsEventsGuard', () => {
  const originalToken = process.env.OPS_EVENT_INGEST_TOKEN

  afterEach(() => {
    if (originalToken === undefined) delete process.env.OPS_EVENT_INGEST_TOKEN
    else process.env.OPS_EVENT_INGEST_TOKEN = originalToken
  })

  it('fails closed when OPS_EVENT_INGEST_TOKEN is not configured, even with a token supplied', () => {
    delete process.env.OPS_EVENT_INGEST_TOKEN
    const guard = new InternalOpsEventsGuard()
    expect(() => guard.canActivate(makeContext({ authorization: 'Bearer anything' }))).toThrow(UnauthorizedException)
  })

  it('rejects a missing Authorization header', () => {
    process.env.OPS_EVENT_INGEST_TOKEN = 'real-token'
    const guard = new InternalOpsEventsGuard()
    expect(() => guard.canActivate(makeContext({}))).toThrow(UnauthorizedException)
  })

  it('rejects a non-Bearer Authorization header', () => {
    process.env.OPS_EVENT_INGEST_TOKEN = 'real-token'
    const guard = new InternalOpsEventsGuard()
    expect(() => guard.canActivate(makeContext({ authorization: 'Basic real-token' }))).toThrow(UnauthorizedException)
  })

  it('rejects a wrong token', () => {
    process.env.OPS_EVENT_INGEST_TOKEN = 'real-token'
    const guard = new InternalOpsEventsGuard()
    expect(() => guard.canActivate(makeContext({ authorization: 'Bearer wrong-token' }))).toThrow(UnauthorizedException)
  })

  it('accepts the exact configured token', () => {
    process.env.OPS_EVENT_INGEST_TOKEN = 'real-token'
    const guard = new InternalOpsEventsGuard()
    expect(guard.canActivate(makeContext({ authorization: 'Bearer real-token' }))).toBe(true)
  })
})
