import { env, SELF } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { createCommand, makeQueuedCommandAvailable, retryFailedCommand } from '../src/commands'
import type { Env, GameCommandQueueMessage } from '../src/env'
import { applySchema, signRequest } from './helpers'

const portal = { clientId: 'test-command-portal', secret: 'test-command-portal-secret' }
const agent = { clientId: 'test-command-agent', secret: 'test-command-agent-secret' }

beforeEach(async () => {
  await applySchema()
  await env.DB.prepare('DELETE FROM game_command').run()
})

describe('Phase 3D-A production command transport', () => {
  it('creates, queues, makes available, claims with a lease, and persists a safe result', async () => {
    const command = buildCommand()
    expect((await create(command)).status).toBe(202)
    await deliver(command.commandId)

    const claim = await signedPost('/game-commands/claim', agent, {
      environment: 'production', serverId: 'mu-primary', maxCommands: 1
    })
    expect(claim.status).toBe(200)
    const claimed = (await claim.json() as { commands: Array<Record<string, unknown>> }).commands[0]!
    expect(claimed.commandId).toBe(command.commandId)
    expect(claimed).not.toHaveProperty('gameCredential')
    expect(claimed).not.toHaveProperty('email')

    const result = await signedPost('/game-commands/result', agent, {
      commandId: command.commandId, provisioningRequestId: command.provisioningRequestId,
      status: 'SUCCEEDED', resultCode: 'SUCCEEDED', membGuid: 42
    })
    expect(result.status).toBe(200)
    const reconciled = await signedGet(`/internal/game-commands/${command.commandId}`, portal)
    expect(await reconciled.json()).toMatchObject({ status: 'SUCCEEDED', membGuid: 42, attemptCount: 1 })
  })

  it('is idempotent for duplicate create, queue delivery, and result', async () => {
    const command = buildCommand()
    expect((await create(command)).status).toBe(202)
    expect((await create(command)).status).toBe(200)
    await deliver(command.commandId)
    await deliver(command.commandId)
    await claimOne()
    const resultBody = { commandId: command.commandId, provisioningRequestId: command.provisioningRequestId,
      status: 'SUCCEEDED', resultCode: 'SUCCEEDED_REPLAY', membGuid: 43 }
    expect((await signedPost('/game-commands/result', agent, resultBody)).status).toBe(200)
    const duplicate = await signedPost('/game-commands/result', agent, resultBody)
    expect(await duplicate.json()).toMatchObject({ duplicate: true })
  })

  it('rejects an idempotency collision', async () => {
    const command = buildCommand()
    await create(command)
    const changed = { ...command, legacyLogin: 'other1' }
    expect((await create(changed)).status).toBe(409)
  })

  it('recovers an expired claim lease after an Agent crash', async () => {
    const command = buildCommand()
    await create(command); await deliver(command.commandId); await claimOne()
    await env.DB.prepare("UPDATE game_command SET claim_expires_at='2000-01-01T00:00:00.000Z' WHERE command_id=?1")
      .bind(command.commandId).run()
    const reclaimed = await claimOne()
    expect((await reclaimed.json() as { commands: unknown[] }).commands).toHaveLength(1)
    const row = await env.DB.prepare('SELECT attempt_count FROM game_command WHERE command_id=?1').bind(command.commandId)
      .first<{ attempt_count: number }>()
    expect(row?.attempt_count).toBe(2)
  })

  it('accepts a scoped success that arrives after its lease expired', async () => {
    const command = buildCommand()
    await create(command); await deliver(command.commandId); await claimOne()
    await env.DB.prepare("UPDATE game_command SET status='AVAILABLE',claimed_by=NULL,claim_expires_at=NULL WHERE command_id=?1")
      .bind(command.commandId).run()
    const late = await signedPost('/game-commands/result', agent, {
      commandId: command.commandId, provisioningRequestId: command.provisioningRequestId,
      status: 'SUCCEEDED', resultCode: 'SUCCEEDED', membGuid: 77
    })
    expect(late.status).toBe(200)
    expect(await late.json()).toMatchObject({ status: 'SUCCEEDED' })
  })

  it('does not execute or claim an expired command', async () => {
    const command = buildCommand()
    await create(command); await deliver(command.commandId)
    await env.DB.prepare("UPDATE game_command SET expires_at='2000-01-01T00:00:00.000Z' WHERE command_id=?1")
      .bind(command.commandId).run()
    expect((await (await claimOne()).json() as { commands: unknown[] }).commands).toHaveLength(0)
    const row = await env.DB.prepare('SELECT status FROM game_command WHERE command_id=?1').bind(command.commandId)
      .first<{ status: string }>()
    expect(row?.status).toBe('EXPIRED')
  })

  it('returns retryable work to the durable inbox without changing command identity', async () => {
    const command = buildCommand()
    await create(command); await deliver(command.commandId); await claimOne()
    const result = await signedPost('/game-commands/result', agent, {
      commandId: command.commandId, provisioningRequestId: command.provisioningRequestId,
      status: 'FAILED_RETRYABLE', resultCode: 'SQL_UNAVAILABLE', membGuid: null
    })
    expect(result.status).toBe(200)
    const reclaimed = await claimOne()
    expect((await reclaimed.json() as { commands: Array<{ commandId: string }> }).commands[0]?.commandId).toBe(command.commandId)
  })

  it('allows an authenticated controlled retry of the same non-expired final command', async () => {
    const command = buildCommand()
    await create(command); await deliver(command.commandId); await claimOne()
    await signedPost('/game-commands/result', agent, {
      commandId: command.commandId, provisioningRequestId: command.provisioningRequestId,
      status: 'FAILED_FINAL', resultCode: 'CREDENTIAL_DECRYPT_FAILED', membGuid: null
    })
    const retry = await retryFailedCommand(command.commandId,
      JSON.stringify({ provisioningRequestId: command.provisioningRequestId }), commandEnv())
    expect(retry.status).toBe(202)
    await deliver(command.commandId)
    const reclaimed = await claimOne()
    expect((await reclaimed.json() as { commands: Array<{ commandId: string }> }).commands[0]?.commandId).toBe(command.commandId)
  })

  it('rejects invalid signatures, unrelated credentials, and wrong environment scope', async () => {
    const body = JSON.stringify({ environment: 'production', serverId: 'mu-primary', maxCommands: 1 })
    expect((await SELF.fetch('https://worker/game-commands/claim', { method: 'POST', body,
      headers: { 'content-type': 'application/json', authorization: 'Bearer player-jwt' } })).status).toBe(401)
    expect((await signedPost('/game-commands/claim', { clientId: 'test-agent', secret: 'test-agent-secret' }, JSON.parse(body))).status).toBe(401)
    expect((await signedPost('/game-commands/claim', agent, { environment: 'staging', serverId: 'mu-primary', maxCommands: 1 })).status).toBe(403)
  })

  it('never returns encrypted credentials through result reconciliation', async () => {
    const command = buildCommand()
    await create(command)
    const response = await signedGet(`/internal/game-commands/${command.commandId}`, portal)
    const serialized = JSON.stringify(await response.json())
    expect(serialized).not.toContain(command.credential.ciphertext)
    expect(serialized).not.toContain('credential')
  })
})

