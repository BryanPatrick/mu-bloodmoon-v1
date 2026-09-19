import { COMMAND_LEASE_SECONDS, COMMAND_RETENTION_DAYS } from './config'
import type { Env, GameCommandQueueMessage } from './env'
import { jsonResponse } from './json'

type CredentialEnvelope = {
  ciphertext: string
  nonce: string
  tag: string
  keyVersion: string
  algorithm: 'AES-256-GCM'
  createdAt: string
}

// GameBridge extension plan (docs/gamebridge/gamebridge-agent-extension-plan.md)
// Part 1/2/7/13: CommandType widened from the single CREATE_GAME_ACCOUNT
// literal to five. Each new type's payload is deliberately tiny and
// type-specific (never a secret -- plan Part 2's "never in payload" rule).
type CommandType = 'CREATE_GAME_ACCOUNT' | 'GRANT_VIP' | 'SYNC_VIP_TIER' | 'ANONYMIZE_GAME_ACCOUNT' | 'PURGE_GAME_ACCOUNT'
const COMMAND_TYPES: readonly CommandType[] = ['CREATE_GAME_ACCOUNT', 'GRANT_VIP', 'SYNC_VIP_TIER', 'ANONYMIZE_GAME_ACCOUNT', 'PURGE_GAME_ACCOUNT']

// vipExpiresAt/desiredVipExpiresAt (Phase L fix, 2026-08-31): REQUIRED --
// distinct from this same command's own top-level `expiresAt` (the
// command's queue TTL, unrelated). Closes a real reproduced bug where
// dbo.bm_GrantVip/dbo.bm_SyncVipTier never wrote MEMB_INFO.AccountExpireDate,
// so the native dbo.WZ_GetAccountLevel procedure silently reverted every
// GameBridge VIP grant to AL0 on the player's next login -- see
// docs/vip/wz-setaccountlevel-coexistence.md.
type GrantVipPayload = { targetLevel: number, vipExpiresAt: string }
type SyncVipTierPayload = { desiredLevel: number, desiredVipExpiresAt?: string }
type PurgeGameAccountPayload = { betaCycleId: string }

type CreateCommandRequest = {
  commandId: string
  provisioningRequestId: string
  commandType: CommandType
  environment: string
  serverId: string
  legacyLogin: string
  expiresAt: string
  // Only CREATE_GAME_ACCOUNT carries a credential envelope.
  credential?: CredentialEnvelope
  // Only GRANT_VIP/SYNC_VIP_TIER/PURGE_GAME_ACCOUNT carry a payload.
  // ANONYMIZE_GAME_ACCOUNT needs neither -- legacyLogin is the whole request.
  payload?: GrantVipPayload | SyncVipTierPayload | PurgeGameAccountPayload
}

type AgentScope = { environment: string; serverId: string }

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SCOPE = /^[a-z0-9][a-z0-9_-]{1,39}$/
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/
const LEGACY_LOGIN = /^[A-Za-z0-9]{4,10}$/
const BETA_CYCLE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/

