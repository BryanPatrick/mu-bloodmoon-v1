import type { Env } from './env'
import { jsonResponse } from './json'

// Bridge (Agent connectivity) heartbeat only -- never GAME_SERVER_STATUS.
// HEALTHY/STALE/OFFLINE is derived at read time from last_seen_at (see
// read.ts), not stored here.
type HeartbeatPayload = {
  agentId: string
  serverId: string
  bufferState: string
  bufferDepth: number
  lastEventAt: string | null
}

function parseHeartbeat(value: unknown): HeartbeatPayload | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (
    typeof v.agentId !== 'string' ||
    typeof v.serverId !== 'string' ||
    typeof v.bufferState !== 'string' ||
    typeof v.bufferDepth !== 'number'
  ) {
    return null
  }
  return {
    agentId: v.agentId,
    serverId: v.serverId,
    bufferState: v.bufferState,
    bufferDepth: v.bufferDepth,
    lastEventAt: typeof v.lastEventAt === 'string' ? v.lastEventAt : null
  }
}

export async function handleHeartbeat(rawBody: string, env: Env): Promise<Response> {
  let heartbeat: HeartbeatPayload | null
  try {
    heartbeat = parseHeartbeat(JSON.parse(rawBody))
  } catch {
    heartbeat = null
  }
  if (!heartbeat) {
    return jsonResponse({ error: 'INVALID_HEARTBEAT' }, 400)
  }

  const now = new Date().toISOString()
  await env.DB.prepare(
    `INSERT INTO agent_heartbeats (agent_id, server_id, buffer_state, buffer_depth, last_seen_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(agent_id) DO UPDATE SET
       server_id = excluded.server_id,
       buffer_state = excluded.buffer_state,
       buffer_depth = excluded.buffer_depth,
       last_seen_at = excluded.last_seen_at`
  )
    .bind(heartbeat.agentId, heartbeat.serverId, heartbeat.bufferState, heartbeat.bufferDepth, now)
    .run()

  return jsonResponse({ status: 'OK' }, 200)
}
