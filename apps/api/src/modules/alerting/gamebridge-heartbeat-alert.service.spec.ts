import { GameBridgeHeartbeatAlertService } from './gamebridge-heartbeat-alert.service'
import type { GameDataClient } from '../game-data/game-data.client'
import type { ObservabilityService } from '../observability/observability.service'

type BridgeStatus = 'HEALTHY' | 'STALE' | 'OFFLINE' | 'UNKNOWN'

function makeGameDataClient(statuses: BridgeStatus[]): GameDataClient {
  let index = 0
  return {
    getBridgeStatus: jest.fn(async () => ({
      bridgeStatus: statuses[Math.min(index++, statuses.length - 1)],
      lastHeartbeatAt: '2026-09-05T10:00:00.000Z'
    }))
  } as unknown as GameDataClient
}

function makeObservability(): ObservabilityService {
  return { recordOperationalEvent: jest.fn(async () => ({})) } as unknown as ObservabilityService
}

describe('GameBridgeHeartbeatAlertService.checkOnce', () => {
  const originalRepeatMs = process.env.GAMEBRIDGE_HEARTBEAT_REPEAT_NOTIFY_MS

  beforeEach(() => {
    process.env.GAMEBRIDGE_HEARTBEAT_REPEAT_NOTIFY_MS = String(30 * 60_000)
  })

  afterEach(() => {
    if (originalRepeatMs === undefined) delete process.env.GAMEBRIDGE_HEARTBEAT_REPEAT_NOTIFY_MS
    else process.env.GAMEBRIDGE_HEARTBEAT_REPEAT_NOTIFY_MS = originalRepeatMs
  })

  it('does not alert on UNKNOWN (platform not configured)', async () => {
    const observability = makeObservability()
    const service = new GameBridgeHeartbeatAlertService(makeGameDataClient(['UNKNOWN']), observability)
    await service.checkOnce()
    expect(observability.recordOperationalEvent).not.toHaveBeenCalled()
  })

  it('does not alert while status stays HEALTHY', async () => {
    const observability = makeObservability()
    const service = new GameBridgeHeartbeatAlertService(makeGameDataClient(['HEALTHY', 'HEALTHY']), observability)
    await service.checkOnce()
    await service.checkOnce()
    expect(observability.recordOperationalEvent).not.toHaveBeenCalled()
  })

  it('alerts with WARNING severity on transition to STALE', async () => {
    const observability = makeObservability()
    const service = new GameBridgeHeartbeatAlertService(makeGameDataClient(['HEALTHY', 'STALE']), observability)
    await service.checkOnce()
    await service.checkOnce()
    expect(observability.recordOperationalEvent).toHaveBeenCalledTimes(1)
    expect(observability.recordOperationalEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'GAMEBRIDGE_HEARTBEAT_STALE', severity: 'WARNING' })
    )
  })

  it('alerts with CRITICAL severity on transition to OFFLINE', async () => {
    const observability = makeObservability()
    const service = new GameBridgeHeartbeatAlertService(makeGameDataClient(['HEALTHY', 'OFFLINE']), observability)
    await service.checkOnce()
    await service.checkOnce()
    expect(observability.recordOperationalEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'GAMEBRIDGE_HEARTBEAT_OFFLINE', severity: 'CRITICAL' })
    )
  })

  it('does not re-alert on every tick while remaining STALE, inside the repeat-notify window', async () => {
    const observability = makeObservability()
    const service = new GameBridgeHeartbeatAlertService(
      makeGameDataClient(['HEALTHY', 'STALE', 'STALE', 'STALE']),
      observability
    )
    await service.checkOnce() // HEALTHY
    await service.checkOnce() // transition -> alerts once
    await service.checkOnce() // still STALE, inside cooldown -> no alert
    await service.checkOnce() // still STALE, inside cooldown -> no alert
    expect(observability.recordOperationalEvent).toHaveBeenCalledTimes(1)
  })

  it('emits a recovery event when transitioning back to HEALTHY from a real prior status', async () => {
    const observability = makeObservability()
    const service = new GameBridgeHeartbeatAlertService(
      makeGameDataClient(['HEALTHY', 'OFFLINE', 'HEALTHY']),
      observability
    )
    await service.checkOnce()
    await service.checkOnce()
    await service.checkOnce()
    expect(observability.recordOperationalEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'GAMEBRIDGE_HEARTBEAT_RECOVERED', severity: 'INFO' })
    )
  })

  it('does not emit a recovery event on the very first check (no real prior status yet)', async () => {
    const observability = makeObservability()
    const service = new GameBridgeHeartbeatAlertService(makeGameDataClient(['HEALTHY']), observability)
    await service.checkOnce()
    expect(observability.recordOperationalEvent).not.toHaveBeenCalled()
  })
})