export async function createCommand(rawBody: string, env: Env): Promise<Response> {
  const value = parseCreate(rawBody)
  if (!value) return jsonResponse({ error: 'INVALID_COMMAND' }, 400)

  const requestHash = await sha256Hex(canonicalRequest(value))
  const now = new Date().toISOString()
  const existing = await env.DB.prepare(
    'SELECT request_hash,status FROM game_command WHERE command_id=?1 OR provisioning_request_id=?2'
  ).bind(value.commandId, value.provisioningRequestId).all<{ request_hash: string; status: string }>()

  if (existing.results.length > 0) {
    if (existing.results.length !== 1 || existing.results[0]?.request_hash !== requestHash) {
      return jsonResponse({ error: 'IDEMPOTENCY_CONFLICT' }, 409)
    }
    if (existing.results[0]?.status !== 'CREATED') {
      return jsonResponse({ commandId: value.commandId, status: existing.results[0]?.status, duplicate: true }, 200)
    }
  } else {
    await env.DB.prepare(`INSERT INTO game_command(
      command_id,provisioning_request_id,command_type,environment,server_id,legacy_login,
      credential_ciphertext,credential_nonce,credential_tag,credential_key_version,credential_algorithm,
      payload_json,request_hash,status,expires_at,created_at,updated_at
    ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,'CREATED',?14,?15,?15)`)
      .bind(value.commandId, value.provisioningRequestId, value.commandType, value.environment, value.serverId,
        value.legacyLogin,
        value.credential?.ciphertext ?? null, value.credential?.nonce ?? null, value.credential?.tag ?? null,
        value.credential?.keyVersion ?? null, value.credential?.algorithm ?? null,
        value.payload ? JSON.stringify(value.payload) : null,
        requestHash, value.expiresAt, now).run()
  }

  try {
    await env.GAME_COMMANDS.send({ commandId: value.commandId } satisfies GameCommandQueueMessage, { contentType: 'json' })
    await env.DB.prepare("UPDATE game_command SET status='QUEUED',updated_at=?2 WHERE command_id=?1 AND status='CREATED'")
      .bind(value.commandId, new Date().toISOString()).run()
    return jsonResponse({ commandId: value.commandId, status: 'QUEUED', duplicate: existing.results.length > 0 }, 202)
  } catch {
    return jsonResponse({ error: 'QUEUE_UNAVAILABLE', commandId: value.commandId }, 503)
  }
}

export async function makeQueuedCommandAvailable(message: Message<GameCommandQueueMessage>, env: Env): Promise<void> {
  const commandId = message.body?.commandId
  if (!GUID.test(commandId ?? '')) { message.ack(); return }
  const now = new Date().toISOString()
  const row = await env.DB.prepare('SELECT status,expires_at FROM game_command WHERE command_id=?1')
    .bind(commandId).first<{ status: string; expires_at: string }>()
  if (!row) { message.ack(); return }
  if (row.expires_at <= now) {
    await env.DB.prepare("UPDATE game_command SET status='EXPIRED',completed_at=?2,updated_at=?2 WHERE command_id=?1 AND status IN ('CREATED','QUEUED','AVAILABLE')")
      .bind(commandId, now).run()
    message.ack()
    return
  }
  await env.DB.prepare("UPDATE game_command SET status='AVAILABLE',available_at=COALESCE(available_at,?2),updated_at=?2 WHERE command_id=?1 AND status IN ('CREATED','QUEUED')")
    .bind(commandId, now).run()
  message.ack()
}

export async function claimCommands(rawBody: string, clientId: string, env: Env): Promise<Response> {
  const requested = parseJson(rawBody) as { environment?: unknown; serverId?: unknown; maxCommands?: unknown } | null
  const scope = agentScope(clientId, env.COMMAND_AGENT_SCOPES_JSON)
  const maxCommands = typeof requested?.maxCommands === 'number' ? Math.min(5, Math.max(1, Math.trunc(requested.maxCommands))) : 1
  if (!scope || requested?.environment !== scope.environment || requested?.serverId !== scope.serverId) {
    return jsonResponse({ error: 'AGENT_SCOPE_DENIED' }, 403)
  }

  const now = new Date()
  const nowIso = now.toISOString()
  await env.DB.batch([
    env.DB.prepare("UPDATE game_command SET status='EXPIRED',completed_at=?1,updated_at=?1 WHERE status IN ('CREATED','QUEUED','AVAILABLE','FAILED_RETRYABLE') AND expires_at<=?1").bind(nowIso),
    env.DB.prepare("UPDATE game_command SET status='AVAILABLE',available_at=?1,claimed_at=NULL,claim_expires_at=NULL,claimed_by=NULL,updated_at=?1 WHERE status='CLAIMED' AND claim_expires_at<=?1 AND expires_at>?1").bind(nowIso)
  ])

  const candidates = await env.DB.prepare(`SELECT command_id FROM game_command
    WHERE environment=?1 AND server_id=?2 AND status IN ('AVAILABLE','FAILED_RETRYABLE') AND expires_at>?3
    ORDER BY created_at ASC LIMIT ?4`).bind(scope.environment, scope.serverId, nowIso, maxCommands * 3)
    .all<{ command_id: string }>()
  const claimed: unknown[] = []
  for (const candidate of candidates.results) {
    if (claimed.length >= maxCommands) break
    const leaseUntil = new Date(now.getTime() + COMMAND_LEASE_SECONDS * 1000).toISOString()
    const update = await env.DB.prepare(`UPDATE game_command SET status='CLAIMED',claimed_at=?2,claim_expires_at=?3,
      claimed_by=?4,attempt_count=attempt_count+1,updated_at=?2
      WHERE command_id=?1 AND status IN ('AVAILABLE','FAILED_RETRYABLE') AND expires_at>?2`)
      .bind(candidate.command_id, nowIso, leaseUntil, clientId).run()
    if ((update.meta.changes ?? 0) !== 1) continue
    const row = await env.DB.prepare(`SELECT command_id,provisioning_request_id,command_type,environment,server_id,
      legacy_login,credential_ciphertext,credential_nonce,credential_tag,credential_key_version,
      credential_algorithm,payload_json,expires_at,attempt_count FROM game_command WHERE command_id=?1`)
      .bind(candidate.command_id).first<Record<string, string | number | null>>()
    if (row) claimed.push(toClaim(row, leaseUntil))
  }
  return jsonResponse({ commands: claimed, serverTime: nowIso }, 200)
}

