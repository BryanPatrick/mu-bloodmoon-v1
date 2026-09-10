import { redactSensitiveText } from '../../common/sensitive-data'

// Part 18 -- no secrets in an alert message. redactSensitiveText already
// strips Bearer tokens, DB connection strings, ?token=/?secret=/?key=
// query params and JWTs (common/sensitive-data.ts, also applied once
// already by ObservabilityService before a SystemAlert is even written).
// Applying it again here is deliberate defense-in-depth at the outbound
// boundary: this payload leaves the app's own DB/RBAC perimeter for an
// email inbox or a third-party webhook receiver, so it gets its own
// independent redaction pass rather than trusting an upstream caller.
export interface SafeAlertPayload {
  correlationId: string | null
  service: 'blood-moon-api'
  module: string
  alertType: string
  severity: string
  title: string
  summary: string
  occurredAt: string
  firstSeenAt: string
  occurrenceCount: number
  detailRef: string
}

export interface AlertPayloadSourceAlert {
  id: string
  module: string
  alertType: string
  severity: string
  title: string
  message: string
  correlationId: string | null
  createdAt: Date
}

export interface AlertPayloadSourceState {
  firstSeenAt: Date
  notificationCount: number
}

const MAX_SUMMARY_LENGTH = 500

export function buildSafeAlertPayload(
  alert: AlertPayloadSourceAlert,
  state: AlertPayloadSourceState
): SafeAlertPayload {
  const summary = redactSensitiveText(alert.message).slice(0, MAX_SUMMARY_LENGTH)
  return {
    correlationId: alert.correlationId,
    service: 'blood-moon-api',
    module: alert.module,
    alertType: alert.alertType,
    severity: alert.severity,
    title: redactSensitiveText(alert.title),
    summary,
    occurredAt: alert.createdAt.toISOString(),
    firstSeenAt: state.firstSeenAt.toISOString(),
    occurrenceCount: state.notificationCount + 1,
    detailRef: `admin/alertas#${alert.id}`
  }
}

export function formatPayloadAsEmailText(payload: SafeAlertPayload): string {
  const lines = [
    `[${payload.severity}] ${payload.title}`,
    '',
    payload.summary,
    '',
    `Module: ${payload.module}`,
    `Alert type: ${payload.alertType}`,
    `First seen: ${payload.firstSeenAt}`,
    `Occurred at: ${payload.occurredAt}`,
    `Notification #: ${payload.occurrenceCount}`,
    payload.correlationId ? `Correlation ID: ${payload.correlationId}` : null,
    `Detail: ${payload.detailRef}`
  ]
  return lines.filter((line): line is string => line !== null).join('\n')
}

export function formatPayloadSubject(payload: SafeAlertPayload): string {
  return `[Blood Moon][${payload.severity}] ${payload.module}: ${payload.title}`
}
