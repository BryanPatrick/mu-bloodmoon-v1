// Every knob here defaults to OFF/unconfigured -- absent config means the
// alerting layer computes and stores dedupe/notification state exactly as
// it would live, but never actually calls an outbound channel. Matches
// this repo's existing convention (see game-data.env.ts) of degrading to
// a safe no-op rather than crashing or faking a send. No secret is ever
// hardcoded; everything below is read from process.env only.

export type AlertSeverityName = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

const SEVERITY_RANK: Record<AlertSeverityName, number> = {
  INFO: 0,
  WARNING: 1,
  ERROR: 2,
  CRITICAL: 3
}

export function severityRank(severity: string): number {
  return SEVERITY_RANK[severity as AlertSeverityName] ?? 0
}

// Part 15: only WARNING/CRITICAL should "normally" trigger outbound
// notification. Default threshold is WARNING, which (since ERROR ranks
// above WARNING here) also covers ERROR -- the existing SystemErrorSeverity
// enum has 4 levels, not 3, so this is the mapping of Part 15's 3-level
// ask onto the codebase's real 4-level enum. Configurable via env, per
// Part 15's "keep the rule configurable."
export function alertMinSeverity(): AlertSeverityName {
  const raw = (process.env.ALERT_MIN_SEVERITY || 'WARNING').toUpperCase()
  return raw in SEVERITY_RANK ? (raw as AlertSeverityName) : 'WARNING'
}

export function meetsAlertThreshold(severity: string): boolean {
  return severityRank(severity) >= severityRank(alertMinSeverity())
}

export function isAlertSweepEnabled(): boolean {
  return process.env.ALERT_SWEEP_ENABLED === 'true'
}

export function alertSweepIntervalMs(): number {
  return Number(process.env.ALERT_SWEEP_INTERVAL_MS) || 60_000
}

// Part 14: cooldown/window before the SAME open alert is re-notified.
export function alertCooldownMs(): number {
  return Number(process.env.ALERT_COOLDOWN_MS) || 15 * 60_000
}

export function alertSweepBatchSize(): number {
  return Number(process.env.ALERT_SWEEP_BATCH_SIZE) || 50
}

export function isEmailChannelEnabled(): boolean {
  return process.env.ALERT_EMAIL_ENABLED === 'true' && Boolean(process.env.ALERT_EMAIL_TO)
}

export function emailAlertRecipients(): string {
  return process.env.ALERT_EMAIL_TO || ''
}

// Phase 7G -- provider-specific alert evaluation is independently gated
// from outbound delivery. Missing configuration remains false, so an inert
// deploy cannot unexpectedly start a polling workload or send a message.
export function isAsaasOperationalAlertingEnabled(): boolean {
  return process.env.ASAAS_OPERATIONAL_ALERTS_ENABLED === 'true'
}

function positiveNumber(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export function asaasOperationalAlertIntervalMs(): number {
  return positiveNumber('ASAAS_OPERATIONAL_ALERT_INTERVAL_MS', 60_000)
}

export function asaasProvider5xxThreshold(): number {
  return positiveNumber('ASAAS_PROVIDER_5XX_ALERT_THRESHOLD', 5)
}

export function asaasProvider5xxWindowMs(): number {
  return positiveNumber('ASAAS_PROVIDER_5XX_ALERT_WINDOW_MS', 5 * 60_000)
}

export function asaasInvalidWebhookAuthThreshold(): number {
  return positiveNumber('ASAAS_INVALID_WEBHOOK_AUTH_ALERT_THRESHOLD', 5)
}

export function asaasInvalidWebhookAuthWindowMs(): number {
  return positiveNumber('ASAAS_INVALID_WEBHOOK_AUTH_ALERT_WINDOW_MS', 5 * 60_000)
}

export function asaasReconcileRequiredAgeMs(): number {
  return positiveNumber('ASAAS_RECONCILE_REQUIRED_ALERT_AGE_MS', 15 * 60_000)
}

export function asaasManualReviewAgeMs(): number {
  return positiveNumber('ASAAS_MANUAL_REVIEW_ALERT_AGE_MS', 30 * 60_000)
}

export function isWebhookChannelEnabled(): boolean {
  return process.env.ALERT_WEBHOOK_ENABLED === 'true' && Boolean(process.env.ALERT_WEBHOOK_URL)
}

export function webhookAlertUrl(): string {
  return process.env.ALERT_WEBHOOK_URL || ''
}

// Part 17 -- shared-secret bearer token for the machine-to-machine
// /internal/ops-events ingest endpoint (cron/backup scripts have no user
// session to authenticate with). Fails closed: an unset token means the
// endpoint accepts nothing, matching "do not require production wiring
// this phase."
export function opsEventIngestToken(): string {
  return process.env.OPS_EVENT_INGEST_TOKEN || ''
}

export function isOpsEventIngestConfigured(): boolean {
  return Boolean(opsEventIngestToken())
}

// Part 16 -- GameBridge heartbeat alert poller.
export function isGameBridgeHeartbeatAlertEnabled(): boolean {
  return process.env.GAMEBRIDGE_HEARTBEAT_ALERT_ENABLED === 'true'
}

export function gameBridgeHeartbeatAlertIntervalMs(): number {
  return Number(process.env.GAMEBRIDGE_HEARTBEAT_ALERT_INTERVAL_MS) || 5 * 60_000
}

// How often to re-notify while the bridge REMAINS stale/offline (as
// opposed to the moment it transitions into that state, which always
// notifies immediately, threshold permitting).
export function gameBridgeHeartbeatRepeatNotifyMs(): number {
  return Number(process.env.GAMEBRIDGE_HEARTBEAT_REPEAT_NOTIFY_MS) || 30 * 60_000
}

// Part 13 -- 5xx burst detection.
export function isHttp5xxBurstDetectionEnabled(): boolean {
  return process.env.HTTP_5XX_BURST_DETECTION_ENABLED !== 'false'
}

export function http5xxBurstThreshold(): number {
  return Number(process.env.HTTP_5XX_BURST_THRESHOLD) || 10
}

export function http5xxBurstWindowMs(): number {
  return Number(process.env.HTTP_5XX_BURST_WINDOW_MS) || 5 * 60_000
}

export function http5xxBurstCooldownMs(): number {
  return Number(process.env.HTTP_5XX_BURST_COOLDOWN_MS) || 15 * 60_000
}
