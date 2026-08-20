import type { Env } from './env'
import { BRIDGE_HEALTHY_MAX_AGE_MS, BRIDGE_STALE_MAX_AGE_MS } from './config'
import { jsonResponse } from './json'

// Server-to-server only (api-read HMAC scope) -- never reachable from a
// browser, never reachable with the agent-write scope. This is the sole
// surface apps/api's game-data.client.ts calls.
type HeartbeatRow = { agent_id: string; last_seen_at: string }

export async function handleReadStatus(env: Env): Promise<Response> {
  const result = await env.DB.prepare('SELECT agent_id, last_seen_at FROM agent_heartbeats').all<HeartbeatRow>()
  const rows = result.results ?? []

  if (rows.length === 0) {
    return jsonResponse({ bridgeStatus: 'UNKNOWN', lastHeartbeatAt: null }, 200)
  }

  const latestMs = Math.max(...rows.map((r) => Date.parse(r.last_seen_at)))
  const ageMs = Date.now() - latestMs
  const bridgeStatus = ageMs < BRIDGE_HEALTHY_MAX_AGE_MS ? 'HEALTHY' : ageMs < BRIDGE_STALE_MAX_AGE_MS ? 'STALE' : 'OFFLINE'

  return jsonResponse({ bridgeStatus, lastHeartbeatAt: new Date(latestMs).toISOString() }, 200)
}
