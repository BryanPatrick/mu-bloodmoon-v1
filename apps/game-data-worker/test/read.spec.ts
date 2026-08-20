import { SELF } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { applySchema, signRequest } from './helpers'

beforeAll(async () => {
  await applySchema()
})

describe('Read endpoint scope separation (Game Data Platform Phase 1)', () => {
  it('the agent-write scope cannot reach the read endpoint', async () => {
    const headers = await signRequest({ clientId: 'test-agent', secret: 'test-agent-secret', method: 'GET', path: '/internal/state/status', body: '' })
    const res = await SELF.fetch('https://worker.example/internal/state/status', { headers })
    expect(res.status).toBe(401)
  })

  it('the api-read scope cannot reach ingest', async () => {
    const body = JSON.stringify({ agentId: 'a1', serverId: 's1', bufferState: 'NORMAL', bufferDepth: 0, lastEventAt: null })
    const headers = await signRequest({ clientId: 'test-api', secret: 'test-api-secret', method: 'POST', path: '/ingest/heartbeat', body })
    const res = await SELF.fetch('https://worker.example/ingest/heartbeat', { method: 'POST', headers, body })
    expect(res.status).toBe(401)
  })

  it('a correctly-scoped read request succeeds', async () => {
    const headers = await signRequest({ clientId: 'test-api', secret: 'test-api-secret', method: 'GET', path: '/internal/state/status', body: '' })
    const res = await SELF.fetch('https://worker.example/internal/state/status', { headers })
    expect(res.status).toBe(200)
  })

  it('an unauthenticated request to the read endpoint is rejected, not served', async () => {
    const res = await SELF.fetch('https://worker.example/internal/state/status')
    expect(res.status).toBe(401)
  })

  it('an unknown route 404s', async () => {
    const res = await SELF.fetch('https://worker.example/some/other/route')
    expect(res.status).toBe(404)
  })
})
