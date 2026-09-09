import { execSync } from 'node:child_process'
import { generateSecret, generateSync } from 'otplib'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// PHASE P (2026-08-31), Part 19 -- a background research pass this phase
// found the entire `admin/store/orders/:id/action` and
// `admin/store/deliveries/:id/action` surface (StoreAdminService.
// orderAction/deliveryAction) had ZERO e2e coverage anywhere in this
// codebase -- confirmed by directory listing (no `store`/`commerce`-named
// spec existed before this file). The recharge/webhook side
// (recharge-payments.e2e-spec.ts, recharge-refund-rbac.e2e-spec.ts) was
// already well covered; this was the real, biggest security-test gap.
const CONTAINER = 'bloodmoon-e2e-store-admin-security'

describe('Store admin order/delivery actions -- security -- Phase P Part 19', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService
  let twoFactorService: import('../src/modules/auth/two-factor.service').TwoFactorService
  const suffix = Date.now().toString(36)
  const totpSecrets = new Map<string, string>()

  const noPermsAdmin = { name: 'Store Sec No Perms Admin', username: `sa_np_${suffix}`, password: 'store-sec-noperms-pw-1', personalId: '30120230341', email: `sa-np-${suffix}@example.invalid` }
  const ordersOnlyAdmin = { name: 'Store Sec Orders Admin', username: `sa_oo_${suffix}`, password: 'store-sec-ordersonly-pw-1', personalId: '30220230342', email: `sa-oo-${suffix}@example.invalid` }
  const superAdministrator = { name: 'Store Sec Super Admin', username: `sa_s_${suffix}`, password: 'store-sec-super-pw-1', personalId: '30320230343', email: `sa-s-${suffix}@example.invalid` }
  let noPermsToken = ''
  let ordersOnlyToken = ''
  let superAdminToken = ''

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET = 'e2e-store-admin-security-access-secret'
    process.env.JWT_REFRESH_SECRET = 'e2e-store-admin-security-refresh-secret'
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-store-admin-security-two-factor-32'
    process.env.AUTH_CAPTCHA_TEST_BYPASS = '1'
    process.env.AUTH_MAIL_TEST_BYPASS = '1'
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { TwoFactorService } = await import('../src/modules/auth/two-factor.service')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
    prisma = app.get(PrismaService)
    twoFactorService = app.get(TwoFactorService)
  }, 120000)

  afterAll(async () => app?.close())

  jest.setTimeout(30000)

  const request = () => import('supertest').then((module) => module.default(httpServer))

  const enableRealTwoFactor = async (username: string) => {
    const secret = generateSecret({ length: 20 })
    totpSecrets.set(username, secret)
    await prisma.account.update({ where: { username }, data: { twoFactorEnabled: true, twoFactorSecret: twoFactorService.encrypt(secret) } })
  }

  const login = async (username: string, password: string) => {
    const totpCode = totpSecrets.has(username) ? generateSync({ secret: totpSecrets.get(username)! }) : undefined
    const result = await (await request()).post('/api/auth/login').send({ username, password, ...(totpCode ? { totpCode } : {}) })
    expect(result.status).toBe(201)
    return result.body.accessToken as string
  }

  it('bootstraps a no-permission ADMIN, an orders-only-delegated ADMIN, and a SUPER_ADMIN', async () => {
    const req = await request()
    for (const account of [noPermsAdmin, ordersOnlyAdmin, superAdministrator]) {
      const result = await req.post('/api/auth/register').send(account)
      expect(result.status).toBe(201)
    }
    await prisma.account.update({ where: { username: noPermsAdmin.username }, data: { role: 'ADMIN' } })
    await prisma.account.update({ where: { username: ordersOnlyAdmin.username }, data: { role: 'ADMIN' } })
    await prisma.account.update({ where: { username: superAdministrator.username }, data: { role: 'SUPER_ADMIN' } })
    await enableRealTwoFactor(noPermsAdmin.username)
    await enableRealTwoFactor(ordersOnlyAdmin.username)
    await enableRealTwoFactor(superAdministrator.username)

    // Real, targeted delegation -- admin.store.orders and
    // admin.store.deliveries ONLY, deliberately WITHOUT admin.store.refund
    // -- proving the internal requirePermission() check in
    // store-admin.service.ts's orderAction/deliveryAction actually gates
    // refund separately from ordinary order/delivery operations, not just
    // that the controller-level guard blocks everything uniformly.
    const ordersOnlyAccount = await prisma.account.findUniqueOrThrow({ where: { username: ordersOnlyAdmin.username } })
    await prisma.accountPermission.createMany({
      data: [
        { accountId: ordersOnlyAccount.id, key: 'admin.store.orders', granted: true },
        { accountId: ordersOnlyAccount.id, key: 'admin.store.deliveries', granted: true },
        { accountId: ordersOnlyAccount.id, key: 'admin.store.view', granted: true }
      ]
    })

    noPermsToken = await login(noPermsAdmin.username, noPermsAdmin.password)
    ordersOnlyToken = await login(ordersOnlyAdmin.username, ordersOnlyAdmin.password)
    superAdminToken = await login(superAdministrator.username, superAdministrator.password)
  })

  let counter = 0
  const makeOrderFixture = async (status: 'PAID' | 'COMPLETED' | 'PREPARED' = 'PAID') => {
    counter += 1
    const player = await prisma.account.create({
      data: {
        username: `sa_player_${suffix}_${counter}`.slice(0, 64),
        name: `Store Sec Player ${counter}`,
        email: `sa-player-${suffix}-${counter}@example.invalid`,
        passwordHash: 'not-used-in-this-suite',
        role: 'PLAYER',
        status: 'ACTIVE',
        currencies: { create: [{ currency: 'WCOIN', balance: 1000 }] }
      }
    })
    const product = await prisma.shopProduct.create({
      data: {
        key: `sa-product-${suffix}-${counter}`,
        slug: `sa-product-${suffix}-${counter}`,
        name: `Store Sec Product ${counter}`,
        short: 'SSP',
        category: 'Servico',
        description: 'Fixture product for store-admin-security tests.',
        price: 30,
        currency: 'WCOIN',
        status: 'ACTIVE'
      }
    })
    const order = await prisma.purchaseIntent.create({
      data: {
        accountId: player.id,
        productId: product.id,
        quantity: 1,
        price: 30,
        currency: 'WCOIN',
        status,
        correlationId: `sa-order-${suffix}-${counter}`
      }
    })
    return { player, product, order }
  }

  it('RBAC_STORE_ORDER_ACTION_DENIED: a plain ADMIN with no store delegation gets 403 on any order action', async () => {
    const { order } = await makeOrderFixture()
    const res = await (await request())
      .post(`/api/admin/store/orders/${order.id}/action`)
      .set('Authorization', `Bearer ${noPermsToken}`)
      .send({ action: 'mark-paid' })
    expect(res.status).toBe(403)
  })

  it('RBAC_STORE_ORDER_REFUND_REQUIRES_SEPARATE_PERMISSION: orders-only delegation can act on an order but not refund it', async () => {
    const { order } = await makeOrderFixture('PREPARED')

    const markPaid = await (await request())
      .post(`/api/admin/store/orders/${order.id}/action`)
      .set('Authorization', `Bearer ${ordersOnlyToken}`)
      .send({ action: 'mark-paid' })
    expect(markPaid.status).toBe(201)

    const refundAttempt = await (await request())
      .post(`/api/admin/store/orders/${order.id}/action`)
      .set('Authorization', `Bearer ${ordersOnlyToken}`)
      .send({ action: 'refund', reason: 'tentativa sem admin.store.refund' })
    expect(refundAttempt.status).toBe(403)

    const unchanged = await prisma.purchaseIntent.findUniqueOrThrow({ where: { id: order.id } })
    expect(unchanged.status).toBe('PAID')
  })

  it('STORE_ORDER_DOUBLE_REFUND_REJECTED: SUPER_ADMIN can refund once; a second attempt on the same order is rejected', async () => {
    const { order, player } = await makeOrderFixture('PAID')
    const balanceBefore = (await prisma.accountCurrency.findUniqueOrThrow({ where: { accountId_currency: { accountId: player.id, currency: 'WCOIN' } } })).balance

    const first = await (await request())
      .post(`/api/admin/store/orders/${order.id}/action`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ action: 'refund', reason: 'e2e primeiro estorno' })
    expect(first.status).toBe(201)

    const balanceAfter = (await prisma.accountCurrency.findUniqueOrThrow({ where: { accountId_currency: { accountId: player.id, currency: 'WCOIN' } } })).balance
    expect(balanceAfter).toBe(balanceBefore + 30)

    const second = await (await request())
      .post(`/api/admin/store/orders/${order.id}/action`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ action: 'refund', reason: 'e2e segunda tentativa de estorno' })
    expect(second.status).toBeGreaterThanOrEqual(400)

    const balanceStillAfter = (await prisma.accountCurrency.findUniqueOrThrow({ where: { accountId_currency: { accountId: player.id, currency: 'WCOIN' } } })).balance
    expect(balanceStillAfter).toBe(balanceAfter)
  })

  it('RBAC_STORE_DELIVERY_ACTION_DENIED: a plain ADMIN with no store delegation gets 403 on a delivery action', async () => {
    const { order } = await makeOrderFixture('PAID')
    const delivery = await prisma.storeDelivery.create({
      data: { purchaseId: order.id, status: 'WAITING', target: 'ACCOUNT', accountId: order.accountId, itemName: 'Fixture item', correlationId: `sa-delivery-${suffix}-${++counter}` }
    })

    const res = await (await request())
      .post(`/api/admin/store/deliveries/${delivery.id}/action`)
      .set('Authorization', `Bearer ${noPermsToken}`)
      .send({ action: 'process' })
    expect(res.status).toBe(403)
  })

  it('STORE_DELIVERY_REPROCESS_LIMIT_ENFORCED: a delivery already at maxAttempts cannot be reprocessed again', async () => {
    const { order } = await makeOrderFixture('PAID')
    const delivery = await prisma.storeDelivery.create({
      data: { purchaseId: order.id, status: 'FAILED', target: 'ACCOUNT', accountId: order.accountId, itemName: 'Fixture item', attempts: 3, maxAttempts: 3, correlationId: `sa-delivery-cap-${suffix}-${++counter}` }
    })

    const res = await (await request())
      .post(`/api/admin/store/deliveries/${delivery.id}/action`)
      .set('Authorization', `Bearer ${ordersOnlyToken}`)
      .send({ action: 'reprocess' })
    expect(res.status).toBe(400)

    const unchanged = await prisma.storeDelivery.findUniqueOrThrow({ where: { id: delivery.id } })
    expect(unchanged.attempts).toBe(3)
    expect(unchanged.status).toBe('FAILED')
  })

  it('STORE_DELIVERY_REFUND_ACTION_BLOCKED_BY_DESIGN: even a permitted admin cannot refund through the delivery endpoint', async () => {
    const { order } = await makeOrderFixture('PAID')
    const delivery = await prisma.storeDelivery.create({
      data: { purchaseId: order.id, status: 'COMPLETED', target: 'ACCOUNT', accountId: order.accountId, itemName: 'Fixture item', correlationId: `sa-delivery-refund-${suffix}-${++counter}` }
    })

    const res = await (await request())
      .post(`/api/admin/store/deliveries/${delivery.id}/action`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ action: 'refund', reason: 'tentativa de estorno pela entrega' })
    expect(res.status).toBe(400)

    const unchanged = await prisma.storeDelivery.findUniqueOrThrow({ where: { id: delivery.id } })
    expect(unchanged.status).toBe('COMPLETED')
  })
})
