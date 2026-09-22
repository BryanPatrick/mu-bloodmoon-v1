import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Open Beta Plan B (2026-09-18): proves the server-side gate on
// createListing/createOrder actually holds -- frontend hiding alone was
// explicitly ruled insufficient. See marketplace.service.ts's
// assertMarketplaceEnabled() and docs/handoff/open-beta-readiness-audit-2026-09-17.md
// §1 item 4 / §8 for the real finding this closes (a player could debit
// currency into an order GameBridge can never complete, recoverable only
// through dev-only bypass endpoints).
const CONTAINER = 'bloodmoon-e2e-marketplace-beta-gate'

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
  process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
  process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-test-two-factor-key-at-least-32-characters'
  execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })
}, 120000)

afterAll(() => stopDisposableDatabase(CONTAINER))

jest.setTimeout(30000)

describe('Marketplace Open Beta gate -- disabled by default (Plan B)', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let marketplace: import('../src/modules/marketplace/marketplace.service').MarketplaceService

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { MarketplaceService } = await import('../src/modules/marketplace/marketplace.service')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    marketplace = app.get(MarketplaceService)
  }, 60000)

  afterAll(async () => app?.close())

  const suffix = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

  async function makeAccount(label: string) {
    const s = suffix()
    return prisma.account.create({
      data: {
        username: `${label}_${s}`.slice(0, 20),
        name: `${label} ${s}`,
        email: `${label}-${s}@example.invalid`,
        passwordHash: 'not-a-real-hash',
        personalIdHash: 'not-a-real-hash',
        role: 'PLAYER',
        status: 'ACTIVE',
        currencies: {
          create: [
            { currency: 'WCOIN', balance: 500 },
            { currency: 'GOBLIN_POINT', balance: 0 },
            { currency: 'HUNT_POINT', balance: 0 }
          ]
        }
      }
    })
  }

  function asUser(account: { id: string, username: string, name: string, email: string, role: 'PLAYER' }) {
    return { ...account, permissions: [], twoFactorEnabled: false }
  }

  let baselineEnv: string | undefined
  beforeEach(() => {
    baselineEnv = process.env.MARKETPLACE_ENABLED
  })
  afterEach(() => {
    if (baselineEnv === undefined) delete process.env.MARKETPLACE_ENABLED
    else process.env.MARKETPLACE_ENABLED = baselineEnv
  })

  it('createListing fails closed when MARKETPLACE_ENABLED is unset (the real production default)', async () => {
    delete process.env.MARKETPLACE_ENABLED
    const seller = await makeAccount('gateseller1')
    const listingsBefore = await prisma.playerMarketListing.count()
    const jobsBefore = await prisma.gameBridgeJob.count()

    await expect(
      marketplace.createListing(
        { gameItemRef: `e2e-gate-${randomUUID()}`, itemName: 'Gate Item', itemCategory: 'weapon', itemData: {}, price: 10, currency: 'WCOIN' },
        asUser(seller as never)
      )
    ).rejects.toMatchObject({ status: 503, response: expect.objectContaining({ code: 'MARKETPLACE_DISABLED' }) })

    expect(await prisma.playerMarketListing.count()).toBe(listingsBefore)
    expect(await prisma.gameBridgeJob.count()).toBe(jobsBefore)
  })

  it('createListing fails closed when MARKETPLACE_ENABLED=false explicitly', async () => {
    process.env.MARKETPLACE_ENABLED = 'false'
    const seller = await makeAccount('gateseller2')
    await expect(
      marketplace.createListing(
        { gameItemRef: `e2e-gate-${randomUUID()}`, itemName: 'Gate Item', itemCategory: 'weapon', itemData: {}, price: 10, currency: 'WCOIN' },
        asUser(seller as never)
      )
    ).rejects.toMatchObject({ status: 503 })
  })

  it('createOrder fails closed, debits nothing, creates no ledger row and no GameBridge job', async () => {
    // Create the listing WHILE enabled (a pre-existing listing, exactly
    // the "existing marketplace data" scenario the audit found) --
    process.env.MARKETPLACE_ENABLED = 'true'
    const seller = await makeAccount('gateseller3')
    const buyer = await makeAccount('gatebuyer3')
    const listing = await marketplace.createListing(
      { gameItemRef: `e2e-gate-${randomUUID()}`, itemName: 'Gate Item', itemCategory: 'weapon', itemData: {}, price: 50, currency: 'WCOIN' },
      asUser(seller as never)
    )
    await prisma.playerMarketListing.update({ where: { id: listing.id }, data: { status: 'ACTIVE' } })

    // then disable and try to buy it -- the real Beta state.
    process.env.MARKETPLACE_ENABLED = 'false'
    const balanceBefore = (await prisma.accountCurrency.findUnique({ where: { accountId_currency: { accountId: buyer.id, currency: 'WCOIN' } } }))!.balance
    const ledgerBefore = await prisma.walletLedgerEntry.count({ where: { accountId: buyer.id } })
    const ordersBefore = await prisma.playerMarketOrder.count()
    const jobsBefore = await prisma.gameBridgeJob.count()

    await expect(
      marketplace.createOrder({ listingId: listing.id }, asUser(buyer as never))
    ).rejects.toMatchObject({ status: 503, response: expect.objectContaining({ code: 'MARKETPLACE_DISABLED' }) })

    const balanceAfter = (await prisma.accountCurrency.findUnique({ where: { accountId_currency: { accountId: buyer.id, currency: 'WCOIN' } } }))!.balance
    expect(balanceAfter).toBe(balanceBefore)
    expect(await prisma.walletLedgerEntry.count({ where: { accountId: buyer.id } })).toBe(ledgerBefore)
    expect(await prisma.playerMarketOrder.count()).toBe(ordersBefore)
    expect(await prisma.gameBridgeJob.count()).toBe(jobsBefore)

    // The listing itself is untouched -- still ACTIVE, not silently
    // cancelled or corrupted by the failed attempt.
    const listingAfter = await prisma.playerMarketListing.findUnique({ where: { id: listing.id } })
    expect(listingAfter?.status).toBe('ACTIVE')
  })

  it('cancelListing keeps working while the gate is off -- existing state stays recoverable', async () => {
    process.env.MARKETPLACE_ENABLED = 'true'
    const seller = await makeAccount('gateseller4')
    const listing = await marketplace.createListing(
      { gameItemRef: `e2e-gate-${randomUUID()}`, itemName: 'Gate Item', itemCategory: 'weapon', itemData: {}, price: 20, currency: 'WCOIN' },
      asUser(seller as never)
    )

    process.env.MARKETPLACE_ENABLED = 'false'
    const cancelled = await marketplace.cancelListing(listing.id, asUser(seller as never))
    expect(cancelled.status).toBe('CANCELED')
  })

  it('read paths (listPublic, listListings, listMyListings, listMyOrders) stay available while the gate is off', async () => {
    process.env.MARKETPLACE_ENABLED = 'true'
    const seller = await makeAccount('gateseller5')
    await marketplace.createListing(
      { gameItemRef: `e2e-gate-${randomUUID()}`, itemName: 'Gate Item', itemCategory: 'weapon', itemData: {}, price: 15, currency: 'WCOIN' },
      asUser(seller as never)
    )

    process.env.MARKETPLACE_ENABLED = 'false'
    await expect(marketplace.listPublic({})).resolves.toBeDefined()
    await expect(marketplace.listMyListings(asUser(seller as never))).resolves.toBeDefined()
    await expect(marketplace.listMyOrders(asUser(seller as never))).resolves.toBeDefined()
  })

  it('createListing succeeds normally once MARKETPLACE_ENABLED=true -- the gate is not a permanent break', async () => {
    process.env.MARKETPLACE_ENABLED = 'true'
    const seller = await makeAccount('gateseller6')
    const listing = await marketplace.createListing(
      { gameItemRef: `e2e-gate-${randomUUID()}`, itemName: 'Gate Item', itemCategory: 'weapon', itemData: {}, price: 30, currency: 'WCOIN' },
      asUser(seller as never)
    )
    expect(listing.id).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Phase 17R (2026-09-21): defense in depth beyond the service-level gate above.
// Proves the gate over real HTTP (authenticated request -> SafeExceptionFilter ->
// public error code), that the dev-bypass routes are not registered at all, and
// that the two marketplace scripts refuse to read or change a single row while
// MARKETPLACE_ENABLED is not 'true' (a seeded PENDING job and an expired ACTIVE
// listing stay exactly as they were).
// ---------------------------------------------------------------------------
describe('Marketplace Open Beta gate -- real HTTP, unregistered bypass routes and workers (Phase 17R)', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService
  let marketplace: import('../src/modules/marketplace/marketplace.service').MarketplaceService
  let envBaseline: NodeJS.ProcessEnv

  beforeAll(async () => {
    envBaseline = { ...process.env }
    process.env.AUTH_CAPTCHA_TEST_BYPASS = '1'
    process.env.AUTH_MAIL_TEST_BYPASS = '1'
    delete process.env.MARKETPLACE_ENABLED
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { MarketplaceService } = await import('../src/modules/marketplace/marketplace.service')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
    prisma = app.get(PrismaService)
    marketplace = app.get(MarketplaceService)
  }, 60000)

  afterAll(async () => {
    await app?.close()
    // never leak the test bypass flags into the next spec file (auth-abuse relies on them being absent)
    for (const key of ['AUTH_CAPTCHA_TEST_BYPASS', 'AUTH_MAIL_TEST_BYPASS', 'MARKETPLACE_ENABLED']) {
      if (envBaseline[key] === undefined) delete process.env[key]
      else process.env[key] = envBaseline[key]
    }
  })

  const request = () => import('supertest').then((module) => module.default(httpServer))
  const suffix = Date.now().toString(36)
  const shortSuffix = suffix.slice(-4)
  let counter = 200

  async function registerAndLogin(label: string) {
    counter += 1
    const account = {
      name: `Gate ${label}`,
      username: `mg_${shortSuffix}_${counter.toString(36)}`,
      password: `gate-${label}-pw-1`,
      personalId: `${String(Date.now()).slice(-8)}${String(counter).padStart(3, '0')}`,
      email: `gate-${label}-${suffix}-${counter}@example.invalid`
    }
    const registered = await (await request()).post('/api/auth/register').send(account)
    expect(registered.status).toBe(201)
    const login = await (await request()).post('/api/auth/login').send({ username: account.username, password: account.password })
    expect(login.status).toBe(201)
    const row = await prisma.account.findUniqueOrThrow({ where: { username: account.username } })
    return { token: login.body.accessToken as string, id: row.id, username: account.username }
  }

  const asUser = (player: { id: string; username: string }) => ({ id: player.id, username: player.username, role: 'PLAYER', permissions: [], twoFactorEnabled: false }) as never
  const listingPayload = () => ({ gameItemRef: `e2e-http-${randomUUID()}`, itemName: 'Gate HTTP Item', itemCategory: 'weapon', itemData: {}, price: 10, currency: 'WCOIN' })

  it('an unauthenticated request never reaches the gate (401 first)', async () => {
    const res = await (await request()).post('/api/marketplace/listings').send(listingPayload())
    expect(res.status).toBe(401)
  })

  it('POST /marketplace/listings with a valid player token is rejected with 503 MARKETPLACE_DISABLED and creates nothing', async () => {
    const player = await registerAndLogin('list')
    const listingsBefore = await prisma.playerMarketListing.count()
    const jobsBefore = await prisma.gameBridgeJob.count()
    const res = await (await request()).post('/api/marketplace/listings').set('Authorization', `Bearer ${player.token}`).send(listingPayload())
    expect(res.status).toBe(503)
    expect(res.body.code).toBe('MARKETPLACE_DISABLED')
    expect(JSON.stringify(res.body)).not.toMatch(/prisma|mysql|stack|node_modules/i)
    expect(await prisma.playerMarketListing.count()).toBe(listingsBefore)
    expect(await prisma.gameBridgeJob.count()).toBe(jobsBefore)
  })

  it('POST /marketplace/orders with a valid player token is rejected, debits nothing and writes no ledger row', async () => {
    // an ACTIVE listing that already exists (created while the gate is open, as legacy/dev data would be)
    process.env.MARKETPLACE_ENABLED = 'true'
    const seller = await registerAndLogin('sell')
    const listing = await marketplace.createListing(listingPayload() as never, asUser(seller))
    await prisma.playerMarketListing.update({ where: { id: listing.id }, data: { status: 'ACTIVE' } })
    delete process.env.MARKETPLACE_ENABLED

    const buyer = await registerAndLogin('buy')
    await prisma.accountCurrency.upsert({
      where: { accountId_currency: { accountId: buyer.id, currency: 'WCOIN' } },
      create: { accountId: buyer.id, currency: 'WCOIN', balance: 500 },
      update: { balance: 500 }
    })
    const ledgerBefore = await prisma.walletLedgerEntry.count({ where: { accountId: buyer.id } })
    const ordersBefore = await prisma.playerMarketOrder.count()
    const res = await (await request()).post('/api/marketplace/orders').set('Authorization', `Bearer ${buyer.token}`).send({ listingId: listing.id })
    expect(res.status).toBe(503)
    expect(res.body.code).toBe('MARKETPLACE_DISABLED')
    const balance = await prisma.accountCurrency.findUniqueOrThrow({ where: { accountId_currency: { accountId: buyer.id, currency: 'WCOIN' } } })
    expect(balance.balance).toBe(500)
    expect(await prisma.walletLedgerEntry.count({ where: { accountId: buyer.id } })).toBe(ledgerBefore)
    expect(await prisma.playerMarketOrder.count()).toBe(ordersBefore)
    expect((await prisma.playerMarketListing.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe('ACTIVE')
  })

  it('public read of listings stays available (dormant read path, no economic effect)', async () => {
    const res = await (await request()).get('/api/marketplace/listings')
    expect(res.status).toBe(200)
  })

  it('a player token cannot reach any admin marketplace route (never a state change)', async () => {
    const player = await registerAndLogin('admin')
    const res = await (await request()).post('/api/admin/marketplace/listings/does-not-exist/actions').set('Authorization', `Bearer ${player.token}`).send({ action: 'APPROVE', reason: 'x' })
    expect([401, 403]).toContain(res.status)
  })

  it('the four dev-bypass routes are not registered at all (router 404, not a guard 401/403)', async () => {
    for (const [method, path] of [
      ['patch', '/api/admin/marketplace/listings/x/status'],
      ['post', '/api/admin/marketplace/listings/x/activate'],
      ['patch', '/api/admin/marketplace/orders/x/status'],
      ['patch', '/api/admin/game-bridge/jobs/x']
    ] as const) {
      const res = await (await request())[method](path).send({})
      expect({ path, status: res.status }).toEqual({ path, status: 404 })
    }
  })

  function runScript(script: string, extraEnv: Record<string, string | undefined>) {
    const env: NodeJS.ProcessEnv = { ...process.env, ...extraEnv }
    for (const [key, value] of Object.entries(extraEnv)) if (value === undefined) delete env[key]
    return execSync(`node ${script}`, { cwd: __dirname + '/..', env, encoding: 'utf8', stdio: 'pipe' })
  }

  it('the delivery worker reads and changes no row while MARKETPLACE_ENABLED is not true, even with MU_BRIDGE_ENABLED=true', async () => {
    const owner = await registerAndLogin('worker')
    const lock = await prisma.gameBridgeJob.create({ data: { accountId: owner.id, operation: 'LOCK_ITEM', idempotencyKey: `gate-lock-${randomUUID()}`, payload: {} } })
    const vip = await prisma.gameBridgeJob.create({ data: { accountId: owner.id, operation: 'GRANT_VIP', idempotencyKey: `gate-vip-${randomUUID()}`, payload: {} } })
    const output = runScript('scripts/process-game-bridge-jobs.mjs', { MU_BRIDGE_ENABLED: 'true', MU_BRIDGE_WORKER_CONCURRENCY: '1000', MARKETPLACE_ENABLED: undefined })
    expect(output).toMatch(/Marketplace disabled/)
    for (const job of [lock, vip]) {
      const after = await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
      expect({ operation: job.operation, status: after.status, attempts: after.attempts }).toEqual({ operation: job.operation, status: 'PENDING', attempts: 0 })
    }
    // anything other than the literal 'true' fails closed
    expect(runScript('scripts/process-game-bridge-jobs.mjs', { MU_BRIDGE_ENABLED: 'true', MARKETPLACE_ENABLED: 'false' })).toMatch(/Marketplace disabled/)
    expect(runScript('scripts/process-game-bridge-jobs.mjs', { MU_BRIDGE_ENABLED: 'true', MARKETPLACE_ENABLED: '1' })).toMatch(/Marketplace disabled/)
  })

  it('the expiration script expires nothing while MARKETPLACE_ENABLED is not true', async () => {
    process.env.MARKETPLACE_ENABLED = 'true'
    const seller = await registerAndLogin('expire')
    const listing = await marketplace.createListing(listingPayload() as never, asUser(seller))
    await prisma.playerMarketListing.update({ where: { id: listing.id }, data: { status: 'ACTIVE', expiresAt: new Date(Date.now() - 60_000) } })
    delete process.env.MARKETPLACE_ENABLED

    const output = runScript('scripts/process-marketplace-expirations.mjs', { MARKETPLACE_ENABLED: undefined })
    expect(output).toMatch(/Marketplace disabled/)
    const after = await prisma.playerMarketListing.findUniqueOrThrow({ where: { id: listing.id } })
    expect(after.status).toBe('ACTIVE')
    expect(await prisma.gameBridgeJob.count({ where: { idempotencyKey: `market-expiration-return:${listing.id}` } })).toBe(0)
  })
})
