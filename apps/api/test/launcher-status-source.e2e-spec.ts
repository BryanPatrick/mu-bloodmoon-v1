import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Global Portal Audit P1.2: GET /launcher/bootstrap must never present the
// hardcoded 'ONLINE' fallback as if it were live-synced telemetry. This
// proves statusSource distinguishes an admin-set SiteSetting (MANUAL) from
// nobody ever having set one (UNKNOWN) -- there is no GameBridge yet.
const CONTAINER = 'bloodmoon-e2e-launcher-status-source'

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

describe('GET /launcher/bootstrap -- honest status source (Global Portal Audit P1.2)', () => {
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
    // machine), not wiped between runs -- clear any leftover row from a
    // prior run of this same spec before asserting on it.
    await prisma.siteSetting.deleteMany({ where: { key: 'launcher-server-status' } })
  }, 60000)

  afterAll(async () => {
    await prisma?.siteSetting.deleteMany({ where: { key: 'launcher-server-status' } })
    await app?.close()
  })

  const request = () => import('supertest').then((m) => m.default(httpServer))

  it('reports statusSource UNKNOWN with no statusUpdatedAt when no admin has ever set launcher-server-status', async () => {
    const response = await (await request()).get('/api/launcher/bootstrap')
    expect(response.status).toBe(200)
    expect(response.body.server.statusSource).toBe('UNKNOWN')
    expect(response.body.server.statusUpdatedAt).toBeNull()
    // The fallback value is still returned (unchanged behavior) -- only its
    // provenance is now disclosed via statusSource.
    expect(response.body.server.status).toBe('ONLINE')
  })

  it('reports statusSource MANUAL with a real timestamp once an admin sets the SiteSetting', async () => {
    const row = await prisma.siteSetting.create({
      data: {
        key: 'launcher-server-status',
        category: 'launcher',
        label: 'Status do servidor',
        value: 'MAINTENANCE',
        isPublic: true,
        status: 'PUBLISHED'
      }
    })

    const response = await (await request()).get('/api/launcher/bootstrap')
    expect(response.status).toBe(200)
    expect(response.body.server.status).toBe('MAINTENANCE')
    expect(response.body.server.statusSource).toBe('MANUAL')
    expect(response.body.server.statusUpdatedAt).toBe(row.updatedAt.toISOString())
  })

  it('never emits statusSource LIVE -- that value is reserved for a future GameBridge integration', async () => {
    const response = await (await request()).get('/api/launcher/bootstrap')
    expect(response.status).toBe(200)
    expect(response.body.server.statusSource).not.toBe('LIVE')
  })
})
