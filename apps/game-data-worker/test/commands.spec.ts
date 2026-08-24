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

function buildCommand() {
  return {
    commandId: crypto.randomUUID(), provisioningRequestId: crypto.randomUUID(), commandType: 'CREATE_GAME_ACCOUNT' as const,
    environment: 'production', serverId: 'mu-primary', legacyLogin: `q${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    credential: { ciphertext: btoa('ciphertext-only'), nonce: btoa('123456789012'), tag: btoa('1234567890123456'),
      keyVersion: 'v1', algorithm: 'AES-256-GCM' as const, createdAt: new Date().toISOString() }
  }
}
async function create(command: ReturnType<typeof buildCommand>): Promise<Response> {
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
