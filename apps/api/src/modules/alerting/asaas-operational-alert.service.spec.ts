import { AsaasOperationalAlertService } from './asaas-operational-alert.service'
import { isEmailChannelEnabled } from './alerting.env'

type AlertRow = {
  id: string
  sourceType: string
  sourceId: string
  status: string
  createdAt: Date
}

function makePrisma(input: {
  provider5xx?: number
  invalidAuth?: number
  reconcileRequired?: number
  reviewRecharges?: number
  reviewEvents?: number
}, durableAlerts: AlertRow[] = []) {
  const recovered: string[] = []
  const prisma = {
    operationalEvent: {
      count: jest.fn(async ({ where }: any) => where.eventType === 'ASAAS_PROVIDER_5XX'
        ? input.provider5xx || 0 : input.invalidAuth || 0),
      create: jest.fn(async ({ data }: any) => { recovered.push(data.entityId); return data })
    },
    rechargeIntent: {
      count: jest.fn(async ({ where }: any) => where.providerCreateState === 'RECONCILE_REQUIRED'
        ? input.reconcileRequired || 0 : input.reviewRecharges || 0)
    },
    paymentWebhookEvent: {
      count: jest.fn(async () => input.reviewEvents || 0)
    },
    systemAlert: {
      findFirst: jest.fn(async ({ where }: any) => durableAlerts
        .filter((row) => row.sourceType === where.sourceType && row.sourceId === where.sourceId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] || null),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `alert-${durableAlerts.length + 1}`, ...data, status: 'OPEN', createdAt: new Date() }
        durableAlerts.push(row)
        return row
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = durableAlerts.find((candidate) => candidate.id === where.id)!
        Object.assign(row, data)
        return row
      })
    },
    alertDispatchState: { updateMany: jest.fn(async () => ({ count: 1 })) },
    __alerts: durableAlerts,
    __recovered: recovered
  }
  return prisma
}

describe('AsaasOperationalAlertService', () => {
  const original = { ...process.env }

  beforeEach(() => {
    process.env.ASAAS_PROVIDER_5XX_ALERT_THRESHOLD = '5'
    process.env.ASAAS_INVALID_WEBHOOK_AUTH_ALERT_THRESHOLD = '5'
    process.env.ASAAS_PROVIDER_5XX_ALERT_WINDOW_MS = '300000'
    process.env.ASAAS_INVALID_WEBHOOK_AUTH_ALERT_WINDOW_MS = '300000'
    process.env.ASAAS_RECONCILE_REQUIRED_ALERT_AGE_MS = '900000'
    process.env.ASAAS_MANUAL_REVIEW_ALERT_AGE_MS = '1800000'
  })

  afterEach(() => { process.env = { ...original } })

  it.each([
    [5, 1],
    [4, 0]
  ])('opens a provider 5xx threshold alert only at 5 events (count=%s)', async (provider5xx, expected) => {
    const prisma = makePrisma({ provider5xx })
    const result = await new AsaasOperationalAlertService(prisma as any).runOnce(new Date('2026-09-21T12:00:00Z'))
    expect(result.opened).toBe(expected)
    expect(prisma.__alerts.filter((row) => row.sourceId === 'provider-5xx')).toHaveLength(expected)
  })

  it.each([
    [5, 1],
    [4, 0]
  ])('opens an invalid webhook auth alert only at 5 events (count=%s)', async (invalidAuth, expected) => {
    const prisma = makePrisma({ invalidAuth })
    const result = await new AsaasOperationalAlertService(prisma as any).runOnce(new Date('2026-09-21T12:00:00Z'))
    expect(result.opened).toBe(expected)
    expect(prisma.__alerts.filter((row) => row.sourceId === 'invalid-webhook-auth')).toHaveLength(expected)
  })

  it('opens age alerts for overdue reconcile and manual-review records', async () => {
    const prisma = makePrisma({ reconcileRequired: 1, reviewEvents: 1 })
    const result = await new AsaasOperationalAlertService(prisma as any).runOnce()
    expect(result.opened).toBe(2)
    expect(prisma.__alerts.map((row) => row.sourceId)).toEqual(expect.arrayContaining([
      'reconcile-required-age', 'manual-review-age'
    ]))
  })

  it('does not open age alerts when no record is older than the configured limits', async () => {
    const prisma = makePrisma({ reconcileRequired: 0, reviewRecharges: 0, reviewEvents: 0 })
    const result = await new AsaasOperationalAlertService(prisma as any).runOnce()
    expect(result.opened).toBe(0)
  })

  it('deduplicates an active condition and survives service reconstruction', async () => {
    const durableAlerts: AlertRow[] = []
    const prisma = makePrisma({ provider5xx: 5 }, durableAlerts)
    await new AsaasOperationalAlertService(prisma as any).runOnce()
    await new AsaasOperationalAlertService(prisma as any).runOnce()
    expect(durableAlerts.filter((row) => row.sourceId === 'provider-5xx')).toHaveLength(1)
    expect(prisma.systemAlert.create).toHaveBeenCalledTimes(1)
  })

  it('marks recovery and reopens the same durable alert on recurrence', async () => {
    const durableAlerts: AlertRow[] = []
    const activePrisma = makePrisma({ provider5xx: 5 }, durableAlerts)
    await new AsaasOperationalAlertService(activePrisma as any).runOnce()
    const clearPrisma = makePrisma({ provider5xx: 0 }, durableAlerts)
    expect((await new AsaasOperationalAlertService(clearPrisma as any).runOnce()).recovered).toBe(1)
    expect(clearPrisma.__recovered).toContain('provider-5xx')
    const recurringPrisma = makePrisma({ provider5xx: 5 }, durableAlerts)
    expect((await new AsaasOperationalAlertService(recurringPrisma as any).runOnce()).opened).toBe(1)
    expect(durableAlerts.filter((row) => row.sourceId === 'provider-5xx')).toHaveLength(1)
    expect(durableAlerts[0].status).toBe('OPEN')
  })

  it('keeps email disabled when destination is missing even if the channel flag is true', () => {
    process.env.ALERT_EMAIL_ENABLED = 'true'
    delete process.env.ALERT_EMAIL_TO
    expect(isEmailChannelEnabled()).toBe(false)
  })
})