export async function reportCommandResult(rawBody: string, clientId: string, env: Env): Promise<Response> {
  const body = parseJson(rawBody) as Record<string, unknown> | null
  if (!body || !GUID.test(String(body.commandId ?? '')) || !GUID.test(String(body.provisioningRequestId ?? ''))) {
    return jsonResponse({ error: 'INVALID_RESULT' }, 400)
  }
  const status = body.status
  if (status !== 'SUCCEEDED' && status !== 'FAILED_RETRYABLE' && status !== 'FAILED_FINAL') {
    return jsonResponse({ error: 'INVALID_RESULT' }, 400)
  }
  const resultCode = typeof body.resultCode === 'string' && /^[A-Z0-9_]{1,80}$/.test(body.resultCode) ? body.resultCode : null
  const membGuid = Number.isInteger(body.membGuid) && Number(body.membGuid) > 0 ? Number(body.membGuid) : null
  const detailJson = typeof body.detailJson === 'string' ? body.detailJson : null
  // membGuid/detailJson are explicitly sent as null for the "no value"
  // case (e.g. a FAILED_RETRYABLE/FAILED_FINAL result) -- only a present,
  // non-null value that fails to parse is a malformed request.
  if (!resultCode ||
      (body.membGuid !== undefined && body.membGuid !== null && membGuid === null) ||
      (body.detailJson !== undefined && body.detailJson !== null && detailJson === null) ||
      (membGuid !== null && detailJson !== null) ||
      (detailJson !== null && (detailJson.length > 4000 || !validJson(detailJson)))) {
    return jsonResponse({ error: 'INVALID_RESULT' }, 400)
  }
  const row = await env.DB.prepare(`SELECT provisioning_request_id,command_type,status,result_code,result_memb_guid,
    result_detail_json,claimed_by,expires_at,environment,server_id
    FROM game_command WHERE command_id=?1`).bind(body.commandId).first<Record<string, string | number | null>>()
  if (!row || row.provisioning_request_id !== body.provisioningRequestId) return jsonResponse({ error: 'COMMAND_NOT_FOUND' }, 404)
  // CREATE_GAME_ACCOUNT keeps its original membGuid-shaped result; the four
  // new operations (plan Part 7) report a small, type-specific detailJson
  // instead -- never both, and required exactly on SUCCEEDED, matching the
  // strictness the membGuid check already had.
  const isCreate = row.command_type === 'CREATE_GAME_ACCOUNT'
  if (isCreate) {
    if (detailJson !== null) return jsonResponse({ error: 'INVALID_RESULT' }, 400)
    if ((status === 'SUCCEEDED') !== (membGuid !== null)) return jsonResponse({ error: 'INVALID_RESULT' }, 400)
  } else {
    if (membGuid !== null) return jsonResponse({ error: 'INVALID_RESULT' }, 400)
    if ((status === 'SUCCEEDED') !== (detailJson !== null)) return jsonResponse({ error: 'INVALID_RESULT' }, 400)
  }
  const scope = agentScope(clientId, env.COMMAND_AGENT_SCOPES_JSON)
  if (!scope || scope.environment !== row.environment || scope.serverId !== row.server_id) {
    return jsonResponse({ error: 'AGENT_SCOPE_DENIED' }, 403)
  }
  if (row.status === 'SUCCEEDED') {
    const same = status === 'SUCCEEDED' && row.result_code === resultCode &&
      (isCreate ? Number(row.result_memb_guid) === membGuid : row.result_detail_json === detailJson)
    return same ? jsonResponse({ commandId: body.commandId, status: 'SUCCEEDED', duplicate: true }, 200)
      : jsonResponse({ error: 'RESULT_CONFLICT' }, 409)
  }
  // A scoped SUCCEEDED result is accepted after lease expiry: execution may
  // have committed before the response was delayed. Failures can only be
  // reported by the current claimant so an old attempt cannot overwrite a
  // newer one.
  if (status !== 'SUCCEEDED' && row.claimed_by !== clientId) return jsonResponse({ error: 'CLAIM_OWNER_MISMATCH' }, 409)

  const now = new Date().toISOString()
  if (status === 'FAILED_RETRYABLE' && String(row.expires_at) <= now) {
    await env.DB.prepare("UPDATE game_command SET status='EXPIRED',result_code=?2,completed_at=?3,updated_at=?3 WHERE command_id=?1")
      .bind(body.commandId, resultCode, now).run()
    return jsonResponse({ commandId: body.commandId, status: 'EXPIRED' }, 200)
  }
  const transportStatus = status === 'FAILED_RETRYABLE' ? 'FAILED_RETRYABLE' : status
  await env.DB.prepare(`UPDATE game_command SET status=?2,result_code=?3,result_memb_guid=?4,result_detail_json=?5,
    completed_at=CASE WHEN ?2 IN ('SUCCEEDED','FAILED_FINAL') THEN ?6 ELSE NULL END,
    available_at=CASE WHEN ?2='FAILED_RETRYABLE' THEN ?6 ELSE available_at END,
    claim_expires_at=NULL,updated_at=?6 WHERE command_id=?1 AND status<>'SUCCEEDED'`)
    .bind(body.commandId, transportStatus, resultCode, membGuid, detailJson, now).run()
  return jsonResponse({ commandId: body.commandId, status: transportStatus, duplicate: false }, 200)
}

