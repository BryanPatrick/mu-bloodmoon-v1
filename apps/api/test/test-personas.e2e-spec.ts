import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

const CONTAINER = 'bloodmoon-e2e-test-personas'

// ---------------------------------------------------------------------
// Pure guard-function tests -- no app boot, no database. These exercise
// isTestPersonaEnvironmentSafe()/isSuperAdminPersonaAllowed() directly
// against every combination of the three independent conditions they
// require, proving no single flag alone can ever enable the feature.
// ---------------------------------------------------------------------
describe('Test Personas -- environment guard (unit)', () => {
  const ORIGINAL_ENV = { ...process.env }

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  async function loadGuard() {
    jest.resetModules()
    return import('../src/modules/test-personas/test-personas.env')
  }

  it('is disabled when TEST_PERSONA_MODE is unset', async () => {
    delete process.env.TEST_PERSONA_MODE
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = 'mysql://u:p@localhost:3306/bloodmoon_e2e'
    const { isTestPersonaEnvironmentSafe } = await loadGuard()
    expect(isTestPersonaEnvironmentSafe()).toBe(false)
  })

  it('is disabled in a production-like NODE_ENV even with the flag and a safe database', async () => {
    process.env.TEST_PERSONA_MODE = 'true'
    process.env.NODE_ENV = 'production'
    process.env.DATABASE_URL = 'mysql://u:p@localhost:3306/bloodmoon_e2e'
    const { isTestPersonaEnvironmentSafe } = await loadGuard()
    expect(isTestPersonaEnvironmentSafe()).toBe(false)
  })

  it('is disabled when DATABASE_URL matches the known production database name', async () => {
    process.env.TEST_PERSONA_MODE = 'true'
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = 'mysql://u:p@127.0.0.1:3306/mubloodxz_bloodmoon'
    const { isTestPersonaEnvironmentSafe } = await loadGuard()
    expect(isTestPersonaEnvironmentSafe()).toBe(false)
  })

  it('is disabled when DATABASE_URL does not match any allow-listed local/e2e pattern', async () => {
    process.env.TEST_PERSONA_MODE = 'true'
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = 'mysql://u:p@some-unknown-host:3306/some_unknown_db'
    const { isTestPersonaEnvironmentSafe } = await loadGuard()
    expect(isTestPersonaEnvironmentSafe()).toBe(false)
  })

  it('is enabled only when all three conditions hold at once', async () => {
    process.env.TEST_PERSONA_MODE = 'true'
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = 'mysql://u:p@localhost:3306/bloodmoon_e2e'
    const { isTestPersonaEnvironmentSafe } = await loadGuard()
    expect(isTestPersonaEnvironmentSafe()).toBe(true)
  })

  it('SUPER_ADMIN persona stays disabled without its own separate opt-in, even when the base guard passes', async () => {
    process.env.TEST_PERSONA_MODE = 'true'
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = 'mysql://u:p@localhost:3306/bloodmoon_e2e'
    delete process.env.TEST_PERSONA_ALLOW_SUPER_ADMIN
    const { isSuperAdminPersonaAllowed } = await loadGuard()
    expect(isSuperAdminPersonaAllowed()).toBe(false)
  })

  it('SUPER_ADMIN persona is enabled only with both the base guard and its own opt-in', async () => {
    process.env.TEST_PERSONA_MODE = 'true'
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = 'mysql://u:p@localhost:3306/bloodmoon_e2e'
    process.env.TEST_PERSONA_ALLOW_SUPER_ADMIN = 'true'
    const { isSuperAdminPersonaAllowed } = await loadGuard()
    expect(isSuperAdminPersonaAllowed()).toBe(true)
  })
})