// GameBridge extension plan (docs/gamebridge/gamebridge-agent-extension-plan.md)
// Part 1/7/13: GRANT_VIP/SYNC_VIP_TIER/ANONYMIZE_GAME_ACCOUNT/PURGE_GAME_ACCOUNT
// share the same transport as CREATE_GAME_ACCOUNT above but carry a small
// typed payload instead of a credential envelope.
describe('GameBridge extension: GRANT_VIP / SYNC_VIP_TIER / ANONYMIZE_GAME_ACCOUNT / PURGE_GAME_ACCOUNT', () => {
  it('creates, claims, and reports a GRANT_VIP command with its typed payload and a detailJson result', async () => {
    const command = buildVipCommand('GRANT_VIP', { targetLevel: 2, vipExpiresAt: FUTURE_VIP_EXPIRY })
    expect((await create(command)).status).toBe(202)
    await deliver(command.commandId)

    const claim = await claimOne()
    const claimed = (await claim.json() as { commands: Array<Record<string, unknown>> }).commands[0]!
    expect(claimed.commandId).toBe(command.commandId)
    expect(claimed.payload).toEqual({ targetLevel: 2, vipExpiresAt: FUTURE_VIP_EXPIRY })
    expect(claimed).not.toHaveProperty('credential')

    const result = await signedPost('/game-commands/result', agent, {
      commandId: command.commandId, provisioningRequestId: command.provisioningRequestId,
      status: 'SUCCEEDED', resultCode: 'SUCCEEDED', detailJson: '{"previousLevel":0,"newLevel":2}'
    })
    expect(result.status).toBe(200)
    const reconciled = await signedGet(`/internal/game-commands/${command.commandId}`, portal)
    expect(await reconciled.json()).toMatchObject({ status: 'SUCCEEDED', detailJson: '{"previousLevel":0,"newLevel":2}' })
  })

  it('accepts desiredLevel 0 (Free/no VIP) as a valid SYNC_VIP_TIER payload', async () => {
    const command = buildVipCommand('SYNC_VIP_TIER', { desiredLevel: 0 })
    expect((await create(command)).status).toBe(202)
    await deliver(command.commandId)
    const claimed = (await (await claimOne()).json() as { commands: Array<Record<string, unknown>> }).commands[0]!
    expect(claimed.payload).toEqual({ desiredLevel: 0 })
  })

  it('creates and claims an ANONYMIZE_GAME_ACCOUNT command carrying neither credential nor payload', async () => {
    const command = buildNoPayloadCommand('ANONYMIZE_GAME_ACCOUNT')
    expect((await create(command)).status).toBe(202)
    await deliver(command.commandId)
    const claimed = (await (await claimOne()).json() as { commands: Array<Record<string, unknown>> }).commands[0]!
    expect(claimed.commandId).toBe(command.commandId)
    expect(claimed.payload).toBeNull()
    expect(claimed).not.toHaveProperty('credential')
  })

  it('creates and claims a PURGE_GAME_ACCOUNT command with a betaCycleId payload', async () => {
    const command = buildVipCommand('PURGE_GAME_ACCOUNT', { betaCycleId: 'cycle-2026-08' })
    expect((await create(command)).status).toBe(202)
    await deliver(command.commandId)
    const claimed = (await (await claimOne()).json() as { commands: Array<Record<string, unknown>> }).commands[0]!
    expect(claimed.payload).toEqual({ betaCycleId: 'cycle-2026-08' })
  })

  it('rejects a GRANT_VIP command that carries a credential envelope', async () => {
    const withCredential = { ...buildVipCommand('GRANT_VIP', { targetLevel: 2, vipExpiresAt: FUTURE_VIP_EXPIRY }), credential: buildCommand().credential }
    expect((await create(withCredential)).status).toBe(400)
  })

  it('rejects a GRANT_VIP command with an out-of-range targetLevel', async () => {
    expect((await create(buildVipCommand('GRANT_VIP', { targetLevel: 4, vipExpiresAt: FUTURE_VIP_EXPIRY }))).status).toBe(400)
    expect((await create(buildVipCommand('GRANT_VIP', { targetLevel: 0, vipExpiresAt: FUTURE_VIP_EXPIRY }))).status).toBe(400)
  })

  it('rejects a GRANT_VIP command missing vipExpiresAt', async () => {
    expect((await create(buildVipCommand('GRANT_VIP', { targetLevel: 2 } as { targetLevel: number, vipExpiresAt: string }))).status).toBe(400)
  })

  it('rejects a GRANT_VIP command whose vipExpiresAt overflows SMALLDATETIME (past 2079-06-06)', async () => {
    expect((await create(buildVipCommand('GRANT_VIP', { targetLevel: 2, vipExpiresAt: '2099-01-01T00:00:00.000Z' }))).status).toBe(400)
  })

  it('rejects a SYNC_VIP_TIER command with desiredLevel > 0 missing desiredVipExpiresAt', async () => {
    expect((await create(buildVipCommand('SYNC_VIP_TIER', { desiredLevel: 2 } as { desiredLevel: number }))).status).toBe(400)
  })

  it('rejects a SYNC_VIP_TIER command with a negative or out-of-range desiredLevel', async () => {
    expect((await create(buildVipCommand('SYNC_VIP_TIER', { desiredLevel: -1 }))).status).toBe(400)
    expect((await create(buildVipCommand('SYNC_VIP_TIER', { desiredLevel: 4 }))).status).toBe(400)
  })

  it('rejects an ANONYMIZE_GAME_ACCOUNT command that carries a payload', async () => {
    const withPayload = { ...buildNoPayloadCommand('ANONYMIZE_GAME_ACCOUNT'), payload: { targetLevel: 2 } }
    expect((await create(withPayload)).status).toBe(400)
  })

  it('rejects a PURGE_GAME_ACCOUNT command missing its betaCycleId', async () => {
    expect((await create(buildNoPayloadCommand('PURGE_GAME_ACCOUNT'))).status).toBe(400)
  })

  it('rejects a membGuid on a result for a non-CREATE_GAME_ACCOUNT command', async () => {
    const command = buildVipCommand('GRANT_VIP', { targetLevel: 1, vipExpiresAt: FUTURE_VIP_EXPIRY })
    await create(command); await deliver(command.commandId); await claimOne()
    const result = await signedPost('/game-commands/result', agent, {
      commandId: command.commandId, provisioningRequestId: command.provisioningRequestId,
      status: 'SUCCEEDED', resultCode: 'SUCCEEDED', membGuid: 5
    })
    expect(result.status).toBe(400)
  })

  it('requires a detailJson on a SUCCEEDED result for a non-CREATE_GAME_ACCOUNT command', async () => {
    const command = buildVipCommand('GRANT_VIP', { targetLevel: 1, vipExpiresAt: FUTURE_VIP_EXPIRY })
    await create(command); await deliver(command.commandId); await claimOne()
    const result = await signedPost('/game-commands/result', agent, {
      commandId: command.commandId, provisioningRequestId: command.provisioningRequestId,
      status: 'SUCCEEDED', resultCode: 'SUCCEEDED'
    })
    expect(result.status).toBe(400)
  })

  it('accepts a FAILED_FINAL result for a non-CREATE_GAME_ACCOUNT command with neither membGuid nor detailJson', async () => {
    const command = buildVipCommand('SYNC_VIP_TIER', { desiredLevel: 1, desiredVipExpiresAt: FUTURE_VIP_EXPIRY })
    await create(command); await deliver(command.commandId); await claimOne()
    const result = await signedPost('/game-commands/result', agent, {
      commandId: command.commandId, provisioningRequestId: command.provisioningRequestId,
      status: 'FAILED_FINAL', resultCode: 'ACCOUNT_NOT_FOUND'
    })
    expect(result.status).toBe(200)
  })
})

