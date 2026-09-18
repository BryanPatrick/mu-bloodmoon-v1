import { CommerceService } from './commerce.service'
import { CommerceController } from './commerce.controller'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { StoreAdminService } from './store-admin.service'
import { LegacyCatalogConfigService } from './legacy-catalog-config.service'
import { LegacyCatalogEffectiveStateService } from './legacy-catalog-effective-state.service'
import { PaymentReconciliationService } from './payment-reconciliation.service'
import { BillingProfileService } from '../payments/billing-profile.service'

const original = {
  enabled: process.env.ASAAS_ENABLED,
  environment: process.env.ASAAS_ENVIRONMENT,
  nodeEnv: process.env.NODE_ENV,
  apiKey: process.env.ASAAS_API_KEY,
  frontendEnabled: process.env.ASAAS_FRONTEND_ENABLED,
  creationEnabled: process.env.ASAAS_PAYMENT_CREATION_ENABLED
}

beforeEach(() => {
  process.env.ASAAS_ENABLED = 'true'
  process.env.ASAAS_ENVIRONMENT = 'sandbox'
  process.env.ASAAS_API_KEY = '$aact_hmlg_fake_test_only'
  process.env.ASAAS_FRONTEND_ENABLED = 'true'
  process.env.ASAAS_PAYMENT_CREATION_ENABLED = 'true'
  process.env.NODE_ENV = 'test'
})
afterEach(() => {
  for (const [key, value] of Object.entries({
    ASAAS_ENABLED: original.enabled,
    ASAAS_ENVIRONMENT: original.environment,
    NODE_ENV: original.nodeEnv,
    ASAAS_API_KEY: original.apiKey,
    ASAAS_FRONTEND_ENABLED: original.frontendEnabled,
    ASAAS_PAYMENT_CREATION_ENABLED: original.creationEnabled
  })) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

function fixture() {
  const recharge = {
    id: 'recharge-1',
    accountId: 'account-1',
    packageId: 'pack-1',
    currency: 'WCOIN',
    amount: 10,
    bonus: 0,
    price: '10,00',
    status: 'PREPARED',
    provider: 'asaas',
    providerEnvironment: 'sandbox',
    providerCreateState: 'NONE',
    correlationId: 'reference-1',
    externalReference: null as string | null,
    externalOrderId: null as string | null,
    updatedAt: new Date(),
    createdAt: new Date(),
    account: { username: 'qa', email: 'qa@example.invalid' },
    package: { key: 'wcoin-10' }
  }
  const order = {
    externalOrderId: 'pay_1',
    externalReference: 'reference-1',
    providerCustomerId: 'cus_1',
    totalAmountBRL: 10,
    paymentMethod: 'PIX',
    status: 'PENDING'
  }
  const prisma = {
    rechargeIntent: {
      findUnique: jest.fn(async () => ({ ...recharge })),
      updateMany: jest.fn(
        async ({
          where,
          data
        }: {
          where: Record<string, unknown>
          data: Record<string, unknown>
        }) => {
          for (const [key, expected] of Object.entries(where)) {
            if (key === 'id') continue
            if ((recharge as unknown as Record<string, unknown>)[key] !== expected)
              return { count: 0 }
          }
          Object.assign(recharge, data, { updatedAt: new Date() })
          return { count: 1 }
        }
      ),
      create: jest.fn()
    },
    rechargePackage: {
      findUnique: jest.fn(async () => ({
        id: 'pack-1',
        active: true,
        currency: 'WCOIN',
        amount: 10,
        bonus: 0,
        price: '10,00'
      }))
    },
    providerCustomer: { findUniqueOrThrow: jest.fn(async () => ({ providerCustomerId: 'cus_1' })) }
  }
  const asaas = {
    assertSandboxEnabled: jest.fn(),
    createOrder: jest.fn(async () => ({
      externalOrderId: 'pay_1',
      status: 'PENDING',
      paymentMethod: 'PIX',
      qrCode: 'fake-pix'
    })),
    getOrder: jest.fn(async () => order),
    findPaymentByExternalReference: jest.fn(async (): Promise<typeof order | null> => null),
    getCheckout: jest.fn(async () => ({
      externalOrderId: 'pay_1',
      status: 'PENDING',
      paymentMethod: 'PIX',
      qrCode: 'fake-pix'
    }))
  }
  const billing = { ensureAsaasCustomer: jest.fn(async () => 'cus_1') }
  const noop = { record: jest.fn(), recordOperationalEvent: jest.fn() }
  const risk = {
    assertNoActivePaymentRestriction: jest.fn(),
    assertNoActiveAccountRestriction: jest.fn()
  }
  const service = new CommerceService(
    prisma as never,
    noop as never,
    noop as never,
    {} as never,
    {} as never,
    {} as never,
    risk as never,
    {} as never,
    asaas as never,
    billing as never
  )
  const user = { id: 'account-1', username: 'qa' } as never
  return { recharge, order, prisma, asaas, billing, service, user }
}

describe('Asaas checkout reservation (mock provider, no DB/network)', () => {
  it('blocks an authenticated direct HTTP recharge request before provider POST', async () => {
    const { Test } = await import('@nestjs/testing')
    const request = (await import('supertest')).default
    const f = fixture()
    process.env.ASAAS_FRONTEND_ENABLED = 'true'
    process.env.ASAAS_PAYMENT_CREATION_ENABLED = 'false'
    const moduleRef = await Test.createTestingModule({
      controllers: [CommerceController],
      providers: [
        { provide: CommerceService, useValue: f.service },
        { provide: StoreAdminService, useValue: {} },
        { provide: LegacyCatalogConfigService, useValue: {} },
        { provide: LegacyCatalogEffectiveStateService, useValue: {} },
        { provide: PaymentReconciliationService, useValue: {} },
        { provide: BillingProfileService, useValue: {} }
      ]
    }).overrideGuard(JwtAuthGuard).useValue({
      canActivate: (context: { switchToHttp: () => { getRequest: () => { headers: { authorization?: string }; user?: unknown } } }) => {
        const req = context.switchToHttp().getRequest()
        if (req.headers.authorization !== 'Bearer synthetic-qa-token') return false
        req.user = f.user
        return true
      }
    }).compile()
    const app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    await app.init()
    try {
      const response = await request(app.getHttpServer())
        .post('/api/recharge/intents')
        .set('Authorization', 'Bearer synthetic-qa-token')
        .send({ packageId: 'pack-1' })
      expect(response.status).toBe(503)
      expect(f.prisma.rechargeIntent.create).not.toHaveBeenCalled()
      expect(f.asaas.createOrder).not.toHaveBeenCalled()
      expect(f.billing.ensureAsaasCustomer).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  }, 60000)
  it.each([
    ['missing flags', undefined, undefined],
    ['frontend off', 'false', 'true'],
    ['creation off', 'true', 'false']
  ])('rejects direct checkout with %s before provider or billing calls', async (_case, frontend, creation) => {
    const f = fixture()
    if (frontend === undefined) delete process.env.ASAAS_FRONTEND_ENABLED
    else process.env.ASAAS_FRONTEND_ENABLED = frontend
    if (creation === undefined) delete process.env.ASAAS_PAYMENT_CREATION_ENABLED
    else process.env.ASAAS_PAYMENT_CREATION_ENABLED = creation
    await expect(f.service.createRechargeCheckout('recharge-1', f.user)).rejects.toThrow('PAYMENTS_DISABLED')
    await expect(f.service.createRechargeIntent({ packageId: 'pack-1' }, f.user)).rejects.toThrow('PAYMENTS_DISABLED')
    expect(f.asaas.createOrder).not.toHaveBeenCalled()
    expect(f.billing.ensureAsaasCustomer).not.toHaveBeenCalled()
    expect(f.prisma.rechargeIntent.create).not.toHaveBeenCalled()
  })

  it('keeps admin reconciliation separate from new charge creation', async () => {
    const f = fixture()
    process.env.ASAAS_PAYMENT_CREATION_ENABLED = 'false'
    process.env.ASAAS_RECONCILIATION_ENABLED = 'true'
    f.recharge.externalOrderId = null
    f.recharge.externalReference = 'reference-1'
    f.recharge.providerCreateState = 'RECONCILE_REQUIRED'
    await expect(f.service.resyncRechargeFromProvider('recharge-1', f.user)).rejects.toThrow('ASAAS_PAYMENT_RECONCILE_REQUIRED')
    expect(f.asaas.findPaymentByExternalReference).toHaveBeenCalledWith('reference-1')
    expect(f.asaas.createOrder).not.toHaveBeenCalled()
    delete process.env.ASAAS_RECONCILIATION_ENABLED
  })

  it('refuses an existing WCoin bonus package before creating an intent', async () => {
    const f = fixture()
    f.prisma.rechargePackage.findUnique.mockResolvedValueOnce({
      id: 'pack-1',
      active: true,
      currency: 'WCOIN',
      amount: 50,
      bonus: 5,
      price: '50,00'
    })
    await expect(f.service.createRechargeIntent({ packageId: 'pack-1' }, f.user)).rejects.toThrow(
      'sem bonus'
    )
    expect(f.prisma.rechargeIntent.create).not.toHaveBeenCalled()
  })

  it('rejects ambiguous dot-decimal package prices in the Asaas path', async () => {
    const f = fixture()
    f.prisma.rechargePackage.findUnique.mockResolvedValueOnce({
      id: 'pack-1',
      active: true,
      currency: 'WCOIN',
      amount: 10,
      bonus: 0,
      price: '10.00'
    })
    await expect(f.service.createRechargeIntent({ packageId: 'pack-1' }, f.user)).rejects.toThrow(
      'R$1 = 1 WC'
    )
    expect(f.prisma.rechargeIntent.create).not.toHaveBeenCalled()
  })

  it('cannot start a Mercado Pago checkout while Asaas sandbox mode is selected', async () => {
    const f = fixture()
    f.recharge.provider = 'mercadopago'
    await expect(f.service.createRechargeCheckout('recharge-1', f.user)).rejects.toThrow(
      'MERCADO_PAGO_CHECKOUT_DISABLED_WHILE_ASAAS_SELECTED'
    )
    expect(f.asaas.createOrder).not.toHaveBeenCalled()
  })

  it('reserves once: concurrent checkout cannot issue a second POST', async () => {
    const f = fixture()
    let release!: () => void
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    let entered!: () => void
    const started = new Promise<void>((resolve) => {
      entered = resolve
    })
    f.asaas.createOrder.mockImplementationOnce(async () => {
      entered()
      await held
      return {
        externalOrderId: 'pay_1',
        status: 'PENDING',
        paymentMethod: 'PIX',
        qrCode: 'fake-pix'
      }
    })
    const first = f.service.createRechargeCheckout('recharge-1', f.user)
    await started
    await expect(f.service.createRechargeCheckout('recharge-1', f.user)).rejects.toThrow(
      'ASAAS_PAYMENT_CREATION_IN_PROGRESS'
    )
    release()
    await expect(first).resolves.toMatchObject({ externalOrderId: 'pay_1', status: 'PENDING' })
    expect(f.asaas.createOrder).toHaveBeenCalledTimes(1)
    expect(f.recharge.providerCreateState).toBe('CREATED')
  })

  it('marks timeout ambiguous, then recovers by reference without repeating POST', async () => {
    const f = fixture()
    f.asaas.createOrder.mockRejectedValueOnce(new Error('timeout'))
    await expect(f.service.createRechargeCheckout('recharge-1', f.user)).rejects.toThrow(
      'ASAAS_PAYMENT_RECONCILE_REQUIRED'
    )
    expect(f.recharge.providerCreateState).toBe('RECONCILE_REQUIRED')
    await expect(f.service.createRechargeCheckout('recharge-1', f.user)).rejects.toThrow(
      'ASAAS_PAYMENT_RECONCILE_REQUIRED'
    )
    f.asaas.findPaymentByExternalReference.mockResolvedValueOnce(f.order)
    await expect(f.service.createRechargeCheckout('recharge-1', f.user)).resolves.toMatchObject({
      externalOrderId: 'pay_1'
    })
    expect(f.asaas.createOrder).toHaveBeenCalledTimes(1)
    expect(f.recharge.providerCreateState).toBe('CREATED')
  })
})
