import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { GameDataClient } from '../game-data/game-data.client'
import { ObservabilityService } from '../observability/observability.service'
import {
  gameBridgeHeartbeatAlertIntervalMs,
  gameBridgeHeartbeatRepeatNotifyMs,
  isGameBridgeHeartbeatAlertEnabled
} from './alerting.env'

type BridgeStatus = 'HEALTHY' | 'STALE' | 'OFFLINE' | 'UNKNOWN'

// Part 16 -- read-only. Calls only the already-existing, already-reviewed
// GameDataClient.getBridgeStatus() (apps/api/src/modules/game-data), which
// itself never throws and degrades to UNKNOWN if the platform isn't
// configured -- this poller does the same on top: UNKNOWN never alerts.
// Never restarts the Agent, never rotates a credential, never issues a
// GameBridge command -- there is no code path here that could, since
// GameDataClient exposes nothing but a status read.
@Injectable()
export class GameBridgeHeartbeatAlertService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GameBridgeHeartbeatAlertService.name)
  private timer: ReturnType<typeof setInterval> | null = null
  private lastStatus: BridgeStatus = 'UNKNOWN'
  private lastNotifiedAt = 0

  constructor(
    private readonly gameDataClient: GameDataClient,
    private readonly observability: ObservabilityService
  ) {}

  onModuleInit() {
    if (!isGameBridgeHeartbeatAlertEnabled()) return
    this.timer = setInterval(() => {
      void this.checkOnce().catch((error) => this.logger.error(`Heartbeat check failed: ${safeMessage(error)}`))
    }, gameBridgeHeartbeatAlertIntervalMs())
    this.timer.unref?.()
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
  }

  async checkOnce(): Promise<void> {
    const { bridgeStatus, lastHeartbeatAt } = await this.gameDataClient.getBridgeStatus()
    const now = Date.now()
    const transitioned = bridgeStatus !== this.lastStatus
    const repeatDue = now - this.lastNotifiedAt >= gameBridgeHeartbeatRepeatNotifyMs()

    if ((bridgeStatus === 'STALE' || bridgeStatus === 'OFFLINE') && (transitioned || repeatDue)) {
      await this.observability.recordOperationalEvent({
        module: 'game-bridge',
        eventType: bridgeStatus === 'OFFLINE' ? 'GAMEBRIDGE_HEARTBEAT_OFFLINE' : 'GAMEBRIDGE_HEARTBEAT_STALE',
        severity: bridgeStatus === 'OFFLINE' ? 'CRITICAL' : 'WARNING',
        description:
          bridgeStatus === 'OFFLINE'
            ? 'GameBridge Agent heartbeat has not been seen recently enough to be considered online.'
            : 'GameBridge Agent heartbeat is stale.',
        data: { lastHeartbeatAt, transitioned }
      })
      this.lastNotifiedAt = now
    }

    if (bridgeStatus === 'HEALTHY' && this.lastStatus !== 'HEALTHY' && this.lastStatus !== 'UNKNOWN') {
      await this.observability.recordOperationalEvent({
        module: 'game-bridge',
        eventType: 'GAMEBRIDGE_HEARTBEAT_RECOVERED',
        severity: 'INFO',
        description: 'GameBridge Agent heartbeat has recovered to healthy.',
        data: { lastHeartbeatAt }
      })
    }

    this.lastStatus = bridgeStatus
  }
}

function safeMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}
