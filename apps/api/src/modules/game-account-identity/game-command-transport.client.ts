import { createHash, createHmac, randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import type { GameCredentialEnvelope } from './game-credential-envelope.service'

export type CreateGameCommandEnvelope = {
  commandId: string
  provisioningRequestId: string
  commandType: 'CREATE_GAME_ACCOUNT'
  environment: string
  serverId: string
  legacyLogin: string
  expiresAt: string
  credential: GameCredentialEnvelope
}

export type GameCommandState = {
  commandId: string
  provisioningRequestId: string
  status: 'CREATED' | 'QUEUED' | 'AVAILABLE' | 'CLAIMED' | 'SUCCEEDED' | 'FAILED_RETRYABLE' | 'FAILED_FINAL' | 'EXPIRED'
  resultCode: string | null
  membGuid: number | null
  completedAt: string | null
  attemptCount: number
  expiresAt: string
}

@Injectable()
export class GameCommandTransportClient {
  async create(command: CreateGameCommandEnvelope): Promise<void> {
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
