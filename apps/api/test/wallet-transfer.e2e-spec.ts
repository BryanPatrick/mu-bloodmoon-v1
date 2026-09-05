import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// PHASE Q (2026-08-31), Part 4/6/7 -- direct player-to-player WC
// transfer, built for the first time this phase (no prior feature
// existed -- see wallet-transfer.service.ts's own header comment), with
// TRANSFER_RESTRICTION/ACCOUNT_RESTRICTION enforcement and the four
// WC-transfer antifraud signals wired against real ledger data.
const CONTAINER = 'bloodmoon-e2e-wallet-transfer'

describe('Direct WC transfer -- Phase Q', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService
  let walletLedger: import('../src/modules/wallet/wallet-ledger.service').WalletLedgerService
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET ||= 'e2e-wallet-transfer-access-secret'
    process.env.JWT_REFRESH_SECRET ||= 'e2e-wallet-transfer-refresh-secret'
    process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-wallet-transfer-two-factor-32ch'
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { WalletLedgerService } = await import('../src/modules/wallet/wallet-ledger.service')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
    prisma = app.get(PrismaService)
    walletLedger = app.get(WalletLedgerService)
  }, 120000)

  afterAll(async () => app?.close())

  jest.setTimeout(30000)

  const request = () => import('supertest').then((module) => module.default(httpServer))

  let counter = 0
  const makePlayerWithBalance = async (label: string, balance: number) => {
    counter += 1
    const account = await prisma.account.create({
      data: {
        username: `wt_${label}_${suffix}_${counter}`.slice(0, 64),
        name: `Transfer ${label} ${counter}`,
        email: `wt-${label}-${suffix}-${counter}@example.invalid`,
        passwordHash: 'not-used-in-this-suite',
        role: 'PLAYER',
        status: 'ACTIVE',
        currencies: { create: [{ currency: 'WCOIN', balance }] }
      }
    })
    return account
  }

  const makeSuperAdmin = async () => {
    counter += 1
    return prisma.account.create({
      data: {
        username: `wt_super_${suffix}_${counter}`.slice(0, 64),
        name: `Transfer Super ${counter}`,
        email: `wt-super-${suffix}-${counter}@example.invalid`,
        passwordHash: 'not-used-in-this-suite',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        // RolesGuard blocks any non-PLAYER role without 2FA (regardless
        // of how the token was minted) -- the flag alone is enough here,
        // this suite isn't exercising the real TOTP login flow.
        twoFactorEnabled: true
      }
    })
  }

  async function issueToken(accountId: string): Promise<string> {
    const { JwtService } = await import('@nestjs/jwt')
    const jwt = app.get(JwtService)
    const session = await prisma.accountSession.create({
      data: { accountId, expiresAt: new Date(Date.now() + 3_600_000) }
    })
    return jwt.signAsync(
      { sub: accountId, sessionVersion: 0, sid: session.id },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '5m' }
    )
  }

  it('WC_TRANSFER_MIN_ENFORCED: below the configured minimum is rejected', async () => {
    const sender = await makePlayerWithBalance('min', 1000)
    const recipient = await makePlayerWithBalance('minrecv', 0)
    const token = await issueToken(sender.id)

    const res = await (await request())
      .post('/api/wallet/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientUsername: recipient.username, amount: 5 })
    expect(res.status).toBe(400)
  })

  // PHASE Q DECISION CLOSURE (2026-08-31), Part 8 -- Decision 1's own
  // exact boundary (20 WC, finalized -- see docs/decisions/0022, OQ-002
  // closed). WC_TRANSFER_MIN_ENFORCED above already proves "below
  // minimum -> rejected" generically (at 5 WC); these two prove the
  // EXACT boundary itself: 19 rejected, 20 allowed, off-by-one either way.
  it('DIRECT_TRANSFER_19_WC_REJECTED: one WC under the finalized 20 WC minimum is rejected', async () => {
    const sender = await makePlayerWithBalance('boundary19', 1000)
    const recipient = await makePlayerWithBalance('boundary19recv', 0)
    const token = await issueToken(sender.id)

    const res = await (await request())
      .post('/api/wallet/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientUsername: recipient.username, amount: 19 })
    expect(res.status).toBe(400)
  })

  it('DIRECT_TRANSFER_20_WC_ALLOWED: exactly the finalized 20 WC minimum succeeds', async () => {
    const sender = await makePlayerWithBalance('boundary20', 1000)
    const recipient = await makePlayerWithBalance('boundary20recv', 0)
    const token = await issueToken(sender.id)

    const res = await (await request())
      .post('/api/wallet/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientUsername: recipient.username, amount: 20 })
    expect(res.status).toBe(201)
    expect(res.body.transferred).toBe(20)
  })

  // PHASE Q DECISION CLOSURE (2026-08-31), Part 5/8 -- the exact numeric
  // example Bryan's own instruction gave ("Transferir: 100 WC / Taxa
  // economica: 10 WC / Destinatario recebe: 90 WC"). 100 * 10% = 10 is a
  // whole number, so this is exact on a single transaction with no
  // accumulator carry-over involved -- proves both the displayed
  // player-UI estimate and the real settled amount match this exactly.
  it('DIRECT_TRANSFER_100_WC_RECEIVER_GETS_90: sender debited 100, recipient receives exactly 90 (10% sink)', async () => {
    const sender = await makePlayerWithBalance('exact100', 1000)
    const recipient = await makePlayerWithBalance('exact100recv', 0)
    const token = await issueToken(sender.id)

    const res = await (await request())
      .post('/api/wallet/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientUsername: recipient.username, amount: 100 })
    expect(res.status).toBe(201)
    expect(res.body.transferred).toBe(100)
    expect(res.body.feeCollected).toBe(10)
    expect(res.body.netAmount).toBe(90)

    const senderBalance = await walletLedger.getBalance(sender.id, 'WCOIN')
    expect(senderBalance).toBe(900)
    const recipientBalance = await walletLedger.getBalance(recipient.id, 'WCOIN')
    expect(recipientBalance).toBe(90)
  })

  it('WC_TRANSFER_SELF_REJECTED: cannot transfer to your own account', async () => {
    const sender = await makePlayerWithBalance('self', 1000)
    const token = await issueToken(sender.id)

    const res = await (await request())
      .post('/api/wallet/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientUsername: sender.username, amount: 50 })
    expect(res.status).toBe(400)
  })

  it('WC_TRANSFER_SUCCESS: a valid transfer debits the sender and credits the recipient (taxed)', async () => {
    const sender = await makePlayerWithBalance('ok', 1000)
    const recipient = await makePlayerWithBalance('okrecv', 0)
    const token = await issueToken(sender.id)

    const res = await (await request())
      .post('/api/wallet/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientUsername: recipient.username, amount: 100 })
    expect(res.status).toBe(201)
    expect(res.body.transferred).toBe(100)

    const senderBalance = await walletLedger.getBalance(sender.id, 'WCOIN')
    expect(senderBalance).toBe(900)
    const recipientBalance = await walletLedger.getBalance(recipient.id, 'WCOIN')
    expect(recipientBalance).toBeLessThanOrEqual(100)
    expect(recipientBalance).toBeGreaterThan(0)

    const audit = await prisma.auditEvent.findFirst({ where: { action: 'wallet.transfer.direct', targetId: recipient.id } })
    expect(audit).not.toBeNull()
  })

  it('TRANSFER_RESTRICTION_ENFORCED: an applied restriction blocks transfer; lifting it restores access', async () => {
    const sender = await makePlayerWithBalance('restrict', 1000)
    const recipient = await makePlayerWithBalance('restrictrecv', 0)
    const token = await issueToken(sender.id)
    const superAdmin = await makeSuperAdmin()
    const superToken = await issueToken(superAdmin.id)

    // Open a case for the sender via a real signal (reuses PaymentRiskService directly).
    const { PaymentRiskService } = await import('../src/modules/commerce/payment-risk.service')
    const riskService = app.get(PaymentRiskService)
    await riskService.recordSignal({ accountId: sender.id, signalType: 'RAPID_PURCHASE_SEQUENCE', severity: 'LOW', reason: 'fixture', evidence: {} })
    const riskCase = await prisma.paymentRiskCase.findFirstOrThrow({ where: { accountId: sender.id } })

    const applyRes = await (await request())
      .post(`/api/admin/finance/risk-cases/${riskCase.id}/actions`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ action: 'TRANSFER_RESTRICTION', reason: 'e2e verificando bloqueio de transferencia' })
    expect(applyRes.status).toBe(201)
    const actionId = applyRes.body.id as string

    const blocked = await (await request())
      .post('/api/wallet/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientUsername: recipient.username, amount: 50 })
    expect(blocked.status).toBe(403)

    const liftRes = await (await request())
      .post(`/api/admin/finance/risk-cases/actions/${actionId}/lift`)
      .set('Authorization', `Bearer ${superToken}`)
    expect(liftRes.status).toBe(201)

    const allowed = await (await request())
      .post('/api/wallet/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientUsername: recipient.username, amount: 50 })
    expect(allowed.status).toBe(201)
  })

  // PHASE AC (2026-09-05): isolated for the Payment Risk / Chargeback
  // release -- the VIP-purchase assertion from the original version of
  // this test (vipService.purchase() rejecting under ACCOUNT_RESTRICTION)
  // is intentionally removed here. VIP is out of scope for this release
  // per its hard boundary ("DO NOT ... change VIP"), and vip.service.ts's
  // own restriction check was never ported into this clean worktree --
  // that wiring belongs to whichever release VIP itself is isolated
  // into, not this one. The store-purchase and transfer assertions below
  // are both real, shipped enforcement in this release.
  it('ACCOUNT_RESTRICTION_BLOCKS_TRANSFER_AND_PURCHASE: a commercial hold blocks transfer and store purchase', async () => {
    const sender = await makePlayerWithBalance('acctrestrict', 1000)
    const recipient = await makePlayerWithBalance('acctrestrictrecv', 0)
    const token = await issueToken(sender.id)
    const superAdmin = await makeSuperAdmin()
    const superToken = await issueToken(superAdmin.id)

    const { PaymentRiskService } = await import('../src/modules/commerce/payment-risk.service')
    const riskService = app.get(PaymentRiskService)
    await riskService.recordSignal({ accountId: sender.id, signalType: 'MULTIPLE_FAILED_PAYMENTS', severity: 'MEDIUM', reason: 'fixture', evidence: {} })
    const riskCase = await prisma.paymentRiskCase.findFirstOrThrow({ where: { accountId: sender.id, status: { in: ['OPEN', 'UNDER_REVIEW'] } } })

    const applyRes = await (await request())
      .post(`/api/admin/finance/risk-cases/${riskCase.id}/actions`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ action: 'ACCOUNT_RESTRICTION', reason: 'e2e verificando bloqueio de conta' })
    expect(applyRes.status).toBe(201)

    const transferBlocked = await (await request())
      .post('/api/wallet/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientUsername: recipient.username, amount: 50 })
    expect(transferBlocked.status).toBe(403)

    const senderUser = { id: sender.id, username: sender.username, name: sender.name, email: sender.email, role: 'PLAYER' as const, permissions: [], twoFactorEnabled: false }

    const { CommerceService } = await import('../src/modules/commerce/commerce.service')
    const commerceService = app.get(CommerceService)
    const product = await prisma.shopProduct.create({
      data: { key: `acct-restrict-product-${suffix}`, slug: `acct-restrict-product-${suffix}`, name: 'Fixture', short: 'FIX', category: 'Servico', description: 'fixture', price: 10, currency: 'WCOIN', status: 'ACTIVE' }
    })
    await expect(commerceService.createPurchaseIntent({ productId: product.id, quantity: 1 }, senderUser)).rejects.toThrow()
  })

  it('RESTRICTED_ACCOUNT_STILL_RECEIVES_SYSTEM_CREDIT: a restriction never blocks the account from RECEIVING legitimate credit', async () => {
    const restricted = await makePlayerWithBalance('receivecredit', 0)
    const superAdmin = await makeSuperAdmin()
    const superToken = await issueToken(superAdmin.id)

    const { PaymentRiskService } = await import('../src/modules/commerce/payment-risk.service')
    const riskService = app.get(PaymentRiskService)
    await riskService.recordSignal({ accountId: restricted.id, signalType: 'MULTIPLE_FAILED_PAYMENTS', severity: 'MEDIUM', reason: 'fixture', evidence: {} })
    const riskCase = await prisma.paymentRiskCase.findFirstOrThrow({ where: { accountId: restricted.id, status: { in: ['OPEN', 'UNDER_REVIEW'] } } })
    await (await request())
      .post(`/api/admin/finance/risk-cases/${riskCase.id}/actions`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ action: 'ACCOUNT_RESTRICTION', reason: 'e2e' })

    await prisma.$transaction((tx) =>
      walletLedger.credit(tx, restricted.id, 'WCOIN', 100, {
        idempotencyKey: `system-credit-${suffix}-${restricted.id}`,
        type: 'SERVER_REWARD',
        sourceType: 'Fixture'
      })
    )

    const balance = await walletLedger.getBalance(restricted.id, 'WCOIN')
    expect(balance).toBe(100)
  })

  it('WC_TRANSFER_SIGNALS: IMMEDIATE_WCOIN_TRANSFER, NEAR_FULL_BALANCE_TRANSFER, MANY_RECIPIENTS_AFTER_PURCHASE, REPEATED_RECIPIENT_NETWORK all fire with real evidence', async () => {
    const sender = await makePlayerWithBalance('signals', 1000)
    const token = await issueToken(sender.id)

    // A real, recent WC_PURCHASE_CREDIT -- both IMMEDIATE_WCOIN_TRANSFER
    // and MANY_RECIPIENTS_AFTER_PURCHASE key off this.
    await prisma.$transaction((tx) =>
      walletLedger.credit(tx, sender.id, 'WCOIN', 500, {
        idempotencyKey: `signals-credit-${suffix}`,
        type: 'WC_PURCHASE_CREDIT',
        sourceType: 'RechargeIntent',
        sourceId: `fixture-recharge-${suffix}`
      })
    )

    // Sender has 1000 (base) + 500 (recent credit) = 1500 available.
    // Two modest transfers, then a near-full-balance one on what remains
    // -- exercises MANY_RECIPIENTS_AFTER_PURCHASE (recipient count) and
    // NEAR_FULL_BALANCE_TRANSFER (percentage of remaining balance) in the
    // same loop without ever overdrawing.
    const recipients = [await makePlayerWithBalance('sig1', 0), await makePlayerWithBalance('sig2', 0), await makePlayerWithBalance('sig3', 0)]
    const amounts = [100, 100, 1200]
    for (let i = 0; i < recipients.length; i++) {
      const res = await (await request())
        .post('/api/wallet/transfers')
        .set('Authorization', `Bearer ${token}`)
        .send({ recipientUsername: recipients[i].username, amount: amounts[i] })
      expect(res.status).toBe(201)
    }

    const immediate = await prisma.paymentRiskSignal.findFirst({ where: { accountId: sender.id, signalType: 'IMMEDIATE_WCOIN_TRANSFER' } })
    expect(immediate).not.toBeNull()
    expect((immediate!.evidence as { originPaymentLedgerEntryId: string }).originPaymentLedgerEntryId).toBeDefined()

    const nearFull = await prisma.paymentRiskSignal.findFirst({ where: { accountId: sender.id, signalType: 'NEAR_FULL_BALANCE_TRANSFER' } })
    expect(nearFull).not.toBeNull()

    const manyRecipients = await prisma.paymentRiskSignal.findFirst({ where: { accountId: sender.id, signalType: 'MANY_RECIPIENTS_AFTER_PURCHASE' } })
    expect(manyRecipients).not.toBeNull()
    expect((manyRecipients!.evidence as { recipientCount: number }).recipientCount).toBeGreaterThanOrEqual(3)

    // REPEATED_RECIPIENT_NETWORK: 3 distinct senders to the SAME recipient.
    const fanInRecipient = await makePlayerWithBalance('fanin', 0)
    const senders = [await makePlayerWithBalance('fansend1', 200), await makePlayerWithBalance('fansend2', 200), await makePlayerWithBalance('fansend3', 200)]
    for (const s of senders) {
      const t = await issueToken(s.id)
      const res = await (await request())
        .post('/api/wallet/transfers')
        .set('Authorization', `Bearer ${t}`)
        .send({ recipientUsername: fanInRecipient.username, amount: 25 })
      expect(res.status).toBe(201)
    }
    const repeatedRecipient = await prisma.paymentRiskSignal.findFirst({ where: { accountId: fanInRecipient.id, signalType: 'REPEATED_RECIPIENT_NETWORK' } })
    expect(repeatedRecipient).not.toBeNull()
    expect((repeatedRecipient!.evidence as { distinctSenderCount: number }).distinctSenderCount).toBeGreaterThanOrEqual(3)
  })

  // PHASE Q DECISION CLOSURE (2026-08-31), Part 8 -- named explicitly in
  // Bryan's own instruction. TRANSFER_RESTRICTION_ENFORCED above already
  // proves apply-then-lift restores access; this is the narrower,
  // specifically-named "blocked while active" case kept separate for
  // direct traceability against the phase's own test list.
  it('DIRECT_TRANSFER_RESTRICTION_BLOCKS: an active TRANSFER_RESTRICTION blocks a direct transfer attempt', async () => {
    const sender = await makePlayerWithBalance('directblock', 1000)
    const recipient = await makePlayerWithBalance('directblockrecv', 0)
    const token = await issueToken(sender.id)
    const superAdmin = await makeSuperAdmin()
    const superToken = await issueToken(superAdmin.id)

    const { PaymentRiskService } = await import('../src/modules/commerce/payment-risk.service')
    const riskService = app.get(PaymentRiskService)
    await riskService.recordSignal({ accountId: sender.id, signalType: 'RAPID_PURCHASE_SEQUENCE', severity: 'LOW', reason: 'fixture', evidence: {} })
    const riskCase = await prisma.paymentRiskCase.findFirstOrThrow({ where: { accountId: sender.id, status: { in: ['OPEN', 'UNDER_REVIEW'] } } })
    await (await request())
      .post(`/api/admin/finance/risk-cases/${riskCase.id}/actions`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ action: 'TRANSFER_RESTRICTION', reason: 'e2e DIRECT_TRANSFER_RESTRICTION_BLOCKS' })

    const res = await (await request())
      .post('/api/wallet/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientUsername: recipient.username, amount: 50 })
    expect(res.status).toBe(403)
  })

  // PHASE Q DECISION CLOSURE (2026-08-31), Decision 2/Part 8 -- the
  // player-facing history view (sent/received, gross/fee/net, date,
  // status) backing painel/transferencias.vue. Also proves the "never
  // exposes risk/security metadata" requirement: the response shape is
  // asserted exhaustively, so a stray riskScore/signal/case field would
  // fail this test.
  it('DIRECT_TRANSFER_HISTORY: shows sent and received transfers from each account\'s own point of view, no risk metadata', async () => {
    const alice = await makePlayerWithBalance('histalice', 1000)
    const bob = await makePlayerWithBalance('histbob', 0)
    const aliceToken = await issueToken(alice.id)

    const res = await (await request())
      .post('/api/wallet/transfers')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ recipientUsername: bob.username, amount: 100 })
    expect(res.status).toBe(201)

    const aliceHistory = await (await request())
      .get('/api/wallet/transfers/history')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(aliceHistory.status).toBe(200)
    expect(Array.isArray(aliceHistory.body)).toBe(true)
    const sentRow = aliceHistory.body.find((row: { direction: string }) => row.direction === 'SENT')
    expect(sentRow).toBeDefined()
    expect(sentRow.counterpartyUsername).toBe(bob.username)
    expect(sentRow.grossAmount).toBe(100)
    expect(sentRow.feeAmount).toBe(10)
    expect(sentRow.netAmount).toBe(90)
    expect(sentRow.currency).toBe('WCOIN')
    expect(sentRow.status).toBe('SETTLED')
    expect(Object.keys(sentRow).sort()).toEqual(
      ['id', 'direction', 'counterpartyUsername', 'grossAmount', 'feeAmount', 'netAmount', 'currency', 'occurredAt', 'status'].sort()
    )

    const bobToken = await issueToken(bob.id)
    const bobHistory = await (await request())
      .get('/api/wallet/transfers/history')
      .set('Authorization', `Bearer ${bobToken}`)
    expect(bobHistory.status).toBe(200)
    const receivedRow = bobHistory.body.find((row: { direction: string }) => row.direction === 'RECEIVED')
    expect(receivedRow).toBeDefined()
    expect(receivedRow.counterpartyUsername).toBe(alice.username)
    expect(receivedRow.grossAmount).toBe(100)
    expect(receivedRow.feeAmount).toBe(10)
    expect(receivedRow.netAmount).toBe(90)
  })
})
