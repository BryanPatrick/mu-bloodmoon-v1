import { execSync } from 'node:child_process'
import { generateSecret, generateSync } from 'otplib'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// PHASE P (2026-08-31), Part 9/10 -- server-side validation that a WCOIN
// RechargePackage created/edited through the admin CRUD endpoints can
// never again drift from the 1:1 peg with R$ (ADR-0008) the way the
// original real conflict did (R$19,90 selling 500 WC). Also enforces
// "do not silently produce fractional WC" by rejecting a non-integer BRL
// price for WCOIN packages outright, rather than silently rounding it
// (see commerce.service.ts's assertWcoinPackageInvariant and
// docs/open-questions.md OQ-022 for the still-open policy question this
// is an interim technical default for).
const CONTAINER = 'bloodmoon-e2e-recharge-package-admin-guard'

describe('Recharge package admin -- WCOIN 1:1 peg guard -- Phase P Part 9/10', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService
  let twoFactorService: import('../src/modules/auth/two-factor.service').TwoFactorService
  const suffix = Date.now().toString(36)
  let superAdminToken = ''

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET = 'e2e-recharge-package-guard-access-secret'
    process.env.JWT_REFRESH_SECRET = 'e2e-recharge-package-guard-refresh-secret'
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-recharge-package-guard-two-factor32'
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

    const superAdministrator = { name: 'Package Guard Super Admin', username: `pkg_s_${suffix}`, password: 'package-guard-super-pw-1', personalId: '40120230341', email: `pkg-s-${suffix}@example.invalid` }
    const req = await (await import('supertest')).default(httpServer)
    const registerRes = await req.post('/api/auth/register').send(superAdministrator)
    expect(registerRes.status).toBe(201)
    await prisma.account.update({ where: { username: superAdministrator.username }, data: { role: 'SUPER_ADMIN' } })
    const secret = generateSecret({ length: 20 })
    await prisma.account.update({ where: { username: superAdministrator.username }, data: { twoFactorEnabled: true, twoFactorSecret: twoFactorService.encrypt(secret) } })
    const totpCode = generateSync({ secret })
    const loginRes = await (await import('supertest')).default(httpServer).post('/api/auth/login').send({ username: superAdministrator.username, password: superAdministrator.password, totpCode })
    expect(loginRes.status).toBe(201)
    superAdminToken = loginRes.body.accessToken
  }, 120000)

  afterAll(async () => app?.close())

  jest.setTimeout(30000)

  const request = () => import('supertest').then((module) => module.default(httpServer))

  it('WCOIN_PEG_CREATE_ALLOWED: a package that honors the 1:1 peg is created successfully', async () => {
    const res = await (await request())
      .post('/api/admin/recharge/packages')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ key: `pkg-guard-ok-${suffix}`, currency: 'WCOIN', amount: 30, bonus: 0, price: '30,00', active: true })
    expect(res.status).toBe(201)
  })

  it('WCOIN_PEG_CREATE_REJECTED: an amount that violates the 1:1 peg is rejected', async () => {
    const res = await (await request())
      .post('/api/admin/recharge/packages')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ key: `pkg-guard-bad-${suffix}`, currency: 'WCOIN', amount: 500, bonus: 0, price: '19,90', active: true })
    expect(res.status).toBe(400)
    const found = await prisma.rechargePackage.findUnique({ where: { key: `pkg-guard-bad-${suffix}` } })
    expect(found).toBeNull()
  })

  it('WCOIN_FRACTIONAL_PRICE_REJECTED: a non-integer BRL price for a WCOIN package is rejected, not silently rounded', async () => {
    const res = await (await request())
      .post('/api/admin/recharge/packages')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ key: `pkg-guard-fractional-${suffix}`, currency: 'WCOIN', amount: 20, bonus: 0, price: '19,90', active: true })
    expect(res.status).toBe(400)
  })

  it('WCOIN_PEG_UPDATE_REJECTED: editing an existing compliant package to violate the peg is rejected, original values untouched', async () => {
    const created = await (await request())
      .post('/api/admin/recharge/packages')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ key: `pkg-guard-edit-${suffix}`, currency: 'WCOIN', amount: 40, bonus: 0, price: '40,00', active: true })
    expect(created.status).toBe(201)

    const res = await (await request())
      .patch(`/api/admin/recharge/packages/${created.body.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ amount: 4000 })
    expect(res.status).toBe(400)

    const unchanged = await prisma.rechargePackage.findUniqueOrThrow({ where: { id: created.body.id } })
    expect(unchanged.amount).toBe(40)
  })

  it('NON_WCOIN_PACKAGES_UNAFFECTED: GOBLIN_POINT/HUNT_POINT packages are not subject to the 1:1 guard', async () => {
    const res = await (await request())
      .post('/api/admin/recharge/packages')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ key: `pkg-guard-gp-${suffix}`, currency: 'GOBLIN_POINT', amount: 340, bonus: 0, price: '19,90', active: true })
    expect(res.status).toBe(201)
  })
})
