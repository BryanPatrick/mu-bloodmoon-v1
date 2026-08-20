import { SELF } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { applySchema, signRequest } from './helpers'

beforeAll(async () => {
  await applySchema()
})

describe('Request replay protection -- INSERT-first nonce authority (Game Data Platform Phase 1)', () => {
  it('of two concurrent requests sharing a nonce, exactly one is accepted', async () => {
    const nonce = 'fixed-nonce-concurrent-1'
    const body = JSON.stringify({ agentId: 'a1', serverId: 's1', bufferState: 'NORMAL', bufferDepth: 0, lastEventAt: null })
    const headers = await signRequest({
      clientId: 'test-agent', secret: 'test-agent-secret', method: 'POST', path: '/ingest/heartbeat', body, nonce
    })

    const [first, second] = await Promise.all([
      SELF.fetch('https://worker.example/ingest/heartbeat', { method: 'POST', headers, body }),
      SELF.fetch('https://worker.example/ingest/heartbeat', { method: 'POST', headers, body })
    ])

    const statuses = [first.status, second.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 401]);
  })

  it('rejects a sequential reuse of the same nonce', async () => {
    const nonce = 'fixed-nonce-sequential-1'
    const body = JSON.stringify({ agentId: 'a1', serverId: 's1', bufferState: 'NORMAL', bufferDepth: 0, lastEventAt: null })
    const headers = await signRequest({
      clientId: 'test-agent', secret: 'test-agent-secret', method: 'POST', path: '/ingest/heartbeat', body, nonce
    })

    const first = await SELF.fetch('https://worker.example/ingest/heartbeat', { method: 'POST', headers, body })
    const second = await SELF.fetch('https://worker.example/ingest/heartbeat', { method: 'POST', headers, body })

    expect(first.status).toBe(200)
    expect(second.status).toBe(401)
  })

  it('the same nonce is independently valid in a different scope (ingest vs heartbeat)', async () => {
    const nonce = 'fixed-nonce-cross-scope-1'
    const eventsBody = JSON.stringify({
      eventId: 'evt-nonce-scope', eventType: 'character.reset-state', schemaVersion: 1, source: 'agent-1', serverId: 's1',
      sourceSequence: 1, accountId: null, characterId: 'c-nonce-scope', observedAt: new Date().toISOString(),
      payloadJson: JSON.stringify({ characterId: 'c-nonce-scope', characterName: 'Hero', resetCount: 1, masterResetCount: 0, masterLevel: 1 })
    })
    const eventsHeaders = await signRequest({
      clientId: 'test-agent', secret: 'test-agent-secret', method: 'POST', path: '/ingest/events', body: eventsBody, nonce
    })
    const eventsRes = await SELF.fetch('https://worker.example/ingest/events', { method: 'POST', headers: eventsHeaders, body: eventsBody })
    expect(eventsRes.status).toBe(200)

    const heartbeatBody = JSON.stringify({ agentId: 'a1', serverId: 's1', bufferState: 'NORMAL', bufferDepth: 0, lastEventAt: null })
    const heartbeatHeaders = await signRequest({
      clientId: 'test-agent', secret: 'test-agent-secret', method: 'POST', path: '/ingest/heartbeat', body: heartbeatBody, nonce
    })
    const heartbeatRes = await SELF.fetch('https://worker.example/ingest/heartbeat', { method: 'POST', headers: heartbeatHeaders, body: heartbeatBody })
    expect(heartbeatRes.status).toBe(200)
  })
})
