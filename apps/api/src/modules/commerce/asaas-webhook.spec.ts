import { CommerceService } from './commerce.service'
import { RechargeWebhookController } from './recharge-webhook.controller'

function fixture() {
  const recharge: Record<string, unknown> = {
    id: 'recharge-1',
    accountId: 'account-1',
    packageId: 'pack-1',
    currency: 'WCOIN',
    amount: 10,
    bonus: 0,
    price: '10,00',
    status: 'PENDING',
    provider: 'asaas',
    providerEnvironment: 'sandbox',
    providerCreateState: 'CREATED',
    correlationId: 'reference-1',
    externalReference: 'reference-1',
    externalOrderId: 'pay_1',
    createdAt: new Date(),
    updatedAt: new Date(),
    account: { username: 'qa' },
    package: { key: 'wcoin-10' }
  }
  const payment = {
    externalOrderId: 'pay_1',
    externalReference: 'reference-1',
    providerCustomerId: 'cus_1',
    totalAmountBRL: 10,
    paymentMethod: 'PIX',
    status: 'RECEIVED'
  }
  const events = new Map<string, 'RECEIVED' | 'PROCESSED' | 'FAILED' | 'IGNORED'>()
  const ledger = new Set<string>()
  let balance = 0
  let tail = Promise.resolve()
  const tx = {
    rechargeIntent: {
      findUnique: jest.fn(async () => ({ ...recharge })),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(recharge, data, { updatedAt: new Date() })
        return { ...recharge }
      })
    }
  }
  const prisma = {
    rechargeIntent: {
      findUnique: jest.fn(async ({ where }: { where: Record<string, string> }) => {
        if (where.externalReference && where.externalReference !== recharge.externalReference)
          return null
        return { ...recharge }
      }),
      updateMany: jest.fn(
        async ({
          where,
          data
        }: {
          where: Record<string, unknown>
          data: Record<string, unknown>
        }) => {
          if (where.externalOrderId === null && recharge.externalOrderId !== null)
            return { count: 0 }
          Object.assign(recharge, data)
          return { count: 1 }
        }
      )
    },
    providerCustomer: { findUnique: jest.fn(async () => ({ providerCustomerId: 'cus_1' })) },
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => {
      const previous = tail
      let release!: () => void
      tail = new Promise<void>((resolve) => {
        release = resolve
      })
      await previous
      try {
        return await callback(tx)
      } finally {
        release()
      }
    })
  }
  const webhook = {
    recordAndClaim: jest.fn(async ({ eventId }: { eventId: string }) => {
      if (events.get(eventId) === 'PROCESSED') return { outcome: 'duplicate-processed', eventId }
      const outcome = events.has(eventId) ? 'retryable' : 'claimed'
      events.set(eventId, 'RECEIVED')
      return { outcome, eventId }
    }),
    markProcessed: jest.fn(async (id: string) => {
      events.set(id, 'PROCESSED')
    }),
    markIgnored: jest.fn(async (id: string) => {
      events.set(id, 'IGNORED')
    }),
    markFailed: jest.fn(async (id: string) => {
      events.set(id, 'FAILED')
    })
  }
  const wallet = {
    runSerializableTransactionWithRetry: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => prisma.$transaction(callback)),
    credit: jest.fn(
      async (
        _tx: unknown,
        _accountId: string,
        _currency: string,
        amount: number,
        ctx: { idempotencyKey: string }
      ) => {
        if (!ledger.has(ctx.idempotencyKey)) {
          ledger.add(ctx.idempotencyKey)
          balance += amount
        }
      }
    )
  }
  const asaas = {
    assertSandboxEnabled: jest.fn(),
    validateWebhookSignature: jest.fn(
      ({ signatureHeader }: { signatureHeader?: string }) => signatureHeader === 'fake-token'
    ),
    getOrder: jest.fn(async () => ({ ...payment }))
  }
  const audit = { record: jest.fn(async () => undefined) }
  const observability = { recordOperationalEvent: jest.fn(async () => undefined) }
  const risk = {
    evaluateOnRechargePaid: jest.fn(),
    evaluateOnRechargeFailed: jest.fn(),
    evaluateOnManualReview: jest.fn(),
    evaluateOnChargeback: jest.fn()
  }
  const chargeback = { openCaseForRecharge: jest.fn() }
  const restart = () =>
    new CommerceService(
      prisma as never,
      audit as never,
      observability as never,
      {} as never,
      webhook as never,
      wallet as never,
      risk as never,
      chargeback as never,
      asaas as never,
      {} as never
    )
  const service = restart()
  const notify = (
    id: string,
    event = 'PAYMENT_RECEIVED',
    paymentId = 'pay_1',
    token = 'fake-token'
  ) => service.handleAsaasWebhook({ token, body: { id, event, payment: { id: paymentId } } })
  return {
    recharge,
    payment,
    events,
    ledger,
    wallet,
    asaas,
    webhook,
    service,
    audit,
    notify,
    restart,
    balance: () => balance,
    risk,
    chargeback
  }
}