export async function getCommandResult(commandId: string, env: Env): Promise<Response> {
  if (!GUID.test(commandId)) return jsonResponse({ error: 'INVALID_COMMAND_ID' }, 400)
  const row = await env.DB.prepare(`SELECT command_id,provisioning_request_id,status,result_code,result_memb_guid,
    result_detail_json,completed_at,attempt_count,expires_at FROM game_command WHERE command_id=?1`).bind(commandId)
    .first<Record<string, string | number | null>>()
  if (!row) return jsonResponse({ error: 'COMMAND_NOT_FOUND' }, 404)
  return jsonResponse({
    commandId: row.command_id,
    provisioningRequestId: row.provisioning_request_id,
    status: row.status,
    resultCode: row.result_code,
    membGuid: row.result_memb_guid,
    detailJson: row.result_detail_json,
    completedAt: row.completed_at,
    attemptCount: row.attempt_count,
    expiresAt: row.expires_at
  }, 200)
}

export async function retryFailedCommand(commandId: string, rawBody: string, env: Env): Promise<Response> {
  const body = parseJson(rawBody) as { provisioningRequestId?: unknown } | null
  if (!GUID.test(commandId) || !GUID.test(String(body?.provisioningRequestId ?? ''))) {
    return jsonResponse({ error: 'INVALID_RETRY' }, 400)
  }
  const row = await env.DB.prepare('SELECT provisioning_request_id,status,expires_at FROM game_command WHERE command_id=?1')
    .bind(commandId).first<{ provisioning_request_id: string; status: string; expires_at: string }>()
  if (!row || row.provisioning_request_id !== body?.provisioningRequestId) return jsonResponse({ error: 'COMMAND_NOT_FOUND' }, 404)
  if (row.status !== 'FAILED_FINAL') return jsonResponse({ error: 'COMMAND_NOT_RETRYABLE', status: row.status }, 409)
  const now = new Date().toISOString()
  if (row.expires_at <= now) return jsonResponse({ error: 'COMMAND_EXPIRED' }, 409)
  await env.DB.prepare(`UPDATE game_command SET status='CREATED',claimed_at=NULL,claim_expires_at=NULL,claimed_by=NULL,
    completed_at=NULL,result_code=NULL,result_memb_guid=NULL,result_detail_json=NULL,updated_at=?2 WHERE command_id=?1 AND status='FAILED_FINAL'`)
    .bind(commandId, now).run()
  try {
    await env.GAME_COMMANDS.send({ commandId } satisfies GameCommandQueueMessage, { contentType: 'json' })
    await env.DB.prepare("UPDATE game_command SET status='QUEUED',updated_at=?2 WHERE command_id=?1 AND status='CREATED'")
      .bind(commandId, new Date().toISOString()).run()
    return jsonResponse({ commandId, status: 'QUEUED' }, 202)
  } catch {
    return jsonResponse({ error: 'QUEUE_UNAVAILABLE', commandId }, 503)
  }
}

