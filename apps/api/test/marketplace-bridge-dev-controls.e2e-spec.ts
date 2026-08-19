import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Global Portal Audit P1.3: activateListing/updateListingStatus/
// updateOrderStatus/updateBridgeJob fabricate a GameBridge confirmation with
// no real bridge involved and no state-transition rules. The old protection
// (activateListing() throwing only when MU_BRIDGE_ENABLED === 'true') left
// them reachable in production today, since production has MU_BRIDGE_ENABLED
// unset/false. This proves the routes are not registered at all --  a 404 at
// Nest's router -- unless isMarketplaceBridgeDevControlsSafe() explicitly
// allows it, mirroring the Test Personas pattern.
const CONTAINER = 'bloodmoon-e2e-marketplace-bridge-dev'

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

describe('isMarketplaceBridgeDevControlsSafe() -- pure guard logic (Global Portal Audit P1.3)', () => {
  const importGuard = async () => {
    jest.resetModules()
    return import('../src/modules/marketplace/marketplace-bridge-dev.env')
  }

  let baseline: NodeJS.ProcessEnv
  beforeAll(() => {
    baseline = { ...process.env }
  })
  afterEach(() => {
    process.env = { ...baseline }
  })

  it('is unsafe with no env vars set at all -- the real production/default boot state', async () => {
    delete process.env.MARKETPLACE_BRIDGE_DEV_CONTROLS_ENABLED
    process.env.NODE_ENV = 'production'
    process.env.DATABASE_URL = 'mysql://mubloodxz_bmapi:x@127.0.0.1:3306/mubloodxz_bloodmoon'
    const { isMarketplaceBridgeDevControlsSafe } = await importGuard()
    expect(isMarketplaceBridgeDevControlsSafe()).toBe(false)
  })

  it('is unsafe under NODE_ENV=production even if the opt-in flag and a safe-looking DB are both set', async () => {
    process.env.MARKETPLACE_BRIDGE_DEV_CONTROLS_ENABLED = 'true'
    process.env.NODE_ENV = 'production'
    process.env.DATABASE_URL = 'mysql://bloodmoon:x@127.0.0.1:3306/bloodmoon_local'
    const { isMarketplaceBridgeDevControlsSafe } = await importGuard()
    expect(isMarketplaceBridgeDevControlsSafe()).toBe(false)
  })

  it('is unsafe against the production database name even with the flag set and NODE_ENV=development', async () => {
    process.env.MARKETPLACE_BRIDGE_DEV_CONTROLS_ENABLED = 'true'
    process.env.NODE_ENV = 'development'
    process.env.DATABASE_URL = 'mysql://mubloodxz_bmapi:x@127.0.0.1:3306/mubloodxz_bloodmoon'
    const { isMarketplaceBridgeDevControlsSafe } = await importGuard()
    expect(isMarketplaceBridgeDevControlsSafe()).toBe(false)
  })

  it('is unsafe without the explicit opt-in flag, even under NODE_ENV=test with a safe DB', async () => {
    delete process.env.MARKETPLACE_BRIDGE_DEV_CONTROLS_ENABLED
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = 'mysql://bloodmoon:x@127.0.0.1:3306/bloodmoon_e2e'
    const { isMarketplaceBridgeDevControlsSafe } = await importGuard()
    expect(isMarketplaceBridgeDevControlsSafe()).toBe(false)
  })

  it('is unsafe when DATABASE_URL does not match a known local/e2e pattern, even with the flag and NODE_ENV=test', async () => {
    process.env.MARKETPLACE_BRIDGE_DEV_CONTROLS_ENABLED = 'true'
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = 'mysql://someone:x@10.0.0.5:3306/some_other_database'
    const { isMarketplaceBridgeDevControlsSafe } = await importGuard()
    expect(isMarketplaceBridgeDevControlsSafe()).toBe(false)
  })

  it('is safe only when all conditions hold at once', async () => {
    process.env.MARKETPLACE_BRIDGE_DEV_CONTROLS_ENABLED = 'true'
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = 'mysql://bloodmoon:x@127.0.0.1:3306/bloodmoon_e2e'
    const { isMarketplaceBridgeDevControlsSafe } = await importGuard()
    expect(isMarketplaceBridgeDevControlsSafe()).toBe(true)
  })
})

