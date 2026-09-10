import { buildSafeAlertPayload, formatPayloadAsEmailText, formatPayloadSubject } from './alert-payload'

const baseAlert = {
  id: 'alert-1',
  module: 'commerce',
  alertType: 'CRITICAL_FAILURE',
  severity: 'CRITICAL',
  title: 'Erro critico em commerce',
  message: 'Something failed.',
  correlationId: 'corr-1',
  createdAt: new Date('2026-09-05T10:00:00.000Z')
}

const baseState = {
  firstSeenAt: new Date('2026-09-05T09:58:00.000Z'),
  notificationCount: 2
}

describe('buildSafeAlertPayload', () => {
  it('redacts secrets embedded in the alert message (Part 18)', () => {
    const payload = buildSafeAlertPayload(
      { ...baseAlert, message: 'Failed with Bearer abc123.def456.ghi789 and mysql://user:pass@host/db' },
      baseState
    )
    expect(payload.summary).not.toContain('abc123.def456.ghi789')
    expect(payload.summary).not.toContain('user:pass')
    expect(payload.summary).toContain('[PROTECTED]')
  })

  it('redacts secrets embedded in the alert title', () => {
    const payload = buildSafeAlertPayload(
      { ...baseAlert, title: 'Webhook call failed: ?token=super-secret-value-here' },
      baseState
    )
    expect(payload.title).not.toContain('super-secret-value-here')
  })

  it('carries forward correlationId, module, alertType, severity unchanged', () => {
    const payload = buildSafeAlertPayload(baseAlert, baseState)
    expect(payload.correlationId).toBe('corr-1')
    expect(payload.module).toBe('commerce')
    expect(payload.alertType).toBe('CRITICAL_FAILURE')
    expect(payload.severity).toBe('CRITICAL')
    expect(payload.service).toBe('blood-moon-api')
  })

  it('reports occurrenceCount as notificationCount + 1 (the notification about to be sent)', () => {
    const payload = buildSafeAlertPayload(baseAlert, baseState)
    expect(payload.occurrenceCount).toBe(3)
  })

  it('truncates an excessively long message', () => {
    const payload = buildSafeAlertPayload({ ...baseAlert, message: 'x'.repeat(10_000) }, baseState)
    expect(payload.summary.length).toBeLessThanOrEqual(500)
  })

  it('never includes a stack trace or raw internal fields -- only the declared safe shape', () => {
    const payload = buildSafeAlertPayload(baseAlert, baseState)
    expect(Object.keys(payload).sort()).toEqual(
      [
        'alertType',
        'correlationId',
        'detailRef',
        'firstSeenAt',
        'module',
        'occurredAt',
        'occurrenceCount',
        'service',
        'severity',
        'summary',
        'title'
      ].sort()
    )
  })
})

describe('formatPayloadAsEmailText / formatPayloadSubject', () => {
  it('renders a subject and body that include the severity and title', () => {
    const payload = buildSafeAlertPayload(baseAlert, baseState)
    expect(formatPayloadSubject(payload)).toContain('CRITICAL')
    expect(formatPayloadSubject(payload)).toContain('commerce')
    expect(formatPayloadAsEmailText(payload)).toContain(payload.summary)
    expect(formatPayloadAsEmailText(payload)).toContain('corr-1')
  })

  it('omits the correlation-id line when there is none', () => {
    const payload = buildSafeAlertPayload({ ...baseAlert, correlationId: null }, baseState)
    expect(formatPayloadAsEmailText(payload)).not.toContain('Correlation ID')
  })
})