export async function deleteExpiredCommandHistory(env: Env): Promise<void> {
  const cutoff = new Date(Date.now() - COMMAND_RETENTION_DAYS * 86400_000).toISOString()
  await env.DB.prepare("DELETE FROM game_command WHERE status IN ('SUCCEEDED','FAILED_FINAL','EXPIRED') AND completed_at<?1")
    .bind(cutoff).run()
}

function parseCreate(rawBody: string): CreateCommandRequest | null {
  const v = parseJson(rawBody) as Partial<CreateCommandRequest> | null
  if (!v || !GUID.test(v.commandId ?? '') || !GUID.test(v.provisioningRequestId ?? '') ||
      !COMMAND_TYPES.includes(v.commandType as CommandType) || !SCOPE.test(v.environment ?? '') ||
      !SCOPE.test(v.serverId ?? '') || !LEGACY_LOGIN.test(v.legacyLogin ?? '') || !validDate(v.expiresAt)) return null
  const expires = Date.parse(v.expiresAt as string)
  if (expires <= Date.now() || expires > Date.now() + 24 * 3600_000) return null

  const base = {
    commandId: v.commandId as string, provisioningRequestId: v.provisioningRequestId as string,
    commandType: v.commandType as CommandType, environment: v.environment as string, serverId: v.serverId as string,
    legacyLogin: v.legacyLogin as string, expiresAt: v.expiresAt as string
  }

  if (base.commandType === 'CREATE_GAME_ACCOUNT') {
    if (v.payload !== undefined) return null
    const c = v.credential
    if (!c || c.algorithm !== 'AES-256-GCM' || !/^v[1-9][0-9]{0,3}$/.test(c.keyVersion ?? '') ||
        !validDate(c.createdAt) || !validBase64(c.ciphertext) || !validBase64(c.nonce, 12) || !validBase64(c.tag, 16)) return null
    return { ...base, credential: { ciphertext: c.ciphertext, nonce: c.nonce, tag: c.tag, keyVersion: c.keyVersion, algorithm: c.algorithm, createdAt: c.createdAt } }
  }

  // Plan Part 2: no operation other than CREATE_GAME_ACCOUNT ever carries a
  // credential envelope -- a secret sitting in one of these new payloads
  // would be a real data-handling regression, not just a validation gap.
  if (v.credential !== undefined) return null

  if (base.commandType === 'GRANT_VIP') {
    const p = v.payload as Partial<GrantVipPayload> | undefined
    const targetLevel = p?.targetLevel
    if (!intInRange(targetLevel, 1, 3) || !validVipExpiry(p?.vipExpiresAt)) return null
    return { ...base, payload: { targetLevel, vipExpiresAt: p!.vipExpiresAt } }
  }
  if (base.commandType === 'SYNC_VIP_TIER') {
    const p = v.payload as Partial<SyncVipTierPayload> | undefined
    const desiredLevel = p?.desiredLevel
    if (!intInRange(desiredLevel, 0, 3)) return null
    // desiredVipExpiresAt is required only when desiredLevel > 0 -- same
    // reasoning as dbo.bm_SyncVipTier's own SQL-side validation.
    if (desiredLevel! > 0) {
      if (!validVipExpiry(p?.desiredVipExpiresAt)) return null
      return { ...base, payload: { desiredLevel, desiredVipExpiresAt: p!.desiredVipExpiresAt } }
    }
    if (p?.desiredVipExpiresAt !== undefined) return null
    return { ...base, payload: { desiredLevel } }
  }
  if (base.commandType === 'ANONYMIZE_GAME_ACCOUNT') {
    if (v.payload !== undefined) return null
    return { ...base }
  }
  // PURGE_GAME_ACCOUNT
  const p = v.payload as Partial<PurgeGameAccountPayload> | undefined
  if (!p || typeof p.betaCycleId !== 'string' || !BETA_CYCLE_ID.test(p.betaCycleId)) return null
  return { ...base, payload: { betaCycleId: p.betaCycleId } }
}