// ---------------------------------------------------------------------
// Disabled-by-default boot: without TEST_PERSONA_MODE set (the state every
// other e2e spec and production itself boots in), the routes must not
// exist at all -- a 404, not a 403 from a guard.
// ---------------------------------------------------------------------
describe('Test Personas -- disabled by default', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  const disabledContainer = 'bloodmoon-e2e-test-personas-disabled'

  beforeAll(async () => {
    const database = await startDisposableDatabase(disabledContainer)
    process.env.DATABASE_URL = database.databaseUrl
    delete process.env.TEST_PERSONA_MODE
    delete process.env.TEST_PERSONA_ALLOW_SUPER_ADMIN
    process.env.JWT_ACCESS_SECRET = 'e2e-personas-disabled-access-secret'
    process.env.JWT_REFRESH_SECRET = 'e2e-personas-disabled-refresh-secret'
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-personas-disabled-two-factor-key-32c'

    const { execSync } = await import('node:child_process')
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    // Each describe block in this file boots the app under a DIFFERENT
    // TEST_PERSONA_MODE/TEST_PERSONA_ALLOW_SUPER_ADMIN combination.
    // TestPersonasModule.register() is evaluated once, synchronously, when
    // app.module.ts's @Module(...) decorator first runs -- and Node caches
    // that module by resolved path, so a second dynamic import() in the same
    // test file would silently reuse the FIRST boot's registration decision.
    // resetModules() forces a genuinely fresh evaluation against the env
    // vars just set above.
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
  }, 120000)

  afterAll(async () => {
    await app?.close()
    stopDisposableDatabase(disabledContainer)
  })

  jest.setTimeout(30000)

  const request = () => import('supertest').then((m) => m.default(httpServer))

  it('does not register /api/test-personas/available when TEST_PERSONA_MODE is unset', async () => {
    const res = await (await request()).get('/api/test-personas/available')
    expect(res.status).toBe(404)
  })

  it('does not register /api/test-personas/activate when TEST_PERSONA_MODE is unset', async () => {
    const res = await (await request()).post('/api/test-personas/activate').send({ persona: 'PLAYER' })
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------
// Enabled boot (TEST_PERSONA_MODE=true, SUPER_ADMIN persona still off):
// functional + RBAC coverage for the account-role and guild-role personas.
// ---------------------------------------------------------------------
describe('Test Personas -- enabled', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.TEST_PERSONA_MODE = 'true'
    delete process.env.TEST_PERSONA_ALLOW_SUPER_ADMIN
    process.env.JWT_ACCESS_SECRET = 'e2e-personas-access-secret'
    process.env.JWT_REFRESH_SECRET = 'e2e-personas-refresh-secret'
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-personas-two-factor-encryption-key-32c'

    const { execSync } = await import('node:child_process')
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    // See the matching comment in the "disabled by default" block above --
    // this forces a fresh module evaluation against THIS block's env vars.
    jest.resetModules()
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

  afterAll(async () => {
    await app?.close()
    stopDisposableDatabase(CONTAINER)
  })

  jest.setTimeout(60000)

  const request = () => import('supertest').then((m) => m.default(httpServer))
  const activate = async (persona: string) => {
    const res = await (await request()).post('/api/test-personas/activate').send({ persona })
    return res
  }

  it('lists the account-role and guild-role personas, but not SUPER_ADMIN (not opted in)', async () => {
    const res = await (await request()).get('/api/test-personas/available')
    expect(res.status).toBe(200)
    expect(res.body.personas).toEqual(
      expect.arrayContaining(['PLAYER', 'GM', 'ADMIN', 'GUILD_LEADER', 'GUILD_OFFICER', 'GUILD_TREASURER', 'GUILD_MEMBER', 'GUILD_RECRUIT'])
    )
    expect(res.body.personas).not.toContain('SUPER_ADMIN')
  })

  it('rejects an unknown persona id', async () => {
    const res = await activate('NOT_A_REAL_PERSONA')
    expect(res.status).toBe(400)
  })

  it('rejects a raw account role sent as a persona id the way a client-supplied "role=" would', async () => {
    const res = await activate('SUPER_ADMIN_HACK')
    expect(res.status).toBe(400)
  })

  it('activates PLAYER with a real access token and PLAYER role', async () => {
    const res = await activate('PLAYER')
    expect(res.status).toBe(201)
    expect(res.body.user.role).toBe('PLAYER')
    expect(typeof res.body.accessToken).toBe('string')
  })

  it('activates GM with 2FA enabled server-side and correct role', async () => {
    const res = await activate('GM')
    expect(res.status).toBe(201)
    expect(res.body.user.role).toBe('GM')
    const account = await prisma.account.findUniqueOrThrow({ where: { id: res.body.user.id } })
    expect(account.twoFactorEnabled).toBe(true)
  })

  it('activates ADMIN and the token can reach an ADMIN-gated endpoint', async () => {
    const res = await activate('ADMIN')
    expect(res.status).toBe(201)
    const dash = await (await request())
      .get('/api/admin/dashboard/operational')
      .set('Authorization', `Bearer ${res.body.accessToken}`)
    expect(dash.status).toBe(200)
  })

  it('PLAYER persona is blocked from the ADMIN-gated endpoint (no privilege escalation)', async () => {
    const res = await activate('PLAYER')
    const dash = await (await request())
      .get('/api/admin/dashboard/operational')
      .set('Authorization', `Bearer ${res.body.accessToken}`)
    expect(dash.status).toBe(403)
  })

  it('GM persona does not inherit ADMIN-only access', async () => {
    const res = await activate('GM')
    const dash = await (await request())
      .get('/api/admin/dashboard/operational')
      .set('Authorization', `Bearer ${res.body.accessToken}`)
    expect(dash.status).toBe(403)
  })

  it('SUPER_ADMIN persona activation is rejected in this boot (not opted in)', async () => {
    const res = await activate('SUPER_ADMIN')
    expect(res.status).toBe(403)
  })

  it('GUILD_LEADER and GUILD_MEMBER share AccountRole PLAYER but differ by GuildRole', async () => {
    const leader = await activate('GUILD_LEADER')
    const member = await activate('GUILD_MEMBER')
    expect(leader.status).toBe(201)
    expect(member.status).toBe(201)
    expect(leader.body.user.role).toBe('PLAYER')
    expect(member.body.user.role).toBe('PLAYER')
    expect(leader.body.guild.roleKey).toBe('LEADER')
    expect(member.body.guild.roleKey).toBe('MEMBER')
    expect(leader.body.guild.slug).toBe(member.body.guild.slug)
  })

  it('GUILD_OFFICER and GUILD_TREASURER resolve to their own GuildRole in the same fixture guild', async () => {
    const officer = await activate('GUILD_OFFICER')
    const treasurer = await activate('GUILD_TREASURER')
    expect(officer.body.guild.roleKey).toBe('OFFICER')
    expect(treasurer.body.guild.roleKey).toBe('TREASURER')
  })

  it('GUILD_MEMBER has no member-management controls (kick is rejected)', async () => {
    const member = await activate('GUILD_MEMBER')
    const leader = await activate('GUILD_LEADER')
    const membership = await prisma.guildMember.findUniqueOrThrow({
      where: { characterId: (await prisma.accountCharacter.findFirstOrThrow({ where: { accountId: leader.body.user.id } })).id }
    })
    const kick = await (await request())
      .delete(`/api/guilds/${member.body.guild.slug}/members/${membership.id}`)
      .set('Authorization', `Bearer ${member.body.accessToken}`)
      .send({ reason: 'should be forbidden' })
    expect(kick.status).toBe(403)
  })

  it('reset removes every test-persona fixture, and activation still works cleanly afterwards', async () => {
    await activate('PLAYER')
    await activate('GUILD_LEADER')
    const resetRes = await (await request()).post('/api/test-personas/reset')
    expect(resetRes.status).toBe(201)
    expect(resetRes.body.removedAccounts).toBeGreaterThan(0)

    const remaining = await prisma.account.count({ where: { username: { startsWith: 'testpersona_' } } })
    expect(remaining).toBe(0)

    const reactivated = await activate('PLAYER')
    expect(reactivated.status).toBe(201)
  })
})

// ---------------------------------------------------------------------
// A second, separate boot with TEST_PERSONA_ALLOW_SUPER_ADMIN=true as well
// -- proves SUPER_ADMIN needs its own explicit opt-in on top of the base
// guard, not just the base guard alone.
// ---------------------------------------------------------------------
describe('Test Personas -- SUPER_ADMIN explicitly allowed', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  const superAdminContainer = 'bloodmoon-e2e-test-personas-super-admin'

  beforeAll(async () => {
    const database = await startDisposableDatabase(superAdminContainer)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.TEST_PERSONA_MODE = 'true'
    process.env.TEST_PERSONA_ALLOW_SUPER_ADMIN = 'true'
    process.env.JWT_ACCESS_SECRET = 'e2e-personas-super-admin-access-secret'
    process.env.JWT_REFRESH_SECRET = 'e2e-personas-super-admin-refresh-secret'
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-personas-super-admin-two-factor-key-32c'

    const { execSync } = await import('node:child_process')
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    // Each describe block in this file boots the app under a DIFFERENT
    // TEST_PERSONA_MODE/TEST_PERSONA_ALLOW_SUPER_ADMIN combination.
    // TestPersonasModule.register() is evaluated once, synchronously, when
    // app.module.ts's @Module(...) decorator first runs -- and Node caches
    // that module by resolved path, so a second dynamic import() in the same
    // test file would silently reuse the FIRST boot's registration decision.
    // resetModules() forces a genuinely fresh evaluation against the env
    // vars just set above.
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
  }, 120000)

  afterAll(async () => {
    await app?.close()
    stopDisposableDatabase(superAdminContainer)
  })

  jest.setTimeout(30000)

  const request = () => import('supertest').then((m) => m.default(httpServer))

  it('lists SUPER_ADMIN once explicitly opted in', async () => {
    const res = await (await request()).get('/api/test-personas/available')
    expect(res.body.personas).toContain('SUPER_ADMIN')
  })

  it('SUPER_ADMIN persona reaches a SUPER_ADMIN-only endpoint that ADMIN cannot', async () => {
    const superAdmin = await (await request()).post('/api/test-personas/activate').send({ persona: 'SUPER_ADMIN' })
    expect(superAdmin.status).toBe(201)
    const strategic = await (await request())
      .get('/api/admin/dashboard/strategic')
      .set('Authorization', `Bearer ${superAdmin.body.accessToken}`)
    expect(strategic.status).toBe(200)

    const admin = await (await request()).post('/api/test-personas/activate').send({ persona: 'ADMIN' })
    const adminAttempt = await (await request())
      .get('/api/admin/dashboard/strategic')
      .set('Authorization', `Bearer ${admin.body.accessToken}`)
    expect(adminAttempt.status).toBe(403)
  })
})
