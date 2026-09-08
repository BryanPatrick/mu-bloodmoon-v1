import { AlertSweepService } from './alert-sweep.service'
import type { AlertDispatchService, AlertChannelResult } from './alert-dispatch.service'

type FakeAlert = {
  id: string
  module: string
  alertType: string
  severity: string
  title: string
  message: string
  correlationId: string | null
  createdAt: Date
}

function makeAlert(overrides: Partial<FakeAlert> = {}): FakeAlert {
  return {
    id: 'alert-1',
    module: 'commerce',
    alertType: 'CRITICAL_FAILURE',
    severity: 'CRITICAL',
    title: 'Erro critico',
    message: 'Something failed.',
    correlationId: 'corr-1',
    createdAt: new Date('2026-09-05T10:00:00.000Z'),
    ...overrides
  }
}

function makePrismaMock(alerts: FakeAlert[], stateByAlertId: Record<string, any> = {}) {
  const updates: any[] = []
  const upserts: any[] = []
  return {
    systemAlert: {
      findMany: jest.fn(async () => alerts)
    },
    alertDispatchState: {
      updateMany: jest.fn(async () => ({ count: 0 })),
      upsert: jest.fn(async ({ where, create }: any) => {
        upserts.push({ where, create })
        return stateByAlertId[where.systemAlertId] ?? { id: `state-${where.systemAlertId}`, ...create, notificationCount: 0, lastNotifiedAt: null }
      }),
      update: jest.fn(async ({ where, data }: any) => {
        updates.push({ where, data })
        return { id: where.id, ...data }
      })
    },
    __updates: updates,
    __upserts: upserts
  }
}

function makeDispatch(results: AlertChannelResult[]): AlertDispatchService {
  return { dispatch: jest.fn(async () => results) } as unknown as AlertDispatchService
}

describe('AlertSweepService.runOnce', () => {
  const originalMinSeverity = process.env.ALERT_MIN_SEVERITY
  const originalCooldown = process.env.ALERT_COOLDOWN_MS

  beforeEach(() => {
    process.env.ALERT_MIN_SEVERITY = 'WARNING'
    process.env.ALERT_COOLDOWN_MS = '900000'
  })

  afterEach(() => {
    if (originalMinSeverity === undefined) delete process.env.ALERT_MIN_SEVERITY
    else process.env.ALERT_MIN_SEVERITY = originalMinSeverity
    if (originalCooldown === undefined) delete process.env.ALERT_COOLDOWN_MS
    else process.env.ALERT_COOLDOWN_MS = originalCooldown
  })

  it('skips an alert below the configured severity threshold', async () => {
    process.env.ALERT_MIN_SEVERITY = 'CRITICAL'
    const prisma = makePrismaMock([makeAlert({ severity: 'WARNING' })])
    const dispatch = makeDispatch([{ channel: 'email', ok: true }])
    const service = new AlertSweepService(prisma as any, dispatch)

    const result = await service.runOnce()

    expect(result.skippedBelowThreshold).toBe(1)
    expect(result.notified).toBe(0)
    expect(dispatch.dispatch).not.toHaveBeenCalled()
  })

  it('notifies a fresh alert (never notified before) and records lastNotifiedAt', async () => {
    const prisma = makePrismaMock([makeAlert()])
    const dispatch = makeDispatch([{ channel: 'email', ok: true }])
    const service = new AlertSweepService(prisma as any, dispatch)

    const result = await service.runOnce()

    expect(result.notified).toBe(1)
    expect(dispatch.dispatch).toHaveBeenCalledTimes(1)
    expect(prisma.__updates[0].data.notificationCount).toEqual({ increment: 1 })
    expect(prisma.__updates[0].data.lastNotifyError).toBeNull()
  })

  it('does not re-notify while inside the cooldown window', async () => {
    const alert = makeAlert()
    const prisma = makePrismaMock([alert], {
      [alert.id]: {
        id: 'state-1',
        systemAlertId: alert.id,
        firstSeenAt: new Date('2026-09-05T09:00:00.000Z'),
        lastNotifiedAt: new Date(), // just notified, "now"
        notificationCount: 1
      }
    })
    const dispatch = makeDispatch([{ channel: 'email', ok: true }])
    const service = new AlertSweepService(prisma as any, dispatch)

    const result = await service.runOnce()

    expect(result.skippedCooldown).toBe(1)
    expect(result.notified).toBe(0)
    expect(dispatch.dispatch).not.toHaveBeenCalled()
  })

  it('notifies again once the cooldown has elapsed', async () => {
    const alert = makeAlert()
    const longAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const prisma = makePrismaMock([alert], {
      [alert.id]: {
        id: 'state-1',
        systemAlertId: alert.id,
        firstSeenAt: longAgo,
        lastNotifiedAt: longAgo,
        notificationCount: 1
      }
    })
    const dispatch = makeDispatch([{ channel: 'email', ok: true }])
    const service = new AlertSweepService(prisma as any, dispatch)

    const result = await service.runOnce()

    expect(result.notified).toBe(1)
  })

  it('does not count as notified when no channel is configured (dispatch returns [])', async () => {
    const prisma = makePrismaMock([makeAlert()])
    const dispatch = makeDispatch([])
    const service = new AlertSweepService(prisma as any, dispatch)

    const result = await service.runOnce()

    expect(result.notified).toBe(0)
    expect(result.errors).toBe(0)
    expect(prisma.__updates).toHaveLength(0)
  })

  it('records an error and does not increment notificationCount when every channel fails', async () => {
    const prisma = makePrismaMock([makeAlert()])
    const dispatch = makeDispatch([{ channel: 'email', ok: false, error: 'SMTP down' }])
    const service = new AlertSweepService(prisma as any, dispatch)

    const result = await service.runOnce()

    expect(result.errors).toBe(1)
    expect(result.notified).toBe(0)
    expect(prisma.__updates[0].data.notificationCount).toBeUndefined()
    expect(prisma.__updates[0].data.lastNotifyError).toBe('SMTP down')
  })

  it('one alert failing does not stop the batch from processing the rest', async () => {
    const prisma = makePrismaMock([makeAlert({ id: 'a1' }), makeAlert({ id: 'a2' })])
    prisma.alertDispatchState.upsert = jest.fn(async ({ where }: any) => {
      if (where.systemAlertId === 'a1') throw new Error('DB hiccup')
      return { id: 'state-a2', systemAlertId: 'a2', firstSeenAt: new Date(), notificationCount: 0, lastNotifiedAt: null }
    })
    const dispatch = makeDispatch([{ channel: 'email', ok: true }])
    const service = new AlertSweepService(prisma as any, dispatch)

    const result = await service.runOnce()

    expect(result.errors).toBe(1)
    expect(result.notified).toBe(1)
  })
})
