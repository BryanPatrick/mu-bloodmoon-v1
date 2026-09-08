import { execSync } from 'node:child_process'
import { generateSecret, generateSync } from 'otplib'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// PHASE Q (2026-08-31), Part 12 -- a real search this phase confirmed no
// GM-role RBAC test exists anywhere against any commerce/VIP/wallet
// endpoint in this codebase (every existing payment RBAC test uses only
// PLAYER/plain-ADMIN/SUPER_ADMIN personas). GM's own role definition
// (permissions.ts's gmPermissions) never includes any admin.finance.*/
// admin.recharge.*/admin.risk.*/admin.chargeback.*/admin.store.* key --
// this file proves that holds at the HTTP layer, not just in the role
// table, for every mutating payment-admin surface. Role != permission is
// the point: GM has a real role, just never one of these permissions.
const CONTAINER = 'bloodmoon-e2e-payment-gm-rbac'

describe('Payment admin endpoints -- GM denial -- Phase Q Part 12', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService
  let twoFactorService: import('../src/modules/auth/two-factor.service').TwoFactorService
  const suffix = Date.now().toString(36)
  let gmToken = ''

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET = 'e2e-payment-gm-rbac-access-secret'
    process.env.JWT_REFRESH_SECRET = 'e2e-payment-gm-rbac-refresh-secret'
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-payment-gm-rbac-two-factor-32c'
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

    const gm = { name: 'Payment GM RBAC', username: `pgm_${suffix}`, password: 'payment-gm-rbac-pw-1', personalId: '50120230341', email: `pgm-${suffix}@example.invalid` }
    const req = await (await import('supertest')).default(httpServer)
    const registerRes = await req.post('/api/auth/register').send(gm)
    expect(registerRes.status).toBe(201)
    await prisma.account.update({ where: { username: gm.username }, data: { role: 'GM' } })
    const secret = generateSecret({ length: 20 })
    await prisma.account.update({ where: { username: gm.username }, data: { twoFactorEnabled: true, twoFactorSecret: twoFactorService.encrypt(secret) } })
    const totpCode = generateSync({ secret })
    const loginRes = await (await import('supertest')).default(httpServer).post('/api/auth/login').send({ username: gm.username, password: gm.password, totpCode })
    expect(loginRes.status).toBe(201)
    gmToken = loginRes.body.accessToken
  }, 120000)

  afterAll(async () => app?.close())

  jest.setTimeout(30000)

  const request = () => import('supertest').then((module) => module.default(httpServer))

  it('GM_DENIED_FINANCE_VIEW: GM cannot view the recharge/purchase queues', async () => {
    const recharges = await (await request()).get('/api/admin/finance/recharges').set('Authorization', `Bearer ${gmToken}`)
    expect(recharges.status).toBe(403)
    const purchases = await (await request()).get('/api/admin/finance/purchases').set('Authorization', `Bearer ${gmToken}`)
    expect(purchases.status).toBe(403)
  })

  // PHASE AC (2026-09-05): isolated for the Payment Risk / Chargeback
  // release -- GM_DENIED_REFUND/GM_DENIED_PROVIDER_REFUND (testing
  // POST admin/finance/recharges/:id/refund and .../provider-refund)
  // removed here: those routes belong to Phase O/P's separate refund-
  // adapter work, deliberately not ported into this clean worktree (they
  // never call PaymentRiskService/ChargebackCaseService). The RBAC
  // property they tested for those two routes specifically is out of
  // scope for this release along with the routes themselves; every other
  // RBAC assertion in this file covers real, shipped endpoints.

  it('GM_DENIED_RISK_CASES: GM cannot view or manage risk cases', async () => {
    const list = await (await request()).get('/api/admin/finance/risk-cases').set('Authorization', `Bearer ${gmToken}`)
    expect(list.status).toBe(403)
    const action = await (await request())
      .post('/api/admin/finance/risk-cases/00000000-0000-0000-0000-000000000000/actions')
      .set('Authorization', `Bearer ${gmToken}`)
      .send({ action: 'ACCOUNT_RESTRICTION', reason: 'tentativa GM' })
    expect(action.status).toBe(403)
  })

  it('GM_DENIED_CHARGEBACK_CASES: GM cannot view or manage chargeback cases', async () => {
    const list = await (await request()).get('/api/admin/finance/chargeback-cases').set('Authorization', `Bearer ${gmToken}`)
    expect(list.status).toBe(403)
  })

  it('GM_DENIED_RECHARGE_PACKAGE_ADMIN: GM cannot create/edit/delete a recharge package', async () => {
    const create = await (await request())
      .post('/api/admin/recharge/packages')
      .set('Authorization', `Bearer ${gmToken}`)
      .send({ key: `gm-denied-${suffix}`, currency: 'WCOIN', amount: 10, bonus: 0, price: '10,00', active: true })
    expect(create.status).toBe(403)
  })

  it('GM_DENIED_RECONCILIATION: GM cannot view or trigger reconciliation', async () => {
    const report = await (await request()).get('/api/admin/finance/reconciliation').set('Authorization', `Bearer ${gmToken}`)
    expect(report.status).toBe(403)
    const poll = await (await request()).post('/api/admin/finance/reconciliation/provider-poll').set('Authorization', `Bearer ${gmToken}`)
    expect(poll.status).toBe(403)
  })

  it('GM_DENIED_STORE_ADMIN: GM cannot operate store orders/deliveries', async () => {
    const orderAction = await (await request())
      .post('/api/admin/store/orders/00000000-0000-0000-0000-000000000000/action')
      .set('Authorization', `Bearer ${gmToken}`)
      .send({ action: 'mark-paid' })
    expect(orderAction.status).toBe(403)
  })
})
