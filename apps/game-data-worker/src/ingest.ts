import type { Env } from './env'
import { isUniqueConstraintError } from './auth/nonce'
import { jsonResponse } from './json'

// Mirrors BloodMoon.GameBridgeAgent.Ingestion.EventEnvelope's JSON shape
// (System.Text.Json Web/camelCase defaults). receivedAt is intentionally
// absent from what the Agent sends -- it is assigned here, never trusted
// from the Agent.
type EventEnvelope = {
  eventId: string
  eventType: string
  schemaVersion: number
  source: string
  serverId: string
  sourceSequence: number
  accountId: string | null
  characterId: string | null
  observedAt: string
  payloadJson: string
}

type CharacterResetPayload = {
  characterId: string
  characterName: string
  resetCount: number
  masterResetCount: number
  masterLevel: number
}

type RankingPayload = {
  leaderboard: string
  characterId: string
  characterName: string
  score: number
}

// account.snapshot (Phase 2B/2C's real, account-scoped read model --
// AccountSnapshotChangeFactory) -- the only event type real SQL data can
// currently produce (character.reset-state/ranking.state's real readers
// remain BLOCKED_BY_SCHEMA_DISCOVERY). accountId on the envelope is
// already the canonical memb_guid, carried as a string per EventEnvelope's
// shape -- parsed back to the D1 column's INTEGER affinity here.

function parseEnvelope(value: unknown): EventEnvelope | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (
    typeof v.eventId !== 'string' ||
    typeof v.eventType !== 'string' ||
    typeof v.schemaVersion !== 'number' ||
    typeof v.source !== 'string' ||
    typeof v.serverId !== 'string' ||
    typeof v.sourceSequence !== 'number' ||
    typeof v.observedAt !== 'string' ||
    typeof v.payloadJson !== 'string'
  ) {
    return null
  }
  return {
    eventId: v.eventId,
    eventType: v.eventType,
    schemaVersion: v.schemaVersion,
    source: v.source,
    serverId: v.serverId,
    sourceSequence: v.sourceSequence,
    accountId: typeof v.accountId === 'string' ? v.accountId : null,
    characterId: typeof v.characterId === 'string' ? v.characterId : null,
    observedAt: v.observedAt,
    payloadJson: v.payloadJson
  }
}

export async function handleIngestEvent(rawBody: string, env: Env): Promise<Response> {
  let envelope: EventEnvelope | null
  try {
    envelope = parseEnvelope(JSON.parse(rawBody))
  } catch {
    envelope = null
  }
  if (!envelope) {
    return jsonResponse({ error: 'INVALID_ENVELOPE' }, 400)
  }

  // event_dedupe: INSERT-first authority, business-level (distinct from
  // request_nonce's transport-level replay protection). A conflict means
  // "already processed" -- an idempotent success, not an error.
  try {
    await env.DB.prepare('INSERT INTO event_dedupe (event_id, received_at) VALUES (?, ?)')
      .bind(envelope.eventId, new Date().toISOString())
      .run()
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return jsonResponse({ status: 'ALREADY_PROCESSED', eventId: envelope.eventId }, 200)
    }
    throw err
  }

  const applied = await applyCurrentState(envelope, env)
  if (!applied) {
    return jsonResponse({ error: 'UNKNOWN_EVENT_TYPE' }, 400)
  }

  return jsonResponse({ status: 'ACCEPTED', eventId: envelope.eventId }, 200)
}

async function applyCurrentState(envelope: EventEnvelope, env: Env): Promise<boolean> {
  const now = new Date().toISOString()

  if (envelope.eventType === 'character.reset-state') {
    const payload = JSON.parse(envelope.payloadJson) as CharacterResetPayload
    // Atomic sequence-guarded UPSERT: the WHERE on DO UPDATE is the
    // authority, not a prior SELECT+compare in application code. Two
    // concurrent ingests can never make current-state regress -- see
    // test/ingest.spec.ts's concurrency case. source_sequence is scoped to
    // `source`: a write from a different source is accepted rather than
    // compared (Phase 1 has exactly one Agent; documented, not exercised).
    await env.DB.prepare(
      `INSERT INTO character_reset_state
         (character_id, character_name, reset_count, master_reset_count, master_level, source, server_id, source_sequence, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(character_id) DO UPDATE SET
         character_name = excluded.character_name,
         reset_count = excluded.reset_count,
         master_reset_count = excluded.master_reset_count,
         master_level = excluded.master_level,
         source = excluded.source,
         server_id = excluded.server_id,
         source_sequence = excluded.source_sequence,
         updated_at = excluded.updated_at
       WHERE excluded.source != character_reset_state.source
          OR excluded.source_sequence > character_reset_state.source_sequence`
    )
      .bind(
        payload.characterId,
        payload.characterName,
        payload.resetCount,
        payload.masterResetCount,
        payload.masterLevel,
        envelope.source,
        envelope.serverId,
        envelope.sourceSequence,
        now
      )
      .run()
    return true
  }

  if (envelope.eventType === 'ranking.state') {
    const payload = JSON.parse(envelope.payloadJson) as RankingPayload
    await env.DB.prepare(
      `INSERT INTO ranking_state
         (leaderboard, character_id, character_name, score, source, server_id, source_sequence, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(leaderboard, character_id) DO UPDATE SET
         character_name = excluded.character_name,
         score = excluded.score,
         source = excluded.source,
         server_id = excluded.server_id,
         source_sequence = excluded.source_sequence,
         updated_at = excluded.updated_at
       WHERE excluded.source != ranking_state.source
          OR excluded.source_sequence > ranking_state.source_sequence`
    )
      .bind(
        payload.leaderboard,
        payload.characterId,
        payload.characterName,
        payload.score,
        envelope.source,
        envelope.serverId,
        envelope.sourceSequence,
        now
      )
      .run()
    return true
  }

  if (envelope.eventType === 'account.snapshot') {
    const accountId = Number(envelope.accountId)
    if (!Number.isInteger(accountId)) return false
    await env.DB.prepare(
      `INSERT INTO account_snapshot_state
         (account_id, payload_json, source, server_id, source_sequence, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(account_id) DO UPDATE SET
         payload_json = excluded.payload_json,
         source = excluded.source,
         server_id = excluded.server_id,
         source_sequence = excluded.source_sequence,
         updated_at = excluded.updated_at
       WHERE excluded.source != account_snapshot_state.source
          OR excluded.source_sequence > account_snapshot_state.source_sequence`
    )
      .bind(accountId, envelope.payloadJson, envelope.source, envelope.serverId, envelope.sourceSequence, now)
      .run()
    return true
  }

  return false
}
