import { execSync } from 'node:child_process'
import { generateSecret, generateSync } from 'otplib'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// PHASE P (2026-08-31), Part 3 -- formal ChargebackCase model, replacing
// the previously-informal MANUAL_REVIEW + "charged_back:" prefix
// convention (still the real trigger -- mercadopago.status-map.ts). These
// tests drive the exact wiring (transitionRechargeStatus -> fireRiskHooks
// -> ChargebackCaseService.openCaseForRecharge) via the admin
// status-update endpoint, the same way payment-risk.e2e-spec.ts drives
// PaymentRiskService -- a `reason` beginning with "charged_back:" is what
// a real Mercado Pago webhook produces (see mercadopago.status-map.ts's
// own mapping), so triggering it via the admin endpoint with that exact
// prefix exercises the identical downstream code path a real webhook
// would, without needing to re-sign a fake webhook payload for a concern
// this file isn't testing (webhook signing is already covered by
// recharge-payments.e2e-spec.ts).
const CONTAINER = 'bloodmoon-e2e-chargeback-case'

describe('Chargeback case model -- Phase P', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService
  let twoFactorService: import('../src/modules/auth/two-factor.service').TwoFactorService
  let walletLedger: import('../src/modules/wallet/wallet-ledger.service').WalletLedgerService
  const suffix = Date.now().toString(36)
  const totpSecrets = new Map<string, string>()

  const plainAdmin = { name: 'Chargeback RBAC Admin', username: `cb_a_${suffix}`, password: 'chargeback-rbac-admin-pw-1', personalId: '20120230341', email: `cb-a-${suffix}@example.invalid` }
  const superAdministrator = { name: 'Chargeback RBAC Super Admin', username: `cb_s_${suffix}`, password: 'chargeback-rbac-super-pw-1', personalId: '20220230342', email: `cb-s-${suffix}@example.invalid` }
  let adminToken = ''
  let superAdminToken = ''

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET = 'e2e-chargeback-case-access-secret'
    process.env.JWT_REFRESH_SECRET = 'e2e-chargeback-case-refresh-secret'
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-chargeback-case-two-factor-32char'
    process.env.AUTH_CAPTCHA_TEST_BYPASS = '1'
    process.env.AUTH_MAIL_TEST_BYPASS = '1'
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { TwoFactorService } = await import('../src/modules/auth/two-factor.service')
    const { WalletLedgerService } = await import('../src/modules/wallet/wallet-ledger.service')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
    prisma = app.get(PrismaService)
    twoFactorService = app.get(TwoFactorService)
    walletLedger = app.get(WalletLedgerService)
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

  it('bootstraps a plain ADMIN (no delegation) and a SUPER_ADMIN', async () => {
    const req = await request()
    for (const account of [plainAdmin, superAdministrator]) {
      const result = await req.post('/api/auth/register').send(account)
      expect(result.status).toBe(201)
    }
    await prisma.account.update({ where: { username: plainAdmin.username }, data: { role: 'ADMIN' } })
    await prisma.account.update({ where: { username: superAdministrator.username }, data: { role: 'SUPER_ADMIN' } })
    await enableRealTwoFactor(plainAdmin.username)
    await enableRealTwoFactor(superAdministrator.username)
    adminToken = await login(plainAdmin.username, plainAdmin.password)
    superAdminToken = await login(superAdministrator.username, superAdministrator.password)
  })

  let counter = 0
  const makeAccount = async (label: string) => {
    counter += 1
    const username = `${label}_${suffix}_${counter}`.slice(0, 64)
    return prisma.account.create({
      data: {
        username,
        name: `Chargeback ${label}`,
        email: `${username}@example.invalid`,
        passwordHash: 'not-used-in-this-suite',
        role: 'PLAYER',
        status: 'ACTIVE',
        accountPhase: 'OPEN_BETA'
      }
    })
  }

  // Creates a PAID RechargeIntent + matching WC_PURCHASE_CREDIT ledger
  // row directly -- the state a real payment leaves behind, without
  // driving the whole checkout+webhook flow (already covered by
  // recharge-payments.e2e-spec.ts).
  const makePaidRecharge = async (accountId: string, amount: number, priceBrl: string) => {
    counter += 1
    const pkg = await prisma.rechargePackage.create({
      data: { key: `cb-pkg-${suffix}-${counter}`, currency: 'WCOIN', amount, bonus: 0, price: priceBrl, active: true }
    })
    const recharge = await prisma.rechargeIntent.create({
      data: { accountId, packageId: pkg.id, currency: 'WCOIN', amount, bonus: 0, price: priceBrl, status: 'PAID', approvedAt: new Date() }
    })
    await prisma.$transaction((tx) =>
      walletLedger.credit(tx, accountId, 'WCOIN', amount, {
        idempotencyKey: `recharge-credit:${recharge.id}`,
        type: 'WC_PURCHASE_CREDIT',
        sourceType: 'RechargeIntent',
        sourceId: recharge.id,
        paymentProvenanceRef: recharge.id
      })
    )
    return recharge
  }

  const markChargedBack = (id: string) =>
    (async () => request())().then((req) =>
      req
        .patch(`/api/admin/finance/recharges/${id}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'MANUAL_REVIEW', reason: 'charged_back:e2e_test_dispute' })
    )

  it('CHARGEBACK_CASE_OPENED: a charged_back transition opens a formal case with a real balance snapshot and dispersal trace', async () => {
    const account = await makeAccount('origin')
    const recharge = await makePaidRecharge(account.id, 100, '100,00')

    const res = await markChargedBack(recharge.id)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('MANUAL_REVIEW')

    const chargebackCase = await prisma.chargebackCase.findUnique({ where: { rechargeIntentId: recharge.id } })
    expect(chargebackCase).not.toBeNull()
    expect(chargebackCase!.accountId).toBe(account.id)
    expect(chargebackCase!.originalAmountCredited).toBe(100)
    expect(chargebackCase!.accountBalanceAtCaseOpen).toBe(100)
    expect(chargebackCase!.status).toBe('OPEN')
    expect(chargebackCase!.providerChargebackReason).toContain('charged_back:')
    const trace = chargebackCase!.dispersalTraceSnapshot as { originAccountId: string; involvedAccountIds: string[] }
    expect(trace.originAccountId).toBe(account.id)
    expect(trace.involvedAccountIds).toContain(account.id)

    // A REPEATED_CHARGEBACK risk signal (first occurrence -> MEDIUM) is
    // also recorded -- the antifraud foundation and the case model are
    // wired together, not two independent systems.
    const signal = await prisma.paymentRiskSignal.findFirst({ where: { accountId: account.id, signalType: 'REPEATED_CHARGEBACK' } })
    expect(signal).not.toBeNull()
    expect(signal!.severity).toBe('MEDIUM')
  })

  it('CHARGEBACK_CASE_IDEMPOTENT: redelivering the same charged_back transition never creates a second case', async () => {
    const account = await makeAccount('idempotent')
    const recharge = await makePaidRecharge(account.id, 50, '50,00')
    await markChargedBack(recharge.id)

    const firstCase = await prisma.chargebackCase.findUniqueOrThrow({ where: { rechargeIntentId: recharge.id } })

    // MANUAL_REVIEW -> MANUAL_REVIEW is a same-status no-op at the
    // RechargeIntent level (transitionRechargeStatus returns early), so
    // openCaseForRecharge is not re-invoked by the transition machinery
    // itself -- calling it directly proves the SERVICE's own idempotency
    // (the real protection a duplicate webhook delivery would rely on).
    const { ChargebackCaseService } = await import('../src/modules/commerce/chargeback-case.service')
    const service = app.get(ChargebackCaseService)
    const second = await service.openCaseForRecharge(recharge.id, { providerChargebackReason: 'charged_back:redelivered' })
    expect(second.id).toBe(firstCase.id)

    const allCases = await prisma.chargebackCase.findMany({ where: { rechargeIntentId: recharge.id } })
    expect(allCases.length).toBe(1)
  })

  it('CHARGEBACK_REPEATED_SEVERITY: a second chargeback from the same account escalates the risk signal to HIGH', async () => {
    const account = await makeAccount('repeat')
    const first = await makePaidRecharge(account.id, 20, '20,00')
    await markChargedBack(first.id)

    const second = await makePaidRecharge(account.id, 20, '20,00')
    await markChargedBack(second.id)

    const signals = await prisma.paymentRiskSignal.findMany({ where: { accountId: account.id, signalType: 'REPEATED_CHARGEBACK' }, orderBy: { detectedAt: 'asc' } })
    expect(signals.length).toBe(2)
    expect(signals[0].severity).toBe('MEDIUM')
    expect(signals[1].severity).toBe('HIGH')
  })

  it('CHARGEBACK_RESPONSIBILITY: a downstream transfer recipient is traceable but never auto-restricted', async () => {
    const origin = await makeAccount('disperse-origin')
    const recipient = await makeAccount('disperse-recipient')
    const recharge = await makePaidRecharge(origin.id, 40, '40,00')

    await new Promise((resolve) => setTimeout(resolve, 5))
    await prisma.$transaction((tx) =>
      walletLedger.settleTaxedCredit(tx, recipient.id, origin.id, 'WCOIN', 10, {
        idempotencyKey: `cb-disperse-${suffix}-${recharge.id}`,
        type: 'PLAYER_DIRECT_TRANSFER',
        sourceType: 'RechargeIntentTestFixture',
        sourceId: recharge.id
      })
    )

    await markChargedBack(recharge.id)

    const chargebackCase = await prisma.chargebackCase.findUniqueOrThrow({ where: { rechargeIntentId: recharge.id } })
    const trace = chargebackCase.dispersalTraceSnapshot as { involvedAccountIds: string[] }
    expect(trace.involvedAccountIds).toContain(recipient.id)

    // No restriction, no signal, nothing at all was recorded AGAINST the
    // downstream recipient -- only the trace exists for a human to review.
    const recipientRestriction = await prisma.paymentRiskCaseAction.findFirst({
      where: { action: { in: ['PAYMENT_RESTRICTION', 'TRANSFER_RESTRICTION', 'ACCOUNT_RESTRICTION'] }, riskCase: { accountId: recipient.id } }
    })
    expect(recipientRestriction).toBeNull()
    const recipientCase = await prisma.paymentRiskCase.findFirst({ where: { accountId: recipient.id } })
    expect(recipientCase).toBeNull()
  })

  it('CHARGEBACK_RBAC: a plain ADMIN cannot view or manage chargeback cases; SUPER_ADMIN can', async () => {
    const anyCase = await prisma.chargebackCase.findFirstOrThrow()

    const deniedList = await (await request()).get('/api/admin/finance/chargeback-cases').set('Authorization', `Bearer ${adminToken}`)
    expect(deniedList.status).toBe(403)

    const deniedResolve = await (await request())
      .post(`/api/admin/finance/chargeback-cases/${anyCase.id}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CLEARED', resolution: 'tentativa sem permissao' })
    expect(deniedResolve.status).toBe(403)

    const allowedList = await (await request()).get('/api/admin/finance/chargeback-cases').set('Authorization', `Bearer ${superAdminToken}`)
    expect(allowedList.status).toBe(200)
    expect(Array.isArray(allowedList.body.data)).toBe(true)
  })

  it('CHARGEBACK_RESOLVE: an empty resolution is rejected; a real resolution updates status', async () => {
    const openCase = await prisma.chargebackCase.findFirstOrThrow({ where: { status: 'OPEN' } })

    const empty = await (await request())
      .post(`/api/admin/finance/chargeback-cases/${openCase.id}/resolve`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'CONFIRMED_FRAUD', resolution: '' })
    expect(empty.status).toBe(400)

    const resolved = await (await request())
      .post(`/api/admin/finance/chargeback-cases/${openCase.id}/resolve`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'CONFIRMED_FRAUD', resolution: 'e2e confirmado apos revisao' })
    expect(resolved.status).toBe(201)
    expect(resolved.body.status).toBe('CONFIRMED_FRAUD')

    const alreadyClosed = await prisma.chargebackCase.update({ where: { id: openCase.id }, data: { status: 'CLOSED' } })
    const secondResolve = await (await request())
      .post(`/api/admin/finance/chargeback-cases/${alreadyClosed.id}/resolve`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'CLEARED', resolution: 'tentando reabrir um caso encerrado' })
    expect(secondResolve.status).toBe(400)
  })
})
