import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Same disposable-database pattern as community-profile.e2e-spec.ts and
// community-media.e2e-spec.ts -- a dedicated, disposable MariaDB container,
// never bloodmoon-mysql, never production.
const CONTAINER = 'bloodmoon-e2e-community-post'

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)

  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
  process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
  process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-test-two-factor-key-at-least-32-characters'

  execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })
}, 120000)

afterAll(() => {
  stopDisposableDatabase(CONTAINER)
})

jest.setTimeout(30000)

describe('Community feed and posts (real data, no mocks)', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server

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

    // The real anti-spam cooldown (30s between posts per account by default,
    // see CommunityPolicy/validateText in community.service.ts) is exactly
    // the kind of thing this suite wants to prove works -- but this spec
    // also needs to create several posts back-to-back from the same account
    // to test pagination. Rather than sleeping 30s+ per post (slow, and
    // still not a real test of the cooldown itself), the cooldown/hourly
    // limit is relaxed on this disposable database only; production's
    // defaults (30s / 10 per hour) are untouched.
    await app.get(PrismaService).communityPolicy.upsert({
      where: { id: 'default' },
      create: {
        postCooldownSeconds: 0,
        commentCooldownSeconds: 0,
        maxPostsPerHour: 999,
        maxCommentsPerHour: 999
      },
      update: {
        postCooldownSeconds: 0,
        commentCooldownSeconds: 0,
        maxPostsPerHour: 999,
        maxCommentsPerHour: 999
      }
    })
  }, 60000)

  afterAll(async () => {
    await app?.close()
  })

  const request = () => import('supertest').then((m) => m.default(httpServer))

  const uniqueSuffix = Date.now().toString(36)
  const userA = {
    name: 'E2E Post Author',
    username: `e2epost_a_${uniqueSuffix}`,
    password: 'e2e-test-password-post-a',
    personalId: '22233344455',
    email: `e2e-post-a-${uniqueSuffix}@example.invalid`
  }
  const userB = {
    name: 'E2E Post Other',
    username: `e2epost_b_${uniqueSuffix}`,
    password: 'e2e-test-password-post-b',
    personalId: '66677788899',
    email: `e2e-post-b-${uniqueSuffix}@example.invalid`
  }
  let tokenA = ''
  let tokenB = ''
  let postId = ''

  it('registers and logs in two real accounts', async () => {
    const req = await request()
    for (const user of [userA, userB]) {
      const res = await req.post('/api/auth/register').send(user)
      expect(res.status).toBe(201)
    }
    const loginA = await (
      await request()
    )
      .post('/api/auth/login')
      .send({ username: userA.username, password: userA.password })
    expect(loginA.status).toBe(201)
    tokenA = loginA.body.accessToken
    const loginB = await (
      await request()
    )
      .post('/api/auth/login')
      .send({ username: userB.username, password: userB.password })
    expect(loginB.status).toBe(201)
    tokenB = loginB.body.accessToken
  })

  it('rejects post creation without authentication (401)', async () => {
    const res = await (
      await request()
    )
      .post('/api/community/posts')
      .send({ type: 'TEXT', content: 'Sem sessao.' })
    expect(res.status).toBe(401)
  })

  it('rejects a post with no content and no media (400)', async () => {
    const res = await (
      await request()
    )
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'TEXT', content: '' })
    expect(res.status).toBe(400)
  })

  it('rejects content shorter than the minimum length (400)', async () => {
    const res = await (
      await request()
    )
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'TEXT', content: 'x' })
    expect(res.status).toBe(400)
  })

  it('rejects content longer than the 10000-character limit (400)', async () => {
    const res = await (
      await request()
    )
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'TEXT', content: 'a'.repeat(10001) })
    expect(res.status).toBe(400)
  })

  it('rejects an ARTICLE post without a title (400)', async () => {
    const res = await (
      await request()
    )
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'ARTICLE', content: 'Conteudo de artigo real.' })
    expect(res.status).toBe(400)
  })

  it('creates a real post (201) and the feed shows it', async () => {
    const create = await (
      await request()
    )
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'TEXT', content: 'Publicacao real do E2E de feed e posts.' })
    expect(create.status).toBe(201)
    expect(typeof create.body.id).toBe('string')
    postId = create.body.id

    const feed = await (
      await request()
    )
      .get('/api/community/feed')
      .query({ feed: 'recent', pageSize: 10 })
    expect(feed.status).toBe(200)
    const found = feed.body.data.find((item: any) => item.id === postId)
    expect(found).toBeTruthy()
    expect(found.content).toBe('Publicacao real do E2E de feed e posts.')
    expect(typeof found.createdAt).toBe('string')
    expect(found._count).toBeTruthy()
  })

  it('opens the post by id (visualizar) via the real permalink endpoint', async () => {
    const res = await (await request()).get(`/api/community/posts/${postId}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(postId)
    expect(res.body.content).toBe('Publicacao real do E2E de feed e posts.')
    expect(res.body.author).toBeTruthy()
    expect(Array.isArray(res.body.media)).toBe(true)
  })

  it('returns 404 for a post id that does not exist', async () => {
    const res = await (
      await request()
    ).get('/api/community/posts/00000000-0000-0000-0000-000000000000')
    expect(res.status).toBe(404)
  })

  it("rejects user B editing user A's post (permissions enforced by the backend, not the UI)", async () => {
    const res = await (
      await request()
    )
      .patch(`/api/community/posts/${postId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ content: 'Tentativa de edicao indevida.' })
    expect(res.status).toBe(404)

    const unchanged = await (await request()).get(`/api/community/posts/${postId}`)
    expect(unchanged.body.content).toBe('Publicacao real do E2E de feed e posts.')
  })

  it("rejects user B deleting user A's post", async () => {
    const res = await (
      await request()
    )
      .delete(`/api/community/posts/${postId}`)
      .set('Authorization', `Bearer ${tokenB}`)
    expect(res.status).toBe(404)

    const stillThere = await (await request()).get(`/api/community/posts/${postId}`)
    expect(stillThere.status).toBe(200)
  })

  it('edits the own post, reloads independently, and confirms persistence', async () => {
    const update = await (
      await request()
    )
      .patch(`/api/community/posts/${postId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ content: 'Publicacao editada pelo proprio autor no E2E.' })
    expect(update.status).toBe(200)
    expect(update.body.edited).toBe(true)

    // Independent GET, not the PATCH response -- proves the edit actually
    // persisted rather than merely being echoed back.
    const reloaded = await (await request()).get(`/api/community/posts/${postId}`)
    expect(reloaded.status).toBe(200)
    expect(reloaded.body.content).toBe('Publicacao editada pelo proprio autor no E2E.')
    expect(reloaded.body.edited).toBe(true)
    expect(typeof reloaded.body.editedAt).toBe('string')
  })

  it('deletes the own post and confirms removal (feed and permalink both stop showing it)', async () => {
    const remove = await (
      await request()
    )
      .delete(`/api/community/posts/${postId}`)
      .set('Authorization', `Bearer ${tokenA}`)
    expect(remove.status).toBe(200)

    const gone = await (await request()).get(`/api/community/posts/${postId}`)
    expect(gone.status).toBe(404)

    const feed = await (
      await request()
    )
      .get('/api/community/feed')
      .query({ feed: 'recent', pageSize: 10 })
    expect(feed.body.data.find((item: any) => item.id === postId)).toBeFalsy()
  })

  it('hides a PRIVATE post permalink from an anonymous viewer but shows it to the author', async () => {
    const create = await (
      await request()
    )
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'TEXT', visibility: 'PRIVATE', content: 'Publicacao privada do E2E.' })
    expect(create.status).toBe(201)
    const privateId = create.body.id

    const anonymous = await (await request()).get(`/api/community/posts/${privateId}`)
    expect(anonymous.status).toBe(404)

    const asAuthor = await (
      await request()
    )
      .get(`/api/community/posts/${privateId}/authenticated`)
      .set('Authorization', `Bearer ${tokenA}`)
    expect(asAuthor.status).toBe(200)
    expect(asAuthor.body.content).toBe('Publicacao privada do E2E.')

    const asOther = await (
      await request()
    )
      .get(`/api/community/posts/${privateId}/authenticated`)
      .set('Authorization', `Bearer ${tokenB}`)
    expect(asOther.status).toBe(404)
  })

  it('paginates the feed with page/pageSize and returns distinct pages', async () => {
    for (let index = 0; index < 5; index += 1) {
      const res = await (
        await request()
      )
        .post('/api/community/posts')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ type: 'TEXT', content: `Publicacao de paginacao numero ${index} do E2E.` })
      expect(res.status).toBe(201)
    }
    const pageOne = await (
      await request()
    )
      .get('/api/community/feed')
      .query({ feed: 'recent', page: 1, pageSize: 2 })
    expect(pageOne.status).toBe(200)
    expect(pageOne.body.data.length).toBe(2)
    expect(pageOne.body.page).toBe(1)
    expect(pageOne.body.totalPages).toBeGreaterThanOrEqual(3)

    const pageTwo = await (
      await request()
    )
      .get('/api/community/feed')
      .query({ feed: 'recent', page: 2, pageSize: 2 })
    expect(pageTwo.status).toBe(200)
    expect(pageTwo.body.page).toBe(2)
    const pageOneIds = pageOne.body.data.map((item: any) => item.id)
    const pageTwoIds = pageTwo.body.data.map((item: any) => item.id)
    expect(pageTwoIds.some((id: string) => pageOneIds.includes(id))).toBe(false)
  })
})
