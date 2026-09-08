import { execSync } from 'node:child_process'
import { generateSecret, generateSync } from 'otplib'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// PHASE P (2026-08-31), Part 2 -- antifraud foundation. These tests exercise
// the REAL wiring (transitionRechargeStatus -> fireRiskHooks ->
// PaymentRiskService), not the detector functions in isolation, via the
// same admin HTTP endpoints already used elsewhere in this project's
// e2e suite. Default thresholds (NEW_ACCOUNT_AGE_HOURS=24,
// HIGH_VALUE_BRL_THRESHOLD=200, MULTIPLE_FAILED_PAYMENTS_THRESHOLD=3,
// RAPID_PURCHASE_COUNT_THRESHOLD=3) are used as-is -- a freshly registered
// test account is always "new," so no env override is needed.
const CONTAINER = 'bloodmoon-e2e-payment-risk'

describe('Payment antifraud foundation -- Phase P', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService
  let twoFactorService: import('../src/modules/auth/two-factor.service').TwoFactorService
  let paymentReconciliation: import('../src/modules/commerce/payment-reconciliation.service').PaymentReconciliationService
  const suffix = Date.now().toString(36)
  const totpSecrets = new Map<string, string>()

  const plainAdmin = { name: 'Risk RBAC Admin', username: `pr_a_${suffix}`, password: 'risk-rbac-admin-pw-1', personalId: '10120230341', email: `pr-a-${suffix}@example.invalid` }
  const superAdministrator = { name: 'Risk RBAC Super Admin', username: `pr_s_${suffix}`, password: 'risk-rbac-super-pw-1', personalId: '10220230342', email: `pr-s-${suffix}@example.invalid` }
  let adminToken = ''
  let superAdminToken = ''

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET = 'e2e-payment-risk-access-secret'
    process.env.JWT_REFRESH_SECRET = 'e2e-payment-risk-refresh-secret'
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-payment-risk-two-factor-key-32char'
    process.env.AUTH_CAPTCHA_TEST_BYPASS = '1'
    process.env.AUTH_MAIL_TEST_BYPASS = '1'
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { TwoFactorService } = await import('../src/modules/auth/two-factor.service')
    const { PaymentReconciliationService } = await import('../src/modules/commerce/payment-reconciliation.service')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
    prisma = app.get(PrismaService)
    twoFactorService = app.get(TwoFactorService)
    paymentReconciliation = app.get(PaymentReconciliationService)
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

  it('bootstraps a plain ADMIN (no delegated permissions) and a SUPER_ADMIN', async () => {
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

  // ---- Fixture helpers ----

  let counter = 0
  const makeAccount = async (label: string) => {
    counter += 1
    const username = `${label}_${suffix}_${counter}`.slice(0, 64)
    const account = await prisma.account.create({
      data: {
        username,
        name: `Risk ${label}`,
        email: `${username}@example.invalid`,
        passwordHash: 'not-used-in-this-suite',
        role: 'PLAYER',
        status: 'ACTIVE',
        accountPhase: 'OPEN_BETA'
      }
    })
    return account
  }

  const makePendingRecharge = async (accountId: string, priceBrl: string) => {
    counter += 1
    const pkg = await prisma.rechargePackage.create({
      data: { key: `risk-pkg-${suffix}-${counter}`, currency: 'WCOIN', amount: 1, bonus: 0, price: priceBrl, active: true }
    })
    return prisma.rechargeIntent.create({
      data: { accountId, packageId: pkg.id, currency: 'WCOIN', amount: 1, bonus: 0, price: priceBrl, status: 'PENDING' }
    })
  }

  const setStatus = (id: string, status: string, reason?: string) =>
    (async () => request())().then((req) =>
      req
        .patch(`/api/admin/finance/recharges/${id}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status, ...(reason ? { reason } : {}) })
    )

  // ---- Detector wiring ----

  it('RISK_NEW_ACCOUNT_HIGH_VALUE_PURCHASE: a freshly created account paying above the threshold opens a case', async () => {
    const account = await makeAccount('newhv')
    const recharge = await makePendingRecharge(account.id, '250,00')

    const res = await setStatus(recharge.id, 'PAID')
    expect(res.status).toBe(200)

    const signal = await prisma.paymentRiskSignal.findFirst({ where: { accountId: account.id, signalType: 'NEW_ACCOUNT_HIGH_VALUE_PURCHASE' } })
    expect(signal).not.toBeNull()
    expect(signal!.reason.length).toBeGreaterThan(0)

    const riskCase = await prisma.paymentRiskCase.findFirst({ where: { accountId: account.id } })
    expect(riskCase).not.toBeNull()
    expect(riskCase!.status).toBe('OPEN')
    expect(riskCase!.highestSeverity).toBe('MEDIUM')
  })

  it('RISK_RAPID_PURCHASE_SEQUENCE: 3 approved recharges within the window attach to the SAME case, not a new one', async () => {
    const account = await makeAccount('rapid')
    const openedCaseIds = new Set<string>()

    for (let i = 0; i < 3; i++) {
      const recharge = await makePendingRecharge(account.id, '10,00')
      const res = await setStatus(recharge.id, 'PAID')
      expect(res.status).toBe(200)
    }

    const signal = await prisma.paymentRiskSignal.findFirst({ where: { accountId: account.id, signalType: 'RAPID_PURCHASE_SEQUENCE' } })
    expect(signal).not.toBeNull()
    expect((signal!.evidence as { count: number }).count).toBeGreaterThanOrEqual(3)

    const cases = await prisma.paymentRiskCase.findMany({ where: { accountId: account.id } })
    for (const c of cases) openedCaseIds.add(c.id)
    expect(openedCaseIds.size).toBe(1)
  })

  it('RISK_MULTIPLE_FAILED_PAYMENTS: 3 failed recharges open a case with a MULTIPLE_FAILED_PAYMENTS signal', async () => {
    const account = await makeAccount('failed')
    for (let i = 0; i < 3; i++) {
      const recharge = await makePendingRecharge(account.id, '10,00')
      const res = await setStatus(recharge.id, 'FAILED', 'e2e forced failure')
      expect(res.status).toBe(200)
    }

    const signal = await prisma.paymentRiskSignal.findFirst({ where: { accountId: account.id, signalType: 'MULTIPLE_FAILED_PAYMENTS' } })
    expect(signal).not.toBeNull()
  })

  it('RISK_PROVIDER_REVIEW_STATE: a non-chargeback MANUAL_REVIEW transition signals PROVIDER_REVIEW_STATE, not REPEATED_CHARGEBACK', async () => {
    const account = await makeAccount('review')
    const recharge = await makePendingRecharge(account.id, '10,00')
    const res = await setStatus(recharge.id, 'MANUAL_REVIEW', 'amount_mismatch')
    expect(res.status).toBe(200)

    const providerSignal = await prisma.paymentRiskSignal.findFirst({ where: { accountId: account.id, signalType: 'PROVIDER_REVIEW_STATE' } })
    expect(providerSignal).not.toBeNull()
    const chargebackSignal = await prisma.paymentRiskSignal.findFirst({ where: { accountId: account.id, signalType: 'REPEATED_CHARGEBACK' } })
    expect(chargebackSignal).toBeNull()
    const chargebackCase = await prisma.chargebackCase.findFirst({ where: { accountId: account.id } })
    expect(chargebackCase).toBeNull()
  })

  it('RISK_DELIVERY_ANOMALY: a PAID recharge without a ledger credit is flagged by reconciliation as a risk signal', async () => {
    const account = await makeAccount('anomaly')
    counter += 1
    const pkg = await prisma.rechargePackage.create({
      data: { key: `risk-anomaly-pkg-${suffix}-${counter}`, currency: 'WCOIN', amount: 1, bonus: 0, price: '10,00', active: true }
    })
    // Bypasses the service entirely -- a PAID row with no matching
    // WC_PURCHASE_CREDIT ledger row, the exact anomaly
    // PaymentReconciliationService.findAnomalies() looks for.
    const recharge = await prisma.rechargeIntent.create({
      data: { accountId: account.id, packageId: pkg.id, currency: 'WCOIN', amount: 1, bonus: 0, price: '10,00', status: 'PAID', approvedAt: new Date() }
    })

    await paymentReconciliation.runOnce()

    const signal = await prisma.paymentRiskSignal.findFirst({ where: { accountId: account.id, signalType: 'DELIVERY_ANOMALY', sourceId: recharge.id } })
    expect(signal).not.toBeNull()
  })

  // ---- RBAC ----

  it('RISK_RBAC: a plain ADMIN (no delegation) cannot view or manage risk cases; SUPER_ADMIN can', async () => {
    const anyCase = await prisma.paymentRiskCase.findFirstOrThrow()

    const deniedList = await (await request()).get('/api/admin/finance/risk-cases').set('Authorization', `Bearer ${adminToken}`)
    expect(deniedList.status).toBe(403)

    const deniedAction = await (await request())
      .post(`/api/admin/finance/risk-cases/${anyCase.id}/actions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'MANUAL_REVIEW', reason: 'tentativa sem permissao' })
    expect(deniedAction.status).toBe(403)

    const allowedList = await (await request()).get('/api/admin/finance/risk-cases').set('Authorization', `Bearer ${superAdminToken}`)
    expect(allowedList.status).toBe(200)
    expect(Array.isArray(allowedList.body.data)).toBe(true)
  })

  // ---- Case lifecycle: action, enforcement, lift, resolve ----

  it('RISK_PAYMENT_RESTRICTION: applying the action blocks new checkout for that account; lifting it clears the restriction', async () => {
    process.env.REAL_MONEY_PAYMENTS_ENABLED = 'true'

    const restrictedPlayer = { name: 'Risk Restricted Player', username: `pr_rp_${suffix}`, password: 'risk-restricted-player-pw-1', personalId: '10320230343', email: `pr-rp-${suffix}@example.invalid` }
    const registerRes = await (await request()).post('/api/auth/register').send(restrictedPlayer)
    expect(registerRes.status).toBe(201)
    const playerLogin = await (await request()).post('/api/auth/login').send({ username: restrictedPlayer.username, password: restrictedPlayer.password })
    expect(playerLogin.status).toBe(201)
    const playerToken = playerLogin.body.accessToken as string
    const account = await prisma.account.findUniqueOrThrow({ where: { username: restrictedPlayer.username } })

    const openingRecharge = await makePendingRecharge(account.id, '250,00')
    const openRes = await setStatus(openingRecharge.id, 'PAID')
    expect(openRes.status).toBe(200)

    const riskCase = await prisma.paymentRiskCase.findFirstOrThrow({ where: { accountId: account.id } })

    const applyRes = await (await request())
      .post(`/api/admin/finance/risk-cases/${riskCase.id}/actions`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ action: 'PAYMENT_RESTRICTION', reason: 'e2e verificando bloqueio de pagamento' })
    expect(applyRes.status).toBe(201)
    const actionId = applyRes.body.id as string

    const blockedRecharge = await makePendingRecharge(account.id, '10,00')
    const checkoutBlocked = await (await request())
      .post(`/api/recharge/intents/${blockedRecharge.id}/checkout`)
      .set('Authorization', `Bearer ${playerToken}`)
    expect(checkoutBlocked.status).toBe(403)

    const liftRes = await (await request())
      .post(`/api/admin/finance/risk-cases/actions/${actionId}/lift`)
      .set('Authorization', `Bearer ${superAdminToken}`)
    expect(liftRes.status).toBe(201)

    const lifted = await prisma.paymentRiskCaseAction.findUniqueOrThrow({ where: { id: actionId } })
    expect(lifted.liftedAt).not.toBeNull()

    // With the restriction lifted, assertNoActivePaymentRestriction()
    // itself no longer throws -- confirmed directly rather than driving a
    // full Mercado Pago checkout (which would need real provider mocking
    // unrelated to what this test is verifying).
    const { PaymentRiskService } = await import('../src/modules/commerce/payment-risk.service')
    await expect(app.get(PaymentRiskService).assertNoActivePaymentRestriction(account.id)).resolves.toBeUndefined()
  })

  it('RISK_CASE_RESOLVE: an empty resolution is rejected; a real resolution updates status and resolvedAt', async () => {
    const riskCase = await prisma.paymentRiskCase.findFirstOrThrow({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } })

    const empty = await (await request())
      .post(`/api/admin/finance/risk-cases/${riskCase.id}/resolve`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'CLEARED', resolution: '' })
    expect(empty.status).toBe(400)

    const resolved = await (await request())
      .post(`/api/admin/finance/risk-cases/${riskCase.id}/resolve`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'CLEARED', resolution: 'e2e revisado, falso positivo' })
    expect(resolved.status).toBe(201)
    expect(resolved.body.status).toBe('CLEARED')
    expect(resolved.body.resolvedAt).not.toBeNull()
  })

  // PHASE Q (2026-08-31), Part 13 -- a fraud hold on the PLAYER-initiated
  // side must never deadlock the ADMIN-initiated financial-recovery side.
  // refundRecharge()/attemptProviderRefund() are admin actions performed
  // ON BEHALF OF the account, not actions the restricted account itself
  // initiates -- by design, neither was ever gated behind
  // assertNoActiveAccountRestriction() (only createRechargeCheckout,
  // createPurchaseIntent, VipService.purchase, and WalletTransferService
  // were). This test proves that design holds, not just documents it.
  // PHASE AC (2026-09-05): isolated for the Payment Risk / Chargeback
  // release -- the original version of this test exercised the real
  // Mercado Pago refund adapter's admin endpoint
  // (POST admin/finance/recharges/:id/refund), which is Phase O/P's
  // separate refund-adapter work and was deliberately not ported into
  // this clean worktree (it never calls PaymentRiskService or
  // ChargebackCaseService -- confirmed by code audit during isolation).
  // The underlying invariant this test protects -- ACCOUNT_RESTRICTION
  // gates only PLAYER-initiated commercial actions, never an
  // admin-initiated one -- is still real and still shipped in this
  // release, so it's re-verified here against updateRechargeStatus
  // (the ordinary admin status-transition endpoint, unchanged, present
  // in this release) instead.
  it('RESTRICTED_ADMIN_STATUS_UPDATE: an ACCOUNT_RESTRICTION on the player does not block a SUPER_ADMIN from updating their recharge status', async () => {
    const account = await makeAccount('adminupdateunderrestriction')
    const recharge = await makePendingRecharge(account.id, '30,00')

    // Open a case + apply ACCOUNT_RESTRICTION to this same account.
    const { PaymentRiskService } = await import('../src/modules/commerce/payment-risk.service')
    const riskService = app.get(PaymentRiskService)
    await riskService.recordSignal({ accountId: account.id, signalType: 'MULTIPLE_FAILED_PAYMENTS', severity: 'MEDIUM', reason: 'e2e fixture', evidence: {} })
    const riskCase = await prisma.paymentRiskCase.findFirstOrThrow({ where: { accountId: account.id, status: { in: ['OPEN', 'UNDER_REVIEW'] } } })
    const applyRes = await (await request())
      .post(`/api/admin/finance/risk-cases/${riskCase.id}/actions`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ action: 'ACCOUNT_RESTRICTION', reason: 'e2e verificando que a acao admin continua funcionando' })
    expect(applyRes.status).toBe(201)

    // The admin status update must still succeed against this restricted account.
    const paidRes = await setStatus(recharge.id, 'PAID')
    expect(paidRes.status).toBe(200)

    const updated = await prisma.rechargeIntent.findUniqueOrThrow({ where: { id: recharge.id } })
    expect(updated.status).toBe('PAID')
  })
})