// ---------------------------------------------------------------------
// Disabled-by-default boot: the state every other e2e spec and production
// itself boots in. The four dev routes must not exist at all -- a 404, not
// a 403/401 from a guard -- while the read-only jobs listing stays.
// ---------------------------------------------------------------------
describe('Marketplace bridge dev controls -- not registered by default (Global Portal Audit P1.3)', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server

  beforeAll(async () => {
    delete process.env.MARKETPLACE_BRIDGE_DEV_CONTROLS_ENABLED
    process.env.NODE_ENV = 'test'

    jest.resetModules()
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
  }, 60000)

  afterAll(async () => app?.close())

  const request = () => import('supertest').then((m) => m.default(httpServer))

  it('does not register PATCH /admin/marketplace/listings/:id/status', async () => {
    const res = await (await request()).patch('/api/admin/marketplace/listings/x/status').send({ status: 'ACTIVE' })
    expect(res.status).toBe(404)
  })

  it('does not register POST /admin/marketplace/listings/:id/activate', async () => {
    const res = await (await request()).post('/api/admin/marketplace/listings/x/activate')
    expect(res.status).toBe(404)
  })

  it('does not register PATCH /admin/marketplace/orders/:id/status', async () => {
    const res = await (await request()).patch('/api/admin/marketplace/orders/x/status').send({ status: 'COMPLETED' })
    expect(res.status).toBe(404)
  })

  it('does not register PATCH /admin/game-bridge/jobs/:id', async () => {
    const res = await (await request()).patch('/api/admin/game-bridge/jobs/x').send({ status: 'COMPLETED' })
    expect(res.status).toBe(404)
  })

  it('still registers the read-only GET /admin/game-bridge/jobs (only the mutating dev routes were removed)', async () => {
    const res = await (await request()).get('/api/admin/game-bridge/jobs')
    // 401, not 404: the route exists and JwtAuthGuard rejected the missing token.
    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------
// Even a stray opt-in flag must not resurrect the routes under a
// production-like NODE_ENV -- proves NODE_ENV alone is a real, independent
// condition, not just the DATABASE_URL check.
// ---------------------------------------------------------------------
describe('Marketplace bridge dev controls -- still not registered under NODE_ENV=production even with the flag set (Global Portal Audit P1.3)', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server

  beforeAll(async () => {
    process.env.MARKETPLACE_BRIDGE_DEV_CONTROLS_ENABLED = 'true'
    process.env.NODE_ENV = 'production'

    jest.resetModules()
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
  }, 60000)

  afterAll(async () => {
    app?.close()
    delete process.env.MARKETPLACE_BRIDGE_DEV_CONTROLS_ENABLED
    process.env.NODE_ENV = 'test'
  })

  const request = () => import('supertest').then((m) => m.default(httpServer))

  it('does not register POST /admin/marketplace/listings/:id/activate', async () => {
    const res = await (await request()).post('/api/admin/marketplace/listings/x/activate')
    expect(res.status).toBe(404)
  })

  it('does not register PATCH /admin/game-bridge/jobs/:id', async () => {
    const res = await (await request()).patch('/api/admin/game-bridge/jobs/x').send({ status: 'COMPLETED' })
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------
// Explicitly enabled boot (dev/staging shape): routes exist and remain
// functional end-to-end for the local workflow that needs them while
// GameBridge doesn't exist yet.
// ---------------------------------------------------------------------
describe('Marketplace bridge dev controls -- registered and functional when explicitly enabled (Global Portal Audit P1.3)', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server

  beforeAll(async () => {
    process.env.MARKETPLACE_BRIDGE_DEV_CONTROLS_ENABLED = 'true'
    process.env.NODE_ENV = 'test'
    process.env.TEST_PERSONA_MODE = 'true'
    process.env.TEST_PERSONA_ALLOW_SUPER_ADMIN = 'true'

    jest.resetModules()
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
  }, 60000)

  afterAll(async () => {
    app?.close()
    delete process.env.MARKETPLACE_BRIDGE_DEV_CONTROLS_ENABLED
    delete process.env.TEST_PERSONA_MODE
    delete process.env.TEST_PERSONA_ALLOW_SUPER_ADMIN
  })

  const request = () => import('supertest').then((m) => m.default(httpServer))

  it('registers the routes -- 401 without a token, not 404', async () => {
    const res = await (await request()).post('/api/admin/marketplace/listings/x/activate')
    expect(res.status).toBe(401)
  })

  it('positive control: a real SUPER_ADMIN token reaches the real service logic, not a route-not-found 404', async () => {
    const activation = await (await request()).post('/api/test-personas/activate').send({ persona: 'SUPER_ADMIN' })
    expect(activation.status).toBe(201)
    const token = activation.body.accessToken as string

    const activateRes = await (await request())
      .post('/api/admin/marketplace/listings/does-not-exist/activate')
      .set('Authorization', `Bearer ${token}`)
    // Business 404 ("Anuncio nao encontrado.") -- proves the request reached
    // MarketplaceService.activateListing(), not Nest's generic route-missing
    // 404 ("Cannot POST ..."), which is what the earlier describe blocks assert.
    expect(activateRes.status).toBe(404)
    expect(activateRes.body.message).toMatch(/nao encontrado/i)
    expect(activateRes.body.message).not.toMatch(/cannot (post|patch|get)/i)

    const bridgeJobRes = await (await request())
      .patch('/api/admin/game-bridge/jobs/does-not-exist')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'COMPLETED' })
    expect(bridgeJobRes.status).toBe(404)
    expect(bridgeJobRes.body.message).toMatch(/nao encontrado/i)
  })
})
