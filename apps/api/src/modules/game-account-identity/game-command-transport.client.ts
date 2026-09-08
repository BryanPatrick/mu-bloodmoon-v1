import { createHash, createHmac, randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import type { GameCredentialEnvelope } from './game-credential-envelope.service'

type BaseGameCommandEnvelope = {
  commandId: string
  provisioningRequestId: string
  environment: string
  serverId: string
  legacyLogin: string
  expiresAt: string
}

export type CreateGameCommandEnvelope = BaseGameCommandEnvelope & {
  commandType: 'CREATE_GAME_ACCOUNT'
  credential: GameCredentialEnvelope
}

// GameBridge extension plan (docs/gamebridge/gamebridge-agent-extension-plan.md)
// Part 1/2: only the envelope *shape* is per-command-type -- this client's
// auth/signing/timeout/error-mapping plumbing is reused unchanged for all
// five types (Part 1: "The class itself... is generic -- reusable for new
// command types with no change").
// Phase L fix (2026-08-31): vipExpiresAt/desiredVipExpiresAt are REQUIRED
// (desiredVipExpiresAt only when desiredLevel > 0) -- a real, reproduced
// bug (docs/vip/wz-setaccountlevel-coexistence.md) found that
// dbo.bm_GrantVip/dbo.bm_SyncVipTier previously never wrote
// MEMB_INFO.AccountExpireDate, so the native dbo.WZ_GetAccountLevel
// procedure (fired on every login) silently reverted every GameBridge VIP
// grant to AL0 on the player's very next login. Named "vipExpiresAt", not
// "expiresAt", specifically to avoid colliding with this same envelope's
// OWN `expiresAt` (the command's queue TTL -- an unrelated concept).
export type GrantVipCommandEnvelope = BaseGameCommandEnvelope & {
  commandType: 'GRANT_VIP'
  payload: { targetLevel: 1 | 2 | 3, vipExpiresAt: string }
}

export type SyncVipTierCommandEnvelope = BaseGameCommandEnvelope & {
  commandType: 'SYNC_VIP_TIER'
  payload: { desiredLevel: 0 | 1 | 2 | 3, desiredVipExpiresAt?: string }
}

export type AnonymizeGameAccountCommandEnvelope = BaseGameCommandEnvelope & {
  commandType: 'ANONYMIZE_GAME_ACCOUNT'
}

export type PurgeGameAccountCommandEnvelope = BaseGameCommandEnvelope & {
  commandType: 'PURGE_GAME_ACCOUNT'
  payload: { betaCycleId: string }
}

export type GameCommandEnvelope =
  | CreateGameCommandEnvelope
  | GrantVipCommandEnvelope
  | SyncVipTierCommandEnvelope
  | AnonymizeGameAccountCommandEnvelope
  | PurgeGameAccountCommandEnvelope

export type GameCommandState = {
  commandId: string
  provisioningRequestId: string
  status: 'CREATED' | 'QUEUED' | 'AVAILABLE' | 'CLAIMED' | 'SUCCEEDED' | 'FAILED_RETRYABLE' | 'FAILED_FINAL' | 'EXPIRED'
  resultCode: string | null
  membGuid: number | null
  detailJson: string | null
  completedAt: string | null
  attemptCount: number
  expiresAt: string
}

@Injectable()
export class GameCommandTransportClient {
  async create(command: GameCommandEnvelope): Promise<void> {
    const response = await this.request('POST', '/internal/game-commands', JSON.stringify(command))
    if (!response.ok) throw new Error(`GAME_COMMAND_CREATE_${safeHttpCode(response.status)}`)
  }

  async get(commandId: string): Promise<GameCommandState> {
    const response = await this.request('GET', `/internal/game-commands/${commandId}`, '')
    if (!response.ok) throw new Error(`GAME_COMMAND_RECONCILE_${safeHttpCode(response.status)}`)
    return await response.json() as GameCommandState
  }

  async retry(commandId: string, provisioningRequestId: string): Promise<void> {
    const response = await this.request('POST', `/internal/game-commands/${commandId}/retry`, JSON.stringify({ provisioningRequestId }))
    if (!response.ok) throw new Error(`GAME_COMMAND_RETRY_${safeHttpCode(response.status)}`)
  }

  private async request(method: 'GET' | 'POST', path: string, body: string): Promise<Response> {
    const baseUrl = (process.env.GAME_DATA_WORKER_URL || '').replace(/\/$/, '')
    const secret = process.env.GAME_COMMAND_PORTAL_SECRET || ''
    const clientId = process.env.GAME_COMMAND_PORTAL_CLIENT_ID || 'apps-api-command'
    if (!baseUrl || !secret) throw new Error('GAME_COMMAND_TRANSPORT_NOT_CONFIGURED')
    const timestamp = Date.now().toString()
    const nonce = randomUUID()
    const bodyHash = createHash('sha256').update(body).digest('hex')
    const canonical = [clientId, method, path, '', timestamp, nonce, bodyHash].join('\n')
    const signature = createHmac('sha256', secret).update(canonical).digest('hex')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8_000)
    try {
      return await fetch(`${baseUrl}${path}`, { method, body: method === 'POST' ? body : undefined,
        headers: { 'content-type': 'application/json', 'X-Agent-Id': clientId, 'X-Agent-Timestamp': timestamp,
          'X-Agent-Nonce': nonce, 'X-Agent-Signature': signature }, signal: controller.signal })
    } finally { clearTimeout(timer) }
  }
}

function safeHttpCode(status: number): string { return Number.isInteger(status) ? String(status) : 'FAILED' }
