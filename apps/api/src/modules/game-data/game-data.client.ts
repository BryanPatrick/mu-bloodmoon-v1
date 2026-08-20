import { createHash, createHmac, randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import type { BridgeStatusResponse } from './game-data.contract'
import { gameDataConfig, isGameDataPlatformConfigured } from './game-data.env'

const CLIENT_ID = 'apps-api'
const READ_PATH = '/internal/state/status'
const REQUEST_TIMEOUT_MS = 5000

// The sole server-to-server consumer of the Game Data Worker's read
// endpoint (api-read HMAC scope, distinct from the Agent's write scope).
// Frontend code never sees any of this -- Web/Launcher only ever talk to
// apps/api. This client makes zero filesystem writes, anywhere, on any
// path (satisfies CPANEL_TELEMETRY_STORAGE_GROWTH=ZERO by construction) and
// never throws to its caller -- every failure mode (not configured,
// network error, non-200, malformed body) resolves to a safe UNKNOWN.
@Injectable()
export class GameDataClient {
  async getBridgeStatus(): Promise<BridgeStatusResponse> {
    if (!isGameDataPlatformConfigured()) {
      return { bridgeStatus: 'UNKNOWN', lastHeartbeatAt: null }
    }

    try {
      const config = gameDataConfig()
      const timestamp = Date.now().toString()
      const nonce = randomUUID()
      const bodyHash = createHash('sha256').update('').digest('hex')
      const canonical = [CLIENT_ID, 'GET', READ_PATH, '', timestamp, nonce, bodyHash].join('\n')
      const signature = createHmac('sha256', config.readSecret).update(canonical).digest('hex')

      const controller = new AbortController()
      const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      try {
        const response = await fetch(`${config.workerBaseUrl}${READ_PATH}`, {
          method: 'GET',
          headers: {
            'X-Agent-Id': CLIENT_ID,
            'X-Agent-Timestamp': timestamp,
            'X-Agent-Nonce': nonce,
            'X-Agent-Signature': signature
          },
          signal: controller.signal
        })
        if (!response.ok) {
          return { bridgeStatus: 'UNKNOWN', lastHeartbeatAt: null }
        }
        const data = (await response.json()) as { bridgeStatus?: unknown; lastHeartbeatAt?: unknown }
        return {
          bridgeStatus: normalizeBridgeStatus(data.bridgeStatus),
          lastHeartbeatAt: typeof data.lastHeartbeatAt === 'string' ? data.lastHeartbeatAt : null
        }
      } finally {
        clearTimeout(timeoutHandle)
      }
    } catch {
      return { bridgeStatus: 'UNKNOWN', lastHeartbeatAt: null }
    }
  }
}

function normalizeBridgeStatus(value: unknown): BridgeStatusResponse['bridgeStatus'] {
  return value === 'HEALTHY' || value === 'STALE' || value === 'OFFLINE' ? value : 'UNKNOWN'
}