// SMALLDATETIME's real max (2079-06-06) minus a comfortable margin --
// matches proposed-bm-grant-vip-procedure.sql's own range check.
const FUTURE_VIP_EXPIRY = '2029-01-01T00:00:00.000Z'

function buildVipCommand(
  commandType: 'GRANT_VIP' | 'SYNC_VIP_TIER' | 'PURGE_GAME_ACCOUNT',
  payload: { targetLevel: number, vipExpiresAt: string } | { desiredLevel: number, desiredVipExpiresAt?: string } | { betaCycleId: string }
) {
  return {
    commandId: crypto.randomUUID(), provisioningRequestId: crypto.randomUUID(), commandType,
    environment: 'production', serverId: 'mu-primary', legacyLogin: `q${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(), payload
  }
}
function buildNoPayloadCommand(commandType: 'ANONYMIZE_GAME_ACCOUNT' | 'PURGE_GAME_ACCOUNT') {
  return {
    commandId: crypto.randomUUID(), provisioningRequestId: crypto.randomUUID(), commandType,
    environment: 'production', serverId: 'mu-primary', legacyLogin: `q${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`,
    expiresAt: new Date(Date.now() + 3600_000).toISOString()
  }
}

function buildCommand() {
  return {
    commandId: crypto.randomUUID(), provisioningRequestId: crypto.randomUUID(), commandType: 'CREATE_GAME_ACCOUNT' as const,
    environment: 'production', serverId: 'mu-primary', legacyLogin: `q${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    credential: { ciphertext: btoa('ciphertext-only'), nonce: btoa('123456789012'), tag: btoa('1234567890123456'),
      keyVersion: 'v1', algorithm: 'AES-256-GCM' as const, createdAt: new Date().toISOString() }
  }
}
async function create(command: unknown): Promise<Response> {
  return createCommand(JSON.stringify(command), commandEnv())
}
async function deliver(commandId: string): Promise<void> {
  let acked = false
  const message = { body: { commandId }, ack: () => { acked = true }, retry: () => undefined } as unknown as Message<GameCommandQueueMessage>
  await makeQueuedCommandAvailable(message, env)
  expect(acked).toBe(true)
}
async function claimOne(): Promise<Response> {
  return signedPost('/game-commands/claim', agent, { environment: 'production', serverId: 'mu-primary', maxCommands: 1 })
}
async function signedPost(path: string, identity: { clientId: string; secret: string }, value: unknown): Promise<Response> {
  const body = JSON.stringify(value)
  const headers = await signRequest({ ...identity, method: 'POST', path, body })
  return SELF.fetch(`https://worker${path}`, { method: 'POST', headers, body })
}
async function signedGet(path: string, identity: { clientId: string; secret: string }): Promise<Response> {
  const headers = await signRequest({ ...identity, method: 'GET', path, body: '' })
  return SELF.fetch(`https://worker${path}`, { method: 'GET', headers })
}
function commandEnv(): Env {
  return { DB: env.DB, GAME_COMMANDS: { send: async () => undefined } } as unknown as Env
}
