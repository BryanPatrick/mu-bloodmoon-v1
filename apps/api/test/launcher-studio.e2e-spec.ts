import { randomUUID } from 'node:crypto'
import { generate as generateTotp } from 'otplib'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Launcher CMS Studio phase. Covers: slot-registry validation (type,
// maxLength, ORDERED_LIST maxItems, unknown asset reference rejected),
// draft never leaking into the public read path before publish, publish
// incrementing contentVersion, rollback restoring a prior published value
// as a new forward-moving version, RBAC (GM must not inherit, ADMIN needs
// explicit delegation, SUPER_ADMIN wildcard), the additive KnowledgeEntry
// Launcher fields round-tripping through the existing admin-content CRUD,
// and Part W's purchase-terms backend enforcement.
const CONTAINER = 'bloodmoon-e2e-launcher-studio'

describe('Launcher CMS Studio', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let twoFactor: import('../src/modules/auth/two-factor.service').TwoFactorService

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
    process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
    process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-test-two-factor-key-at-least-32-characters'
    // This suite registers many more accounts than the default abuse-guard
    // register/ip limit (10 per hour) allows -- raise it via the same env
    // override auth-rate-limit.service.ts already reads, rather than
    // weakening the real default anywhere else.
    process.env.AUTH_RATE_REGISTER_IP_LIMIT = '100'
    process.env.AUTH_RATE_LOGIN_IP_LIMIT = '200'

    const { execSync } = await import('node:child_process')
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { TwoFactorService } = await import('../src/modules/auth/two-factor.service')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    await app.init()
    prisma = moduleRef.get(PrismaService)
    twoFactor = moduleRef.get(TwoFactorService)
  }, 120_000)

  afterAll(async () => {
    // bloodmoon_local_claude persists across runs -- StorePurchaseTerms is
    // new this phase and nothing else depends on it surviving, so clear
    // only the rows this file creates (title prefix below) to keep the
    // "no terms configured yet" test re-runnable, matching the project
    // convention documented in launcher-remote-content-contract.e2e-spec.ts.
    if (prisma) {
      await prisma.storePurchaseTerms.deleteMany({ where: { title: { startsWith: 'Termos ' } } })
    }
    delete process.env.AUTH_RATE_REGISTER_IP_LIMIT
    delete process.env.AUTH_RATE_LOGIN_IP_LIMIT
    await app?.close()
    stopDisposableDatabase(CONTAINER)
  })

  const request = () => import('supertest').then((m) => m.default(app.getHttpServer()))
  const seed = () => randomUUID().slice(0, 8)

  function registerPayload() {
    const s = seed()
    return {
      name: 'Launcher Studio Test',
      username: `lstudio${s}`,
      email: `lstudio-${s}@example.test`,
      password: 'a-fine-password-1',
      personalId: '12345678900'
    }
  }

  async function registerLoginAs(role: 'PLAYER' | 'GM' | 'ADMIN' | 'SUPER_ADMIN', permissions: string[] = []) {
    const payload = registerPayload()
    const registered = await (await request()).post('/api/auth/register').send(payload)
    expect(registered.status).toBe(201)

    let totpCode: string | undefined
    if (role !== 'PLAYER') {
      const secret = twoFactor.generateSecret()
      await prisma.account.update({
        where: { id: registered.body.id },
        data: { role, twoFactorEnabled: true, twoFactorSecret: twoFactor.encrypt(secret) }
      })
      totpCode = await generateTotp({ secret })
    }
    if (permissions.length > 0) {
      await prisma.accountPermission.createMany({
        data: permissions.map((key) => ({ accountId: registered.body.id, key, granted: true }))
      })
    }
    const login = await (await request())
      .post('/api/auth/login')
      .send({ username: payload.username, password: payload.password, totpCode })
    expect(login.status).toBe(201)
    return { accountId: registered.body.id as string, accessToken: login.body.accessToken as string }
  }

  const ADMIN_PERMS = [
    'admin.launcher.content.read',
    'admin.launcher.content.edit',
    'admin.launcher.content.publish',
    'admin.launcher.assets.manage'
  ]

  const TINY_PNG_DATA_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

  // ---- RBAC -------------------------------------------------------------

  describe('RBAC', () => {
    it('rejects an unauthenticated caller', async () => {
      const res = await (await request()).get('/api/admin/launcher-studio/registry')
      expect(res.status).toBe(401)
    })

    it('PLAYER is denied by role', async () => {
      const { accessToken } = await registerLoginAs('PLAYER')
      const res = await (await request()).get('/api/admin/launcher-studio/registry').set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(403)
    })

    it('GM is denied -- does not inherit admin.launcher.* access', async () => {
      const { accessToken } = await registerLoginAs('GM')
      const res = await (await request()).get('/api/admin/launcher-studio/registry').set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(403)
    })

    it('ADMIN without delegated permission is denied', async () => {
      const { accessToken } = await registerLoginAs('ADMIN', [])
      const res = await (await request()).get('/api/admin/launcher-studio/registry').set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(403)
    })

    it('ADMIN with the delegated permission can read the registry', async () => {
      const { accessToken } = await registerLoginAs('ADMIN', ['admin.launcher.content.read'])
      const res = await (await request()).get('/api/admin/launcher-studio/registry').set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('read permission alone cannot edit a slot', async () => {
      const { accessToken } = await registerLoginAs('ADMIN', ['admin.launcher.content.read'])
      const res = await (await request())
        .patch('/api/admin/launcher-studio/slots/home.hero.title')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: 'Hello' })
      expect(res.status).toBe(403)
    })

    it('SUPER_ADMIN can access without explicit delegation', async () => {
      const { accessToken } = await registerLoginAs('SUPER_ADMIN')
      const res = await (await request()).get('/api/admin/launcher-studio/registry').set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(200)
    })
  })

  // ---- Slot validation ----------------------------------------------------

  describe('slot validation', () => {
    it('rejects an unknown slot id', async () => {
      const { accessToken } = await registerLoginAs('ADMIN', ADMIN_PERMS)
      const res = await (await request())
        .patch('/api/admin/launcher-studio/slots/home.doesNotExist')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: 'x' })
      expect(res.status).toBe(404)
    })

    it('rejects a TEXT value exceeding maxLength', async () => {
      const { accessToken } = await registerLoginAs('ADMIN', ADMIN_PERMS)
      const res = await (await request())
        .patch('/api/admin/launcher-studio/slots/home.hero.title')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: 'x'.repeat(500) })
      expect(res.status).toBe(400)
    })

    it('rejects a LINK value that is not a valid http(s) URL', async () => {
      const { accessToken } = await registerLoginAs('ADMIN', ADMIN_PERMS)
      const res = await (await request())
        .patch('/api/admin/launcher-studio/slots/home.hero.ctaUrl')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: 'javascript:alert(1)' })
      expect(res.status).toBe(400)
    })

    it('rejects an unrecognized visual token axis or value', async () => {
      const { accessToken } = await registerLoginAs('ADMIN', ADMIN_PERMS)
      const res = await (await request())
        .patch('/api/admin/launcher-studio/slots/home.hero.title')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: 'Hero title', tokens: { textColorToken: 'not-a-real-token' } })
      expect(res.status).toBe(400)
    })

    it('enforces ORDERED_LIST maxItems (socials capped at 5)', async () => {
      const { accessToken } = await registerLoginAs('ADMIN', ADMIN_PERMS)
      const items = Array.from({ length: 6 }, (_, i) => ({
        id: `s${i}`,
        label: `Social ${i}`,
        url: 'https://example.com',
        iconAssetId: null,
        enabled: true
      }))
      const res = await (await request())
        .patch('/api/admin/launcher-studio/slots/home.socials')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: items })
      expect(res.status).toBe(400)
    })

    it('rejects an IMAGE slot value referencing a non-existent asset', async () => {
      const { accessToken } = await registerLoginAs('ADMIN', ADMIN_PERMS)
      const res = await (await request())
        .patch('/api/admin/launcher-studio/slots/home.hero.image')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: 'not-a-real-asset-id' })
      expect(res.status).toBe(400)
    })

    it('accepts an IMAGE slot value referencing a real uploaded asset', async () => {
      const { accessToken } = await registerLoginAs('ADMIN', ADMIN_PERMS)
      const upload = await (await request())
        .post('/api/admin/launcher-studio/assets/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Hero test image', category: 'CAMPAIGNS', dataUrl: TINY_PNG_DATA_URL })
      expect(upload.status).toBe(201)
      expect(upload.body.id).toBeTruthy()

      const res = await (await request())
        .patch('/api/admin/launcher-studio/slots/home.hero.image')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: upload.body.id })
      expect(res.status).toBe(200)
      // DRAFT if this row's published value differs, PUBLISHED if a prior
      // run already published this exact asset id (dedupe makes repeat
      // runs converge on the same asset) -- either is a correct outcome;
      // what matters is the write was accepted, not rejected.
      expect(['DRAFT', 'PUBLISHED']).toContain(res.body.status)
      expect(res.body.value).toBe(upload.body.id)
    })
  })

  // ---- Draft / publish / rollback -----------------------------------------

  describe('draft, publish, rollback', () => {
    it('a draft update never appears on the public read path before publish', async () => {
      const { accessToken } = await registerLoginAs('ADMIN', ADMIN_PERMS)
      const marker = `Draft only ${seed()}`
      await (await request())
        .patch('/api/admin/launcher-studio/slots/home.hero.subtitle')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: marker })

      const publicRead = await (await request()).get('/api/launcher/content?page=HOME')
      const slot = publicRead.body.slots.find((s: { id: string }) => s.id === 'home.hero.subtitle')
      expect(slot.value).not.toBe(marker)
    })

    it('publish moves the draft value onto the public read path and increments contentVersion', async () => {
      const { accessToken } = await registerLoginAs('ADMIN', ADMIN_PERMS)
      const before = await (await request()).get('/api/launcher/content?page=HOME')

      const marker = `Published ${seed()}`
      await (await request())
        .patch('/api/admin/launcher-studio/slots/home.hero.subtitle')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: marker })

      const publish = await (await request())
        .post('/api/admin/launcher-studio/publish')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ note: 'e2e publish' })
      expect(publish.status).toBe(201)
      expect(typeof publish.body.version).toBe('number')

      const after = await (await request()).get('/api/launcher/content?page=HOME')
      const slot = after.body.slots.find((s: { id: string }) => s.id === 'home.hero.subtitle')
      expect(slot.value).toBe(marker)
      expect(after.body.contentVersion).toBeGreaterThan(before.body.contentVersion)
    })

    it('rollback restores a prior published value as a new, forward-moving version (history is never destroyed)', async () => {
      const { accessToken } = await registerLoginAs('ADMIN', ADMIN_PERMS)

      const first = `First value ${seed()}`
      await (await request())
        .patch('/api/admin/launcher-studio/slots/home.campaign.title')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: first })
      const publish1 = await (await request())
        .post('/api/admin/launcher-studio/publish')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
      expect(publish1.status).toBe(201)
      const versionWithFirst = publish1.body.version as number

      const second = `Second value ${seed()}`
      await (await request())
        .patch('/api/admin/launcher-studio/slots/home.campaign.title')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: second })
      const publish2 = await (await request())
        .post('/api/admin/launcher-studio/publish')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
      expect(publish2.status).toBe(201)
      expect(publish2.body.version).toBeGreaterThan(versionWithFirst)

      const rollback = await (await request())
        .post('/api/admin/launcher-studio/rollback')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ version: versionWithFirst })
      expect(rollback.status).toBe(201)
      // Rollback is itself a NEW version, strictly after publish2 -- never a
      // rewrite of publish1/publish2's own history.
      expect(rollback.body.version).toBeGreaterThan(publish2.body.version)
      expect(rollback.body.kind).toBe('ROLLBACK')

      const content = await (await request()).get('/api/launcher/content?page=HOME')
      const slot = content.body.slots.find((s: { id: string }) => s.id === 'home.campaign.title')
      expect(slot.value).toBe(first)

      const history = await (await request())
        .get('/api/admin/launcher-studio/publish-history')
        .set('Authorization', `Bearer ${accessToken}`)
      const versions = history.body.map((h: { version: number }) => h.version)
      expect(versions).toContain(versionWithFirst)
      expect(versions).toContain(publish2.body.version)
      expect(versions).toContain(rollback.body.version)
    })

    it('publish with no pending draft changes is rejected', async () => {
      const { accessToken } = await registerLoginAs('ADMIN', ADMIN_PERMS)
      // Publishing immediately, before making any change in this fresh
      // account context, still may have global pending changes from other
      // tests in this shared DB -- so instead assert idempotency: publish
      // twice in a row with no edit in between the second time.
      await (await request())
        .patch('/api/admin/launcher-studio/slots/home.hero.title')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: `Idempotency check ${seed()}` })
      const first = await (await request())
        .post('/api/admin/launcher-studio/publish')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
      expect(first.status).toBe(201)

      const second = await (await request())
        .post('/api/admin/launcher-studio/publish')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
      expect(second.status).toBe(400)
    })
  })

  // ---- News/Event additive fields (reuse of KnowledgeEntry) ---------------

  describe('News/Event additive fields on KnowledgeEntry', () => {
    it('round-trips the new Launcher fields through the existing admin-content CRUD', async () => {
      const { accessToken } = await registerLoginAs('ADMIN', ['admin.content.manage'])
      const created = await (await request())
        .post('/api/admin/content/entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: `Evento de teste ${seed()}`,
          kind: 'EVENT',
          scope: 'SEASON_6',
          status: 'PUBLISHED',
          launcherEnabled: true,
          launcherSummary: 'Resumo curto para o launcher',
          eventStartsAt: '2026-09-01T20:00:00.000Z',
          eventEndsAt: '2026-09-01T22:00:00.000Z',
          recommendedLevel: '380+',
          calendarEnabled: true
        })
      expect(created.status).toBe(201)
      expect(created.body.launcherEnabled).toBe(true)
      expect(created.body.launcherSummary).toBe('Resumo curto para o launcher')
      expect(created.body.calendarEnabled).toBe(true)
      expect(new Date(created.body.eventStartsAt).toISOString()).toBe('2026-09-01T20:00:00.000Z')
    })

    it('existing entries without the new fields keep safe defaults', async () => {
      const { accessToken } = await registerLoginAs('ADMIN', ['admin.content.manage'])
      const created = await (await request())
        .post('/api/admin/content/entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: `Sem campos novos ${seed()}` })
      expect(created.status).toBe(201)
      expect(created.body.launcherEnabled).toBe(false)
      expect(created.body.calendarEnabled).toBe(false)
      expect(created.body.launcherSummary).toBeNull()
    })
  })

  // ---- Store purchase terms (Part V/W) -------------------------------------

  describe('Store purchase terms enforcement', () => {
    it('is a no-op (backward compatible) until an operator creates a terms version', async () => {
      const { accessToken } = await registerLoginAs('PLAYER')
      const res = await (await request())
        .post('/api/shop/purchases')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ productId: 'not-a-real-product-id' })
      // No StorePurchaseTerms exists yet in a fresh flow -- the terms gate
      // must not fire; the request fails for the pre-existing reason
      // (product not found), not "must accept Purchase Terms".
      expect(res.status).toBe(404)
    })

    it('once a terms version is active, a purchase without a matching termsVersion is rejected', async () => {
      const { accessToken: adminToken } = await registerLoginAs('ADMIN', ['admin.launcher.content.publish', 'admin.launcher.content.read'])
      const terms = await (await request())
        .post('/api/admin/launcher-studio/terms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: `Termos ${seed()}`, content: 'Conteudo dos termos de compra.' })
      expect(terms.status).toBe(201)
      expect(terms.body.active).toBe(true)

      const { accessToken: playerToken } = await registerLoginAs('PLAYER')
      const res = await (await request())
        .post('/api/shop/purchases')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ productId: 'still-not-a-real-product-id' })
      expect(res.status).toBe(400)
      expect(JSON.stringify(res.body)).toMatch(/Purchase Terms/i)
    })
  })
})
