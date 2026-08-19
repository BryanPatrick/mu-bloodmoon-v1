import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Same disposable-database pattern as the other Community/GM E2E specs.
const CONTAINER = 'bloodmoon-e2e-characters-demo-seed'

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

describe('isDemoCharacterSeedingSafe() -- pure guard logic (Global Portal Audit P1.1)', () => {
  // jest.resetModules() before each dynamic re-import, same pattern used by
  // test-personas.e2e-spec.ts -- process.env changes only take effect on a
  // fresh module evaluation, not a cached one.
  const importGuard = async () => {
    jest.resetModules()
    return import('../src/modules/characters/characters.env')
  }

  // Captured inside beforeAll, not at describe-body-evaluation time -- the
  // outer beforeAll (which sets DATABASE_URL to the disposable DB) runs
  // first, so this must run after it, not at Jest's collection phase.
  let baseline: NodeJS.ProcessEnv
  beforeAll(() => {
    baseline = { ...process.env }
  })
  afterEach(() => {
    process.env = { ...baseline }
  })

  it('is unsafe with no env vars set at all', async () => {
    delete process.env.CHARACTERS_DEMO_SEED_ENABLED
    process.env.NODE_ENV = 'production'
    process.env.DATABASE_URL = 'mysql://mubloodxz_bmapi:x@127.0.0.1:3306/mubloodxz_bloodmoon'
    const { isDemoCharacterSeedingSafe } = await importGuard()
    expect(isDemoCharacterSeedingSafe()).toBe(false)
  })

  it('is unsafe under NODE_ENV=production even if the opt-in flag and a safe-looking DB are both set', async () => {
    process.env.CHARACTERS_DEMO_SEED_ENABLED = 'true'
    process.env.NODE_ENV = 'production'
    process.env.DATABASE_URL = 'mysql://bloodmoon:x@127.0.0.1:3306/bloodmoon_local'
    const { isDemoCharacterSeedingSafe } = await importGuard()
    expect(isDemoCharacterSeedingSafe()).toBe(false)
  })

  it('is unsafe against the production database name even with the flag set and NODE_ENV=development', async () => {
    process.env.CHARACTERS_DEMO_SEED_ENABLED = 'true'
    process.env.NODE_ENV = 'development'
    process.env.DATABASE_URL = 'mysql://mubloodxz_bmapi:x@127.0.0.1:3306/mubloodxz_bloodmoon'
    const { isDemoCharacterSeedingSafe } = await importGuard()
    expect(isDemoCharacterSeedingSafe()).toBe(false)
  })

  it('is unsafe without the explicit opt-in flag, even under NODE_ENV=test with a safe DB', async () => {
    delete process.env.CHARACTERS_DEMO_SEED_ENABLED
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = 'mysql://bloodmoon:x@127.0.0.1:3306/bloodmoon_e2e'
    const { isDemoCharacterSeedingSafe } = await importGuard()
    expect(isDemoCharacterSeedingSafe()).toBe(false)
  })

  it('is safe only when all three conditions hold at once', async () => {
    process.env.CHARACTERS_DEMO_SEED_ENABLED = 'true'
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = 'mysql://bloodmoon:x@127.0.0.1:3306/bloodmoon_e2e'
    const { isDemoCharacterSeedingSafe } = await importGuard()
    expect(isDemoCharacterSeedingSafe()).toBe(true)
  })
})

