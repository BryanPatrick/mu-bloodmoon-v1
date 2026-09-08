import { AlertDispatchService } from './alert-dispatch.service'
import type { AlertChannel } from './alert-channel.interface'
import type { SafeAlertPayload } from './alert-payload'

const payload: SafeAlertPayload = {
  correlationId: 'corr-1',
  service: 'blood-moon-api',
  module: 'commerce',
  alertType: 'CRITICAL_FAILURE',
  severity: 'CRITICAL',
  title: 'Erro critico',
  summary: 'Something failed.',
  occurredAt: '2026-09-05T10:00:00.000Z',
  firstSeenAt: '2026-09-05T09:58:00.000Z',
  occurrenceCount: 1,
  detailRef: 'admin/alertas#alert-1'
}

function fakeChannel(name: string, enabled: boolean, sendImpl?: () => Promise<void>): AlertChannel {
  return {
    name,
    isEnabled: () => enabled,
    send: sendImpl ?? (async () => {})
  }
}

describe('AlertDispatchService', () => {
  it('returns no results when no channel is enabled', async () => {
    const service = new AlertDispatchService([fakeChannel('email', false), fakeChannel('webhook', false)])
    const results = await service.dispatch(payload)
    expect(results).toEqual([])
  })

  it('skips disabled channels entirely (does not call send on them)', async () => {
    const disabledSend = jest.fn(async () => {})
    const service = new AlertDispatchService([
      { name: 'webhook', isEnabled: () => false, send: disabledSend },
      fakeChannel('email', true)
    ])
    await service.dispatch(payload)
    expect(disabledSend).not.toHaveBeenCalled()
  })

  it('calls every enabled channel and reports ok:true on success', async () => {
    const emailSend = jest.fn(async () => {})
    const webhookSend = jest.fn(async () => {})
    const service = new AlertDispatchService([
      { name: 'email', isEnabled: () => true, send: emailSend },
      { name: 'webhook', isEnabled: () => true, send: webhookSend }
    ])
    const results = await service.dispatch(payload)
    expect(emailSend).toHaveBeenCalledWith(payload)
    expect(webhookSend).toHaveBeenCalledWith(payload)
    expect(results).toEqual([
      { channel: 'email', ok: true },
      { channel: 'webhook', ok: true }
    ])
  })

  it('one channel failing does not prevent another from succeeding (Promise.allSettled semantics)', async () => {
    const service = new AlertDispatchService([
      { name: 'email', isEnabled: () => true, send: async () => { throw new Error('SMTP down') } },
      { name: 'webhook', isEnabled: () => true, send: async () => {} }
    ])
    const results = await service.dispatch(payload)
    expect(results).toEqual([
      { channel: 'email', ok: false, error: 'SMTP down' },
      { channel: 'webhook', ok: true }
    ])
  })
})