function canonicalRequest(v: CreateCommandRequest): string {
  const parts = [v.commandId, v.provisioningRequestId, v.commandType, v.environment, v.serverId, v.legacyLogin, v.expiresAt]
  if (v.credential) {
    parts.push(v.credential.algorithm, v.credential.keyVersion, v.credential.createdAt,
      v.credential.nonce, v.credential.ciphertext, v.credential.tag)
  }
  // payload is normalized in parseCreate to contain exactly one known key,
  // so JSON.stringify is deterministic here (no key-order ambiguity).
  if (v.payload) parts.push(JSON.stringify(v.payload))
  return parts.join('\n')
}

function toClaim(row: Record<string, string | number | null>, leaseUntil: string): unknown {
  const base = {
    commandId: row.command_id, provisioningRequestId: row.provisioning_request_id,
    commandType: row.command_type, environment: row.environment, serverId: row.server_id,
    legacyLogin: row.legacy_login, expiresAt: row.expires_at, attemptCount: row.attempt_count, leaseUntil
  }
  if (row.command_type === 'CREATE_GAME_ACCOUNT') {
    return {
      ...base,
      credential: { ciphertext: row.credential_ciphertext, nonce: row.credential_nonce, tag: row.credential_tag,
        keyVersion: row.credential_key_version, algorithm: row.credential_algorithm }
    }
  }
  return { ...base, payload: row.payload_json ? JSON.parse(String(row.payload_json)) : null }
}

function agentScope(clientId: string, json: string | undefined): AgentScope | null {
  const parsed = parseJson(json ?? '') as Record<string, AgentScope> | null
  const scope = parsed?.[clientId]
  return scope && SCOPE.test(scope.environment) && SCOPE.test(scope.serverId) ? scope : null
}
function parseJson(value: string): unknown {
  try { return JSON.parse(value.charCodeAt(0) === 0xfeff ? value.slice(1) : value) } catch { return null }
}
function validDate(value: unknown): value is string { return typeof value === 'string' && Number.isFinite(Date.parse(value)) }

// GameServer's real MEMB_INFO.AccountExpireDate column is SMALLDATETIME,
// not DATETIME -- real valid range is 1900-01-01 through 2079-06-06
// (confirmed via sys.columns; a value beyond this overflowed with a real
// SQL conversion error this round -- see the SQL-side range check in
// proposed-bm-grant-vip-procedure.sql/proposed-bm-sync-vip-tier-procedure.sql).
// Rejected here too, at the earliest possible layer, not just at the SQL
// layer -- defense in depth.
const SMALLDATETIME_MAX = Date.parse('2079-06-06T00:00:00Z')
function validVipExpiry(value: unknown): value is string {
  if (!validDate(value)) return false
  const parsed = Date.parse(value)
  return parsed > Date.now() && parsed <= SMALLDATETIME_MAX
}
function validJson(value: string): boolean { try { JSON.parse(value); return true } catch { return false } }
function intInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}
function validBase64(value: unknown, bytes?: number): value is string {
  if (typeof value !== 'string' || !BASE64.test(value)) return false
  try { return bytes === undefined || Uint8Array.from(atob(value), c => c.charCodeAt(0)).length === bytes } catch { return false }
}
async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}
