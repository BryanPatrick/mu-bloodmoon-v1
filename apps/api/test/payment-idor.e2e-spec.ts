import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// PHASE Q (2026-08-31), Part 11 -- a background research pass this phase
// audited every player-facing financial GET endpoint
// (commerce.controller.ts / vip.controller.ts) and found no IDOR: most
// derive accountId strictly from the JWT with no id parameter to spoof
// (GET account/purchases, GET account/recharges, GET account/vip), and
// the one real exception (GET recharge/intents/:id) already checks
// `recharge.accountId !== user.id` before returning anything
// (commerce.service.ts's getRechargeForAccount). This file proves that
// finding with real tests rather than leaving it as an audit claim.
const CONTAINER = 'bloodmoon-e2e-payment-idor'

describe('Player financial endpoints -- IDOR closure -- Phase Q Part 11', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET = 'e2e-payment-idor-access-secret'
    process.env.JWT_REFRESH_SECRET = 'e2e-payment-idor-refresh-secret'
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-payment-idor-two-factor-32char'
    process.env.AUTH_CAPTCHA_TEST_BYPASS = '1'
    process.env.AUTH_MAIL_TEST_BYPASS = '1'
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const { PrismaService } = await import('../src/database/prisma.service')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
    prisma = app.get(PrismaService)
  }, 120000)

  afterAll(async () => app?.close())

  jest.setTimeout(30000)

  const request = () => import('supertest').then((module) => module.default(httpServer))
  const suffix = Date.now().toString(36)
  // Short but still unique-across-reruns against the shared local dev DB
  // (the last 4 base36 digits of the same timestamp) -- real HTTP
  // registration enforces a 20-char username limit (auth.service.ts),
  // which the full `suffix` alone would blow past once combined with a
  // descriptive label.
  const shortSuffix = suffix.slice(-4)

  let personalIdCounter = 100
  const registerAndLogin = async (label: string) => {
    personalIdCounter += 1
    const account = { name: `IDOR ${label}`, username: `idor_${shortSuffix}_${personalIdCounter.toString(36)}`, password: `idor-${label}-pw-1`, personalId: `1112${personalIdCounter}0341`, email: `idor-${label}-${suffix}@example.invalid` }
    const req = await request()
    const registerRes = await req.post('/api/auth/register').send(account)
    expect(registerRes.status).toBe(201)
    const loginRes = await (await request()).post('/api/auth/login').send({ username: account.username, password: account.password })
    expect(loginRes.status).toBe(201)
    return { token: loginRes.body.accessToken as string, username: account.username }
  }

  it('RECHARGE_DETAIL_IDOR: account A cannot fetch account B\'s recharge intent by id', async () => {
    const a = await registerAndLogin('a')
    const b = await registerAndLogin('b')
    const accountB = await prisma.account.findUniqueOrThrow({ where: { username: b.username } })
    const pkg = await prisma.rechargePackage.create({ data: { key: `idor-pkg-${suffix}`, currency: 'WCOIN', amount: 10, bonus: 0, price: '10,00', active: true } })
    const rechargeB = await prisma.rechargeIntent.create({
      data: { accountId: accountB.id, packageId: pkg.id, currency: 'WCOIN', amount: 10, bonus: 0, price: '10,00', status: 'PAID', approvedAt: new Date() }
    })

    const ownRes = await (await request()).get(`/api/recharge/intents/${rechargeB.id}`).set('Authorization', `Bearer ${b.token}`)
    expect(ownRes.status).toBe(200)

    const spoofRes = await (await request()).get(`/api/recharge/intents/${rechargeB.id}`).set('Authorization', `Bearer ${a.token}`)
    expect(spoofRes.status).toBe(404)
  })

  it('ACCOUNT_PURCHASES_NO_IDOR: listing "my purchases" never accepts a spoofable id -- always scoped to the JWT', async () => {
    const a = await registerAndLogin('purchasesa')
    const b = await registerAndLogin('purchasesb')
    const accountB = await prisma.account.findUniqueOrThrow({ where: { username: b.username } })
    const product = await prisma.shopProduct.create({
      data: { key: `idor-product-${suffix}`, slug: `idor-product-${suffix}`, name: 'IDOR fixture', short: 'IDR', category: 'Servico', description: 'fixture', price: 10, currency: 'WCOIN', status: 'ACTIVE' }
    })
    await prisma.purchaseIntent.create({
      data: { accountId: accountB.id, productId: product.id, quantity: 1, price: 10, currency: 'WCOIN', status: 'COMPLETED', correlationId: `idor-purchase-${suffix}` }
    })

    const asA = await (await request()).get('/api/account/purchases').set('Authorization', `Bearer ${a.token}`)
    expect(asA.status).toBe(200)
    expect(Array.isArray(asA.body)).toBe(true)
    expect(asA.body.find((p: { accountId?: string }) => p.accountId === accountB.id || false)).toBeUndefined()
    // The response is inherently scoped to the caller's own JWT-derived
    // account -- there is no accountId/username field the endpoint even
    // reads from the request to spoof.
    const asB = await (await request()).get('/api/account/purchases').set('Authorization', `Bearer ${b.token}`)
    expect(asB.status).toBe(200)
    expect(asB.body.length).toBeGreaterThanOrEqual(1)
  })

  it('ACCOUNT_VIP_NO_IDOR: "my VIP entitlement" is always scoped to the JWT, never a spoofable id', async () => {
    const a = await registerAndLogin('vipa')
    const b = await registerAndLogin('vipb')
    const accountB = await prisma.account.findUniqueOrThrow({ where: { username: b.username } })
    await prisma.vipEntitlement.create({
      data: { accountId: accountB.id, tier: 'GOLD', activatedAt: new Date(), expiresAt: new Date(Date.now() + 86_400_000), totalDaysGranted: 30, status: 'ACTIVE' }
    })

    const asA = await (await request()).get('/api/account/vip').set('Authorization', `Bearer ${a.token}`)
    expect(asA.status).toBe(200)
    expect(asA.body.tier).not.toBe('GOLD')

    const asB = await (await request()).get('/api/account/vip').set('Authorization', `Bearer ${b.token}`)
    expect(asB.status).toBe(200)
    expect(asB.body.tier).toBe('GOLD')
  })

  it('UNAUTHENTICATED_REQUESTS_REJECTED: every player financial endpoint requires a real token', async () => {
    const purchases = await (await request()).get('/api/account/purchases')
    expect(purchases.status).toBe(401)
    const recharges = await (await request()).get('/api/account/recharges')
    expect(recharges.status).toBe(401)
    const vip = await (await request()).get('/api/account/vip')
    expect(vip.status).toBe(401)
  })
})
