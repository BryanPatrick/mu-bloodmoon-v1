import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Launcher Foundation phase -- covers the additive bootstrap fields
// (schemaVersion, contentVersion, campaign, socials, utilities, assets)
// layered on top of the pre-existing GET /launcher/bootstrap contract.
// Never asserts on the full response shape with toEqual -- only on the new
// fields -- so this can't fight portal-critical.e2e-spec.ts or
// launcher-status-source.e2e-spec.ts over the same route.
const CONTAINER = 'bloodmoon-e2e-launcher-remote-content-contract'

describe('GET /launcher/bootstrap -- remote content runtime foundation', () => {
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
  const seed = () => Math.random().toString(36).slice(2, 10)

  afterEach(async () => {
    // bloodmoon_local persists across runs -- clear only the rows this file
    // itself creates (seeded keys below), matching the project convention
    // documented after the Phase 3B GameAccountIdentity flake.
    await prisma.siteSetting.deleteMany({ where: { key: { in: ['launcher-campaign', 'launcher-social-links'] } } })
  })

  it('always includes schemaVersion and a stable contentVersion', async () => {
    const first = await (await request()).get('/api/launcher/bootstrap')
    const second = await (await request()).get('/api/launcher/bootstrap')

    expect(first.status).toBe(200)
    expect(first.body.schemaVersion).toBe(1)
    expect(typeof first.body.contentVersion).toBe('string')
    expect(first.body.contentVersion.length).toBeGreaterThan(0)
    // Nothing changed between the two calls -- same version, proving it's
    // derived from content, not a per-request timestamp/random value.
    expect(second.body.contentVersion).toBe(first.body.contentVersion)
  })

  it('contentVersion changes when a relevant SiteSetting is created', async () => {
    const before = await (await request()).get('/api/launcher/bootstrap')

    await prisma.siteSetting.create({
      data: {
        key: 'launcher-campaign',
        category: 'launcher',
        label: 'Campanha',
        value: { enabled: true, type: 'OPEN_BETA', title: 'OPEN BETA' },
        isPublic: true,
        status: 'PUBLISHED'
      }
    })

    const after = await (await request()).get('/api/launcher/bootstrap')
    expect(after.body.contentVersion).not.toBe(before.body.contentVersion)
  })

  it('campaign defaults to disabled with null fields when no CMS row exists', async () => {
    const res = await (await request()).get('/api/launcher/bootstrap')
    expect(res.body.campaign).toEqual({
      enabled: false,
      type: null,
      title: null,
      subtitle: null,
      versionLabel: null,
      imageUrl: null,
      ctaLabel: null,
      ctaUrl: null
    })
  })

  it('campaign reflects the CMS value once set, e.g. OPEN BETA today, TEMPORADA 1 later without a rebuild', async () => {
    await prisma.siteSetting.create({
      data: {
        key: 'launcher-campaign',
        category: 'launcher',
        label: 'Campanha',
        value: {
          enabled: true,
          type: 'OPEN_BETA',
          title: 'OPEN BETA',
          subtitle: 'Jogue agora',
          versionLabel: 'v1',
          imageUrl: 'https://cdn.example/campaign.png',
          ctaLabel: 'JOGAR',
          ctaUrl: 'https://mubloodmoon.com.br'
        },
        isPublic: true,
        status: 'PUBLISHED'
      }
    })

    const res = await (await request()).get('/api/launcher/bootstrap')
    expect(res.body.campaign.enabled).toBe(true)
    expect(res.body.campaign.type).toBe('OPEN_BETA')
    expect(res.body.campaign.title).toBe('OPEN BETA')
  })

  it('socials falls back to the flat legacy URL keys when launcher-social-links is unset', async () => {
    const res = await (await request()).get('/api/launcher/bootstrap')
    expect(Array.isArray(res.body.socials)).toBe(true)
    expect(res.body.socials.length).toBeLessThanOrEqual(5)
    const ids = res.body.socials.map((s: { id: string }) => s.id)
    expect(ids).toEqual(['discord', 'whatsapp', 'instagram', 'youtube', 'x'])
  })

  it('never returns more than MAX_SOCIAL_ITEMS (5) even if the CMS value has more', async () => {
    await prisma.siteSetting.create({
      data: {
        key: 'launcher-social-links',
        category: 'social',
        label: 'Redes sociais',
        value: Array.from({ length: 7 }, (_, i) => ({
          id: `net-${i}`,
          label: `Rede ${i}`,
          url: `https://example.com/${i}`,
          order: i,
          enabled: true
        })),
        isPublic: true,
        status: 'PUBLISHED'
      }
    })

    const res = await (await request()).get('/api/launcher/bootstrap')
    expect(res.body.socials.length).toBe(5)
    expect(res.body.socials[0].id).toBe('net-0')
    expect(res.body.socials[4].id).toBe('net-4')
  })

  it('utilities always returns SUPORTE/SITE/WIKI, enabled only when a URL is configured', async () => {
    const res = await (await request()).get('/api/launcher/bootstrap')
    const ids = res.body.utilities.map((u: { id: string }) => u.id)
    expect(ids).toEqual(['support', 'site', 'wiki'])
    const site = res.body.utilities.find((u: { id: string }) => u.id === 'site')
    expect(site.enabled).toBe(true) // launcher-website-url has a hardcoded fallback
  })

  it('asset manifest entries never expose a local filesystem path, only public URL + hash + size', async () => {
    const source = await prisma.referenceSource.create({
      data: { key: `src-${seed()}`, title: 'Test source', baseUrl: 'https://example.com' }
    })
    const asset = await prisma.referenceAsset.create({
      data: {
        sourceId: source.id,
        localPath: `/var/data/private/${seed()}.webp`,
        publicPath: `https://cdn.example/${seed()}.webp`,
        kind: 'IMAGE',
        mimeType: 'image/webp',
        sha1: 'a'.repeat(40),
        bytes: 12345,
        status: 'PUBLISHED'
      }
    })
    const entry = await prisma.knowledgeEntry.create({
      data: {
        canonicalKey: `news-${seed()}`,
        slug: `news-${seed()}`,
        title: 'Test news with image',
        kind: 'NEWS',
        scope: 'SEASON_6',
        status: 'PUBLISHED',
        summary: 'summary',
        assets: { create: { assetId: asset.id, role: 'reference', sortOrder: 0 } }
      }
    })

    try {
      const res = await (await request()).get('/api/launcher/bootstrap')
      const manifestEntry = res.body.assets.find((a: { id: string }) => a.id === asset.id)
      expect(manifestEntry).toBeDefined()
      expect(manifestEntry.url).toBe(asset.publicPath)
      expect(manifestEntry.hash).toBe(asset.sha1)
      expect(manifestEntry.size).toBe(asset.bytes)
      expect(manifestEntry.contentType).toBe('image/webp')
      expect(manifestEntry.kind).toBe('NEWS_IMAGE')
      const json = JSON.stringify(res.body)
      expect(json).not.toMatch(/var\/data\/private/)
    } finally {
      await prisma.knowledgeEntryAsset.deleteMany({ where: { entryId: entry.id } })
      await prisma.knowledgeEntry.delete({ where: { id: entry.id } })
      await prisma.referenceAsset.delete({ where: { id: asset.id } })
      await prisma.referenceSource.delete({ where: { id: source.id } })
    }
  })

  it('never exposes memb___id, memb_guid, or password fields through the extended bootstrap payload', async () => {
    const res = await (await request()).get('/api/launcher/bootstrap')
    const json = JSON.stringify(res.body)
    expect(json).not.toMatch(/memb___id/i)
    expect(json).not.toMatch(/memb_guid/i)
    expect(json).not.toMatch(/passwordHash/i)
  })
})
