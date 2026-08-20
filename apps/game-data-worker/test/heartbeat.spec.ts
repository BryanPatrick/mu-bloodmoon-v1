import { SELF, env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { applySchema, signRequest } from './helpers'

beforeAll(async () => {
  await applySchema()
})

async function postHeartbeat(overrides: Partial<Record<string, unknown>> = {}): Promise<Response> {
  const body = JSON.stringify({ agentId: 'agent-hb-1', serverId: 's1', bufferState: 'NORMAL', bufferDepth: 0, lastEventAt: null, ...overrides })
  const headers = await signRequest({ clientId: 'test-agent', secret: 'test-agent-secret', method: 'POST', path: '/ingest/heartbeat', body })
  return SELF.fetch('https://worker.example/ingest/heartbeat', { method: 'POST', headers, body })
}

async function readStatus(): Promise<{ bridgeStatus: string; lastHeartbeatAt: string | null }> {
  const headers = await signRequest({ clientId: 'test-api', secret: 'test-api-secret', method: 'GET', path: '/internal/state/status', body: '' })
  const res = await SELF.fetch('https://worker.example/internal/state/status', { headers })
  return res.json()
}

describe('Heartbeat + bridge health derivation (Game Data Platform Phase 1)', () => {
  it('a fresh heartbeat yields HEALTHY via the read endpoint', async () => {
    const res = await postHeartbeat({ agentId: 'agent-health-1' })
    expect(res.status).toBe(200)

    const status = await readStatus()
    expect(status.bridgeStatus).toBe('HEALTHY')
    expect(status.lastHeartbeatAt).not.toBeNull()
  })

  it('surfaces bufferState verbatim -- never turned into a game-server status', async () => {
    await postHeartbeat({ agentId: 'agent-health-2', bufferState: 'FULL', bufferDepth: 500 })

    const row = await env.DB.prepare('SELECT buffer_state, buffer_depth FROM agent_heartbeats WHERE agent_id = ?')
      .bind('agent-health-2')
      .first<{ buffer_state: string; buffer_depth: number }>()
    expect(row?.buffer_state).toBe('FULL')
    expect(row?.buffer_depth).toBe(500)

    // The read endpoint's response has no game-server-status field at all --
    // bufferState never becomes one.
    const status = await readStatus()
    expect(status).not.toHaveProperty('gameServerStatus')
  })

  it('no heartbeat rows at all yields UNKNOWN, not a crash', async () => {
    await env.DB.prepare('DELETE FROM agent_heartbeats').run()

    const status = await readStatus()

    expect(status.bridgeStatus).toBe('UNKNOWN')
    expect(status.lastHeartbeatAt).toBeNull()
  })

  it('rejects a malformed heartbeat payload with 400', async () => {
    const body = JSON.stringify({ not: 'a heartbeat' })
    const headers = await signRequest({ clientId: 'test-agent', secret: 'test-agent-secret', method: 'POST', path: '/ingest/heartbeat', body })
    const res = await SELF.fetch('https://worker.example/ingest/heartbeat', { method: 'POST', headers, body })
    expect(res.status).toBe(400)
  })
})
