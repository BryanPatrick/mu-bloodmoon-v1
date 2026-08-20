import { SELF } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { applySchema, signRequest } from './helpers'

beforeAll(async () => {
  await applySchema()
})

describe('HMAC is bound to the exact request (Game Data Platform Phase 1)', () => {
  it('rejects a signature captured for /ingest/events when replayed against /ingest/heartbeat', async () => {
    const body = JSON.stringify({ agentId: 'a1', serverId: 's1', bufferState: 'NORMAL', bufferDepth: 0, lastEventAt: null })
    const headers = await signRequest({
      clientId: 'test-agent', secret: 'test-agent-secret', method: 'POST', path: '/ingest/events', body
    })

    const res = await SELF.fetch('https://worker.example/ingest/heartbeat', { method: 'POST', headers, body })

    expect(res.status).toBe(401)
  })

  it('rejects a signature captured for /ingest/heartbeat when replayed against /ingest/events', async () => {
    const body = JSON.stringify({ agentId: 'a1', serverId: 's1', bufferState: 'NORMAL', bufferDepth: 0, lastEventAt: null })
    const headers = await signRequest({
      clientId: 'test-agent', secret: 'test-agent-secret', method: 'POST', path: '/ingest/heartbeat', body
    })

    const res = await SELF.fetch('https://worker.example/ingest/events', { method: 'POST', headers, body })

    expect(res.status).toBe(401)
  })

  it('accepts a correctly-signed request for its own route', async () => {
    const body = JSON.stringify({ agentId: 'a1', serverId: 's1', bufferState: 'NORMAL', bufferDepth: 0, lastEventAt: null })
    const headers = await signRequest({
      clientId: 'test-agent', secret: 'test-agent-secret', method: 'POST', path: '/ingest/heartbeat', body
    })

    const res = await SELF.fetch('https://worker.example/ingest/heartbeat', { method: 'POST', headers, body })

    expect(res.status).toBe(200)
  })

  it('rejects a request with no signature headers at all', async () => {
    const res = await SELF.fetch('https://worker.example/ingest/events', { method: 'POST', body: '{}' })
    expect(res.status).toBe(401)
  })

  it('rejects an unknown client id', async () => {
    const body = JSON.stringify({ agentId: 'a1', serverId: 's1', bufferState: 'NORMAL', bufferDepth: 0, lastEventAt: null })
    const headers = await signRequest({
      clientId: 'not-a-real-agent', secret: 'whatever', method: 'POST', path: '/ingest/heartbeat', body
    })

    const res = await SELF.fetch('https://worker.example/ingest/heartbeat', { method: 'POST', headers, body })

    expect(res.status).toBe(401)
  })

  it('rejects a timestamp far outside the clock tolerance', async () => {
    const body = JSON.stringify({ agentId: 'a1', serverId: 's1', bufferState: 'NORMAL', bufferDepth: 0, lastEventAt: null })
    const headers = await signRequest({
      clientId: 'test-agent',
      secret: 'test-agent-secret',
      method: 'POST',
      path: '/ingest/heartbeat',
      body,
      timestampMs: Date.now() - 60 * 60_000
    })

    const res = await SELF.fetch('https://worker.example/ingest/heartbeat', { method: 'POST', headers, body })

    expect(res.status).toBe(401)
  })
})
