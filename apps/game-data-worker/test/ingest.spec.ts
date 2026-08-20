import { SELF, env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { applySchema, signRequest } from './helpers'

beforeAll(async () => {
  await applySchema()
})

type EnvelopeOverrides = {
  eventId?: string
  eventType?: string
  source?: string
  sourceSequence?: number
  characterId?: string
  payload?: Record<string, unknown>
}

function envelopeBody(overrides: EnvelopeOverrides = {}): string {
  const characterId = overrides.characterId ?? 'c1'
  return JSON.stringify({
    eventId: overrides.eventId ?? crypto.randomUUID(),
    eventType: overrides.eventType ?? 'character.reset-state',
    schemaVersion: 1,
    source: overrides.source ?? 'agent-1',
    serverId: 's1',
    sourceSequence: overrides.sourceSequence ?? 1,
    accountId: null,
    characterId,
    observedAt: new Date().toISOString(),
    payloadJson: JSON.stringify({
      characterId,
      characterName: 'Hero',
      resetCount: 10,
      masterResetCount: 1,
      masterLevel: 5,
      ...overrides.payload
    })
  })
}

async function postEvent(body: string, nonce?: string): Promise<Response> {
  const headers = await signRequest({
    clientId: 'test-agent', secret: 'test-agent-secret', method: 'POST', path: '/ingest/events', body, nonce
  })
  return SELF.fetch('https://worker.example/ingest/events', { method: 'POST', headers, body })
}

describe('Event ingestion (Game Data Platform Phase 1)', () => {
  it('accepts a well-formed event and writes current-state', async () => {
    const res = await postEvent(envelopeBody({ eventId: 'evt-accept-1', characterId: 'c-accept-1' }))

    expect(res.status).toBe(200)
    const row = await env.DB.prepare('SELECT reset_count FROM character_reset_state WHERE character_id = ?')
      .bind('c-accept-1')
      .first<{ reset_count: number }>()
    expect(row?.reset_count).toBe(10)
  })

  it('a duplicate eventId is an idempotent success, not an error, and does not double-apply', async () => {
    const body = envelopeBody({ eventId: 'evt-dup-1', characterId: 'c-dup-1' })

    const first = await postEvent(body, 'nonce-dup-first')
    const second = await postEvent(body, 'nonce-dup-second')

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    const secondJson = (await second.json()) as { status: string }
    expect(secondJson.status).toBe('ALREADY_PROCESSED')
  })

  it('rejects a malformed envelope with 400', async () => {
    const res = await postEvent(JSON.stringify({ not: 'an envelope' }))
    expect(res.status).toBe(400)
  })

  it('rejects an unrecognized eventType with 400', async () => {
    const res = await postEvent(envelopeBody({ eventId: 'evt-unknown-type', eventType: 'something.unknown' }))
    expect(res.status).toBe(400)
  })

  it('concurrent ingests with sourceSequence 101 and 102 converge on 102 regardless of arrival order', async () => {
    const characterId = 'c-concurrent-1'
    const body101 = envelopeBody({
      eventId: 'evt-101', characterId, sourceSequence: 101, payload: { resetCount: 20 }
    })
    const body102 = envelopeBody({
      eventId: 'evt-102', characterId, sourceSequence: 102, payload: { resetCount: 21 }
    })

    await Promise.all([postEvent(body101), postEvent(body102)])

    const row = await env.DB.prepare('SELECT reset_count, source_sequence FROM character_reset_state WHERE character_id = ?')
      .bind(characterId)
      .first<{ reset_count: number; source_sequence: number }>()
    expect(row?.source_sequence).toBe(102)
    expect(row?.reset_count).toBe(21)
  })

  it('a stale event replayed after its dedupe entry is gone never regresses current-state', async () => {
    const characterId = 'c-stale-1'
    const newer = envelopeBody({ eventId: 'evt-newer-1', characterId, sourceSequence: 5, payload: { resetCount: 30 } })
    const newerRes = await postEvent(newer)
    expect(newerRes.status).toBe(200)

    // Simulate the older event's dedupe row having already been pruned by
    // retention (event_dedupe's TTL is independent of current-state's
    // sourceSequence guard -- this is exactly the scenario that guard
    // exists for).
    const older = envelopeBody({ eventId: 'evt-older-1', characterId, sourceSequence: 3, payload: { resetCount: 25 } })
    const olderRes = await postEvent(older)
    expect(olderRes.status).toBe(200) // accepted as "new" by dedupe (it never saw this eventId)

    const row = await env.DB.prepare('SELECT reset_count, source_sequence FROM character_reset_state WHERE character_id = ?')
      .bind(characterId)
      .first<{ reset_count: number; source_sequence: number }>()
    expect(row?.source_sequence).toBe(5)
    expect(row?.reset_count).toBe(30)
  })

  it('applies ranking.state events the same way', async () => {
    const body = JSON.stringify({
      eventId: 'evt-ranking-1',
      eventType: 'ranking.state',
      schemaVersion: 1,
      source: 'agent-1',
      serverId: 's1',
      sourceSequence: 1,
      accountId: null,
      characterId: 'c-ranking-1',
      observedAt: new Date().toISOString(),
      payloadJson: JSON.stringify({ leaderboard: 'BloodCastle', characterId: 'c-ranking-1', characterName: 'Hero', score: 999 })
    })

    const res = await postEvent(body)

    expect(res.status).toBe(200)
    const row = await env.DB.prepare('SELECT score FROM ranking_state WHERE leaderboard = ? AND character_id = ?')
      .bind('BloodCastle', 'c-ranking-1')
      .first<{ score: number }>()
    expect(row?.score).toBe(999)
  })

  it('applies account.snapshot events -- the real Phase 2B/2C GameBridge read model (Phase 2D)', async () => {
    const body = JSON.stringify({
      eventId: 'evt-account-snapshot-1',
      eventType: 'account.snapshot',
      schemaVersion: 1,
      source: 'agent-1',
      serverId: 's1',
      sourceSequence: 1,
      accountId: '3',
      characterId: null,
      observedAt: new Date().toISOString(),
      payloadJson: JSON.stringify({ accountId: 3, online: false, characters: [] })
    })

    const res = await postEvent(body)

    expect(res.status).toBe(200)
    const row = await env.DB.prepare('SELECT payload_json, source_sequence FROM account_snapshot_state WHERE account_id = ?')
      .bind(3)
      .first<{ payload_json: string; source_sequence: number }>()
    expect(row?.source_sequence).toBe(1)
    expect(JSON.parse(row?.payload_json ?? '{}')).toEqual({ accountId: 3, online: false, characters: [] })
  })

  it('account.snapshot obeys the same sequence guard -- an older sourceSequence never regresses current-state', async () => {
    const newer = JSON.stringify({
      eventId: 'evt-account-newer', eventType: 'account.snapshot', schemaVersion: 1, source: 'agent-1',
      serverId: 's1', sourceSequence: 5, accountId: '7', characterId: null, observedAt: new Date().toISOString(),
      payloadJson: JSON.stringify({ accountId: 7, online: true })
    })
    expect((await postEvent(newer)).status).toBe(200)

    const older = JSON.stringify({
      eventId: 'evt-account-older', eventType: 'account.snapshot', schemaVersion: 1, source: 'agent-1',
      serverId: 's1', sourceSequence: 3, accountId: '7', characterId: null, observedAt: new Date().toISOString(),
      payloadJson: JSON.stringify({ accountId: 7, online: false })
    })
    expect((await postEvent(older)).status).toBe(200) // accepted as "new" by dedupe, but must not regress state

    const row = await env.DB.prepare('SELECT source_sequence, payload_json FROM account_snapshot_state WHERE account_id = ?')
      .bind(7)
      .first<{ source_sequence: number; payload_json: string }>()
    expect(row?.source_sequence).toBe(5)
    expect(JSON.parse(row?.payload_json ?? '{}')).toEqual({ accountId: 7, online: true })
  })
})
