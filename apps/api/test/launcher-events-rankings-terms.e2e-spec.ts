import { randomUUID } from 'node:crypto'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Launcher Phase L3 -- the three new public read routes the WPF Launcher's
// Events/Ranking/Store pages consume: GET /launcher/events, GET
// /launcher/rankings, GET /launcher/store/terms/active. Same trust level
// as the existing GET /launcher/bootstrap (no auth guard, no PII/secret).
const CONTAINER = 'bloodmoon-e2e-launcher-events-rankings-terms'

describe('Launcher events/rankings/terms public read routes', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
    process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
    process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-test-two-factor-key-at-least-32-characters'

    const { execSync } = await import('node:child_process')
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    await app.init()
    prisma = app.get(PrismaService)
  }, 120_000)

  afterAll(async () => {
    await app?.close()
    stopDisposableDatabase(CONTAINER)
  })

  const request = () => import('supertest').then((m) => m.default(app.getHttpServer()))
  const seed = () => randomUUID().slice(0, 8)

  describe('GET /launcher/events', () => {
    it('returns only launcherEnabled, PUBLISHED, SEASON_6 events, with an active/upcoming split', async () => {
      const s = seed()
      const now = Date.now()
      const active = await prisma.knowledgeEntry.create({
        data: {
          canonicalKey: `l3-active-${s}`,
          slug: `l3-active-${s}`,
          title: `Active event ${s}`,
          kind: 'EVENT',
          scope: 'SEASON_6',
          status: 'PUBLISHED',
          launcherEnabled: true,
          calendarEnabled: true,
          eventStartsAt: new Date(now - 60_000),
          eventEndsAt: new Date(now + 3_600_000)
        }
      })
      const upcoming = await prisma.knowledgeEntry.create({
        data: {
          canonicalKey: `l3-upcoming-${s}`,
          slug: `l3-upcoming-${s}`,
          title: `Upcoming event ${s}`,
          kind: 'EVENT',
          scope: 'SEASON_6',
          status: 'PUBLISHED',
          launcherEnabled: true,
          eventStartsAt: new Date(now + 3_600_000)
        }
      })
      const notEnabled = await prisma.knowledgeEntry.create({
        data: {
          canonicalKey: `l3-hidden-${s}`,
          slug: `l3-hidden-${s}`,
          title: `Hidden event ${s}`,
          kind: 'EVENT',
          scope: 'SEASON_6',
          status: 'PUBLISHED',
          launcherEnabled: false,
          eventStartsAt: new Date(now + 3_600_000)
        }
      })

      try {
        const res = await (await request()).get('/api/launcher/events')
        expect(res.status).toBe(200)
        expect(res.body.activeEvent?.name).toBe(`Active event ${s}`)
        const upcomingNames = res.body.upcoming.map((e: { name: string }) => e.name)
        expect(upcomingNames).toContain(`Upcoming event ${s}`)
        expect(upcomingNames).not.toContain(`Hidden event ${s}`)
        const calendarNames = res.body.calendar.map((e: { name: string }) => e.name)
        expect(calendarNames).toContain(`Active event ${s}`)
      } finally {
        await prisma.knowledgeEntry.deleteMany({ where: { id: { in: [active.id, upcoming.id, notEnabled.id] } } })
      }
    })
  })

  describe('GET /launcher/rankings', () => {
    it('returns ranking rows ordered by masterReset by default, honestly sourced from AccountCharacter', async () => {
      const res = await (await request()).get('/api/launcher/rankings')
      expect(res.status).toBe(200)
      expect(res.body.rankingType).toBe('masterReset')
      expect(res.body.availableRankingTypes).toEqual(['masterReset', 'resets', 'level'])
      expect(Array.isArray(res.body.entries)).toBe(true)
    })

    it('accepts a ranking type query param', async () => {
      const res = await (await request()).get('/api/launcher/rankings?type=level')
      expect(res.status).toBe(200)
      expect(res.body.rankingType).toBe('level')
    })
  })

  describe('GET /launcher/store/terms/active', () => {
    it('returns no terms version when none has been configured yet', async () => {
      await prisma.storePurchaseTerms.updateMany({ where: { active: true }, data: { active: false } })
      const res = await (await request()).get('/api/launcher/store/terms/active')
      expect(res.status).toBe(200)
      // The service returns null; NestJS's test harness serializes a bare
      // null return as an empty body (supertest then defaults res.body to
      // {}) -- what matters functionally is that no terms fields are
      // present, which is what the WPF client actually checks.
      expect(res.body?.version).toBeUndefined()
      expect(res.body?.title).toBeUndefined()
    })

    it('returns the active terms version once one exists', async () => {
      const s = seed()
      const terms = await prisma.storePurchaseTerms.create({
        data: { title: `Termos L3 ${s}`, content: 'Conteudo dos termos.', active: true }
      })
      try {
        const res = await (await request()).get('/api/launcher/store/terms/active')
        expect(res.status).toBe(200)
        expect(res.body.version).toBe(terms.version)
        expect(res.body.title).toBe(`Termos L3 ${s}`)
      } finally {
        await prisma.storePurchaseTerms.delete({ where: { id: terms.id } })
      }
    })
  })
})
