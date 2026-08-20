// Bridge (GameBridge Agent connectivity) health only -- never
// GAME_SERVER_STATUS. See docs/game-data/architecture.md. UNKNOWN covers
// both "platform not configured" and "no heartbeat has ever arrived" --
// both mean the same thing to a caller: there is no live signal to trust.
export type BridgeStatus = 'HEALTHY' | 'STALE' | 'OFFLINE' | 'UNKNOWN'

export type BridgeStatusResponse = {
  bridgeStatus: BridgeStatus
  lastHeartbeatAt: string | null
}