describe('Asaas webhook and WC credit (mock transactional DB, no network)', () => {
  const originalFlags = {
    enabled: process.env.ASAAS_ENABLED,
    environment: process.env.ASAAS_ENVIRONMENT,
    webhook: process.env.ASAAS_WEBHOOK_PROCESSING_ENABLED,
    reconciliation: process.env.ASAAS_RECONCILIATION_ENABLED,
    nodeEnv: process.env.NODE_ENV
  }
  beforeEach(() => {
    process.env.NODE_ENV = 'test'
    process.env.ASAAS_ENABLED = 'true'
    process.env.ASAAS_ENVIRONMENT = 'sandbox'
    process.env.ASAAS_WEBHOOK_PROCESSING_ENABLED = 'true'
  })
  afterEach(() => {
    for (const [key, value] of Object.entries({
      NODE_ENV: originalFlags.nodeEnv,
      ASAAS_ENABLED: originalFlags.enabled,
      ASAAS_ENVIRONMENT: originalFlags.environment,
      ASAAS_WEBHOOK_PROCESSING_ENABLED: originalFlags.webhook,
      ASAAS_RECONCILIATION_ENABLED: originalFlags.reconciliation
    })) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })
  it('rejects a valid-looking webhook while processing flag is off', async () => {
    const f = fixture()
    process.env.ASAAS_WEBHOOK_PROCESSING_ENABLED = 'false'
    await expect(f.notify('evt_disabled')).rejects.toThrow('ASAAS_WEBHOOK_PROCESSING_DISABLED')
    expect(f.asaas.getOrder).not.toHaveBeenCalled()
    expect(f.balance()).toBe(0)
  })
  it('credits 10 WC once for the same delivered event twice', async () => {
    const f = fixture()
    await f.notify('evt_1')
    await f.notify('evt_1')
    expect(f.balance()).toBe(10)
    expect(f.wallet.credit).toHaveBeenCalledTimes(1)
    expect(f.recharge.status).toBe('PAID')
    const stored = f.webhook.recordAndClaim.mock.calls[0][0] as Record<string, unknown>
    expect(stored.signatureHeader).toBeUndefined()
    expect(stored.rawPayload).toEqual({
      id: 'evt_1',
      event: 'PAYMENT_RECEIVED',
      payment: { id: 'pay_1' }
    })
  })

  it('attributes an admin Asaas resync status transition to the operator', async () => {
    const f = fixture()
    process.env.ASAAS_RECONCILIATION_ENABLED = 'true'
    const operator = { id: 'admin-qa', username: 'admin-qa' } as never
    await f.service.resyncRechargeFromProvider('recharge-1', operator)
    expect(f.audit.record).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 'admin-qa', actorUsername: 'admin-qa', action: 'admin.finance.recharge.status'
    }))
  })

  it('concurrent duplicate events produce one ledger credit', async () => {
    const f = fixture()
    await Promise.all([f.notify('evt_2'), f.notify('evt_2')])
    expect(f.balance()).toBe(10)
    expect(f.ledger.size).toBe(1)
  })

  it('a new service instance and a different delivery ID do not credit again', async () => {
    const f = fixture()
    await f.notify('evt_before_restart')
    await f.restart().handleAsaasWebhook({
      token: 'fake-token',
      body: { id: 'evt_after_restart', event: 'PAYMENT_RECEIVED', payment: { id: 'pay_1' } }
    })
    expect(f.balance()).toBe(10)
    expect(f.ledger.size).toBe(1)
  })

  it('out-of-order pending event cannot reverse paid credit', async () => {
    const f = fixture()
    await f.notify('evt_received')
    f.payment.status = 'PENDING'
    await f.notify('evt_created', 'PAYMENT_CREATED')
    expect(f.recharge.status).toBe('PAID')
    expect(f.balance()).toBe(10)
  })

  it('PAYMENT_CONFIRMED cannot credit even if provider now reports RECEIVED', async () => {
    const f = fixture()
    await f.notify('evt_confirmed', 'PAYMENT_CONFIRMED')
    expect(f.recharge.status).toBe('PROCESSING')
    expect(f.balance()).toBe(0)
    await f.notify('evt_received', 'PAYMENT_RECEIVED')
    expect(f.balance()).toBe(10)
  })

  it('invalid token and unknown event never look up or credit', async () => {
    const f = fixture()
    await expect(f.service.handleAsaasWebhook({ token: undefined, body: { id: 'evt_missing', event: 'PAYMENT_RECEIVED', payment: { id: 'pay_1' } } })).rejects.toThrow()
    await expect(f.notify('evt_bad', 'PAYMENT_RECEIVED', 'pay_1', 'wrong')).rejects.toThrow()
    await f.notify('evt_unknown', 'PAYMENT_SOMETHING_NEW')
    expect(f.asaas.getOrder).not.toHaveBeenCalled()
    expect(f.balance()).toBe(0)
    expect(f.events.has('evt_bad')).toBe(false)
  })

  it('routes HTTP webhook auth independently of disabled frontend and creation flags', async () => {
    const { Test } = await import('@nestjs/testing')
    const request = (await import('supertest')).default
    const f = fixture()
    const previousFrontend = process.env.ASAAS_FRONTEND_ENABLED
    const previousCreation = process.env.ASAAS_PAYMENT_CREATION_ENABLED
    process.env.ASAAS_FRONTEND_ENABLED = 'false'
    process.env.ASAAS_PAYMENT_CREATION_ENABLED = 'false'
    const moduleRef = await Test.createTestingModule({
      controllers: [RechargeWebhookController],
      providers: [{ provide: CommerceService, useValue: f.service }]
    }).compile()
    const app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    await app.init()
    const path = '/api/payments/webhooks/asaas'
    const payload = { id: 'evt_http', event: 'PAYMENT_UNKNOWN', payment: { id: 'pay_1' } }
    try {
      expect((await request(app.getHttpServer()).post(path).send(payload)).status).toBe(401)
      expect((await request(app.getHttpServer()).post(path).set('asaas-access-token', 'wrong').send(payload)).status).toBe(401)
      const accepted = await request(app.getHttpServer()).post(path).set('asaas-access-token', 'fake-token').send(payload)
      expect(accepted.status).toBe(200)
      expect(accepted.body).toEqual({ received: true, ignored: true })
      expect(f.asaas.getOrder).not.toHaveBeenCalled()
      expect(f.balance()).toBe(0)
    } finally {
      await app.close()
      if (previousFrontend === undefined) delete process.env.ASAAS_FRONTEND_ENABLED
      else process.env.ASAAS_FRONTEND_ENABLED = previousFrontend
      if (previousCreation === undefined) delete process.env.ASAAS_PAYMENT_CREATION_ENABLED
      else process.env.ASAAS_PAYMENT_CREATION_ENABLED = previousCreation
    }
  })

  it.each([
    ['payment ID', { externalOrderId: 'pay_other' }],
    ['amount', { totalAmountBRL: 11 }],
    ['customer', { providerCustomerId: 'cus_other' }],
    ['reference', { externalReference: 'other' }]
  ])('%s mismatch prevents credit', async (_label, change) => {
    const f = fixture()
    Object.assign(f.payment, change)
    await f.notify('evt_mismatch')
    expect(f.balance()).toBe(0)
    if ('externalOrderId' in change || 'externalReference' in change) {
      expect(f.recharge.status).toBe('PENDING')
    } else {
      expect(f.recharge.status).toBe('MANUAL_REVIEW')
    }
  })

  it('provider failure is retryable, then one credit after recovery', async () => {
    const f = fixture()
    f.asaas.getOrder.mockRejectedValueOnce(new Error('unavailable'))
    await expect(f.notify('evt_retry')).rejects.toThrow()
    expect(f.events.get('evt_retry')).toBe('FAILED')
    await f.notify('evt_retry')
    expect(f.balance()).toBe(10)
  })

  it('refund/chargeback reports review without economic reversal', async () => {
    const f = fixture()
    await f.notify('evt_paid')
    // Even a lagging GET that still reads RECEIVED must not suppress risk review.
    await f.notify('evt_dispute', 'PAYMENT_CHARGEBACK_REQUESTED')
    expect(f.recharge.status).toBe('MANUAL_REVIEW')
    expect(f.balance()).toBe(10)
    expect(f.chargeback.openCaseForRecharge).toHaveBeenCalledTimes(1)
  })

  it('refund event only opens review and never claws WC back', async () => {
    const f = fixture()
    await f.notify('evt_paid')
    await f.notify('evt_refund', 'PAYMENT_REFUNDED')
    expect(f.recharge.status).toBe('MANUAL_REVIEW')
    expect(f.balance()).toBe(10)
    expect(f.wallet.credit).toHaveBeenCalledTimes(1)
  })
})
