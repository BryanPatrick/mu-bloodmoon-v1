import { execSync } from 'node:child_process'

// A dedicated, disposable MariaDB container -- never the shared dev database
// (bloodmoon-mysql), never production. Created in beforeAll, destroyed in
// afterAll. DATABASE_URL is set on process.env *before* anything below
// imports the Nest app, so Prisma/ConfigModule pick up this database and
// never the one in apps/api/.env (dotenv does not overwrite an already-set
// env var).
const CONTAINER = 'bloodmoon-e2e-community-profile'
const DB_NAME = 'bloodmoon_e2e'
const DB_USER = 'validator'
const DB_PASSWORD = 'validator_pw'
const DB_ROOT_PASSWORD = 'validator_root_pw'

let port = ''

const sh = (command: string, options: Parameters<typeof execSync>[1] = {}) =>
  execSync(command, { stdio: 'pipe', ...options }).toString()

const waitForDatabase = async () => {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      sh(`docker exec ${CONTAINER} mariadb -u${DB_USER} -p${DB_PASSWORD} ${DB_NAME} -e "SELECT 1"`)
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
  throw new Error('Disposable e2e database did not become ready in time')
}

beforeAll(async () => {
  try {
    sh(`docker rm -f ${CONTAINER}`)
  } catch {
    /* fine if it didn't already exist */
  }
  sh(
    `docker run -d --name ${CONTAINER} ` +
      `-e MARIADB_DATABASE=${DB_NAME} -e MARIADB_USER=${DB_USER} -e MARIADB_PASSWORD=${DB_PASSWORD} ` +
      `-e MARIADB_ROOT_PASSWORD=${DB_ROOT_PASSWORD} -p 0:3306 mariadb:11`
  )
  const portOutput = sh(`docker port ${CONTAINER} 3306/tcp`)
  port = portOutput.trim().split(':').pop()!.trim()
  await waitForDatabase()

  process.env.DATABASE_URL = `mysql://${DB_USER}:${DB_PASSWORD}@localhost:${port}/${DB_NAME}`
  process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
  process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
  process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-test-two-factor-key-at-least-32-characters'

  sh('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env })
}, 120000)

afterAll(() => {
  try {
    sh(`docker rm -f ${CONTAINER}`)
  } catch {
    /* best effort cleanup */
  }
})

// bcrypt (cost 12, used by /auth/register and /auth/login) is legitimately
// slower than Jest's 5s default per-test timeout across several requests.
jest.setTimeout(30000)

describe('Community profile (real data, no mocks)', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server

  beforeAll(async () => {
    // Imported here, after DATABASE_URL is set above, so the app boots
    // against the disposable database.
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
    await app?.close()
  })

  const request = () => import('supertest').then((m) => m.default(httpServer))

  const uniqueSuffix = Date.now().toString(36)
  const userA = {
    name: 'E2E User A',
    username: `e2euser_a_${uniqueSuffix}`,
    password: 'e2e-test-password-a',
    personalId: '11122233344',
    email: `e2e-user-a-${uniqueSuffix}@example.invalid`
  }
  const userB = {
    name: 'E2E User B',
    username: `e2euser_b_${uniqueSuffix}`,
    password: 'e2e-test-password-b',
    personalId: '55566677788',
    email: `e2e-user-b-${uniqueSuffix}@example.invalid`
  }
  let tokenA = ''
  let tokenB = ''

  it('registers and logs in two real accounts', async () => {
    const req = await request()
    for (const user of [userA, userB]) {
      const registerRes = await req.post('/api/auth/register').send(user)
      expect(registerRes.status).toBe(201)
    }
    const loginA = await (
      await request()
    )
      .post('/api/auth/login')
      .send({ username: userA.username, password: userA.password })
    expect(loginA.status).toBe(201)
    expect(typeof loginA.body.accessToken).toBe('string')
    tokenA = loginA.body.accessToken

    const loginB = await (
      await request()
    )
      .post('/api/auth/login')
      .send({ username: userB.username, password: userB.password })
    expect(loginB.status).toBe(201)
    tokenB = loginB.body.accessToken
  })

  it('login -> open own profile -> edit -> persist -> reload -> confirms real data', async () => {
    const before = await (await request()).get(`/api/community/profiles/${userA.username}`)
    expect(before.status).toBe(200)
    expect(before.body.communityProfile?.displayName || before.body.name).toBeTruthy()

    const update = await (
      await request()
    )
      .patch('/api/community/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ displayName: 'A New Real Display Name', bio: 'Uma bio real escrita no teste E2E.' })
    expect(update.status).toBe(200)
    expect(update.body.displayName).toBe('A New Real Display Name')

    // "Reload": a fresh GET, independent of the PATCH response, proves the
    // value was actually persisted to the database -- not just accepted.
    const after = await (await request()).get(`/api/community/profiles/${userA.username}`)
    expect(after.status).toBe(200)
    expect(after.body.communityProfile.displayName).toBe('A New Real Display Name')
    expect(after.body.communityProfile.bio).toBe('Uma bio real escrita no teste E2E.')
  })

  it("open another player's profile -> cannot edit it", async () => {
    const bBeforeAttempt = await (await request()).get(`/api/community/profiles/${userB.username}`)
    const bNameBefore =
      bBeforeAttempt.body.communityProfile?.displayName || bBeforeAttempt.body.name

    // There is no endpoint that lets user B target user A's profile at all --
    // PATCH /community/me is always scoped to the caller's own JWT-derived
    // account id. Proving the boundary means proving A's data is untouched
    // after B updates *their own* profile, and that B's own update did land
    // (ruling out "PATCH /me is just broken" as a false-negative explanation).
    const bUpdate = await (
      await request()
    )
      .patch('/api/community/me')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ displayName: 'User B Edited Their Own Profile' })
    expect(bUpdate.status).toBe(200)

    const aAfter = await (await request()).get(`/api/community/profiles/${userA.username}`)
    expect(aAfter.body.communityProfile.displayName).toBe('A New Real Display Name')

    const bAfter = await (await request()).get(`/api/community/profiles/${userB.username}`)
    expect(bAfter.body.communityProfile.displayName).toBe('User B Edited Their Own Profile')
    expect(bAfter.body.communityProfile.displayName).not.toBe(bNameBefore)
  })

  it('rejects an invalid profileVisibility value (400, not silently stored)', async () => {
    const res = await (
      await request()
    )
      .patch('/api/community/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ profileVisibility: 'NOT_A_REAL_VALUE' })
    expect(res.status).toBe(400)
  })

  it('rejects an unauthenticated profile update (401)', async () => {
    const res = await (
      await request()
    )
      .patch('/api/community/me')
      .send({ displayName: 'Should not work' })
    expect(res.status).toBe(401)
  })

  it('returns 404 for a profile that does not exist', async () => {
    const res = await (await request()).get('/api/community/profiles/this-user-does-not-exist-e2e')
    expect(res.status).toBe(404)
  })
})