describe('GET /characters -- FAKE_CHARACTERS_AVAILABLE = NO in production (Global Portal Audit P1.1)', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService

  beforeAll(async () => {
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
    // bloodmoon_local is a persistent local database (no Docker on this
    // machine), not wiped between runs -- clear any leftover seed
    // characters from an earlier run of this same spec's positive control
    // before asserting on the production-guard behavior below.
    await prisma.accountCharacter.deleteMany({ where: { name: { in: ['MoonElf', 'LordAdmin', 'BloodMage', 'FairyQueen'] } } })
  }, 60000)

  afterAll(async () => {
    await prisma?.accountCharacter.deleteMany({ where: { name: { in: ['MoonElf', 'LordAdmin', 'BloodMage', 'FairyQueen'] } } })
    await app?.close()
  })

  const request = () => import('supertest').then((m) => m.default(httpServer))

  // The exploit this guards against: the seed array's fake characters are
  // hardcoded onto usernames literally "admin" and "player" -- registering
  // those exact usernames here reproduces the real risk directly, not a
  // stand-in for it.
  const uniqueSuffix = Date.now().toString(36)
  const adminUser = { name: 'E2E Admin', username: 'admin', password: 'e2e-admin-password-1', personalId: '11122233344', email: `e2e-admin-${uniqueSuffix}@example.invalid` }
  const playerUser = { name: 'E2E Player', username: 'player', password: 'e2e-player-password-1', personalId: '22233344455', email: `e2e-player-${uniqueSuffix}@example.invalid` }
  let adminToken = ''
  let playerToken = ''

  it('registers accounts literally named admin/player (the exact seed-array target)', async () => {
    // bloodmoon_local is a persistent local database (no Docker on this
    // machine), not wiped between runs -- 409 (already registered by an
    // earlier run of this same spec, same fixed username+password) is fine;
    // anything else is a real registration failure.
    const registerAdmin = await (await request()).post('/api/auth/register').send(adminUser)
    expect([201, 409]).toContain(registerAdmin.status)
    const registerPlayer = await (await request()).post('/api/auth/register').send(playerUser)
    expect([201, 409]).toContain(registerPlayer.status)

    const loginAdmin = await (await request()).post('/api/auth/login').send({ username: adminUser.username, password: adminUser.password })
    adminToken = loginAdmin.body.accessToken
    const loginPlayer = await (await request()).post('/api/auth/login').send({ username: playerUser.username, password: playerUser.password })
    playerToken = loginPlayer.body.accessToken
  })

  it('NODE_ENV=production, no opt-in flag: GET /characters never produces the fake seed characters', async () => {
    const previousNodeEnv = process.env.NODE_ENV
    const previousFlag = process.env.CHARACTERS_DEMO_SEED_ENABLED
    process.env.NODE_ENV = 'production'
    delete process.env.CHARACTERS_DEMO_SEED_ENABLED
    try {
      const asAdmin = await (await request()).get('/api/characters').set('Authorization', `Bearer ${adminToken}`)
      expect(asAdmin.status).toBe(200)
      const names = asAdmin.body.data.map((character: { name: string }) => character.name)
      expect(names).not.toContain('MoonElf')
      expect(names).not.toContain('LordAdmin')
      expect(names).not.toContain('BloodMage')
      expect(names).not.toContain('FairyQueen')
      expect(asAdmin.body.data).toHaveLength(0)

      const asPlayer = await (await request()).get('/api/characters').set('Authorization', `Bearer ${playerToken}`)
      expect(asPlayer.status).toBe(200)
      expect(asPlayer.body.data).toHaveLength(0)
    } finally {
      process.env.NODE_ENV = previousNodeEnv
      if (previousFlag === undefined) delete process.env.CHARACTERS_DEMO_SEED_ENABLED
      else process.env.CHARACTERS_DEMO_SEED_ENABLED = previousFlag
    }
  })

  it('positive control: with the guard explicitly satisfied, the same accounts do get seeded -- proves this is a real gate, not a feature that silently stopped working', async () => {
    const previousNodeEnv = process.env.NODE_ENV
    const previousFlag = process.env.CHARACTERS_DEMO_SEED_ENABLED
    process.env.NODE_ENV = 'test'
    process.env.CHARACTERS_DEMO_SEED_ENABLED = 'true'
    try {
      const asAdmin = await (await request()).get('/api/characters').set('Authorization', `Bearer ${adminToken}`)
      expect(asAdmin.status).toBe(200)
      const names = asAdmin.body.data.map((character: { name: string }) => character.name)
      expect(names).toEqual(expect.arrayContaining(['MoonElf', 'LordAdmin', 'BloodMage']))
    } finally {
      process.env.NODE_ENV = previousNodeEnv
      if (previousFlag === undefined) delete process.env.CHARACTERS_DEMO_SEED_ENABLED
      else process.env.CHARACTERS_DEMO_SEED_ENABLED = previousFlag
    }
  })
})
