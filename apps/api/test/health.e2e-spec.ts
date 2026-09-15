import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Phase: API health/readiness (2026-09-15). Real HTTP, real app bootstrap
// (confirms the routes are wired under the real global API prefix, not
// just reachable when called on the controller directly), real DB for the
// "ready" happy path. The DB-unavailable -> 503 branch, and the
// no-sensitive-detail-leaked assertion, are covered in
// health.controller.spec.ts instead -- there is no supported way to make a
// real Prisma connection fail on demand mid-e2e-run without either
// tearing down the shared disposable DB (which every other e2e spec in
// this run may still depend on, since Jest runs this suite --runInBand)
// or a fragile timing hack; a plain unit test already covers it cleanly.
const CONTAINER = 'bloodmoon-e2e-health'

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
  process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
  process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-test-two-factor-key-at-least-32-characters'
  process.env.AUTH_MAIL_TEST_BYPASS = '1'
  process.env.WEB_PUBLIC_URL = 'https://e2e.bloodmoon.invalid'
  execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })
}, 120000)

afterAll(() => stopDisposableDatabase(CONTAINER))

jest.setTimeout(30000)

describe('Health/readiness endpoints -- real app, real global prefix', () => {
  let app: import('@nestjs/common').INestApplication

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    await app.init()
  }, 60000)

  afterAll(async () => app?.close())

  it('GET /api/health -- 200, minimal ok payload, no auth needed', async () => {
    const request = (await import('supertest')).default
    const response = await request(app.getHttpServer()).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })

  it('GET /api/ready -- 200 ready when the real DB is reachable, no auth needed', async () => {
    const request = (await import('supertest')).default
    const response = await request(app.getHttpServer()).get('/api/ready')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ready' })
  })
})
