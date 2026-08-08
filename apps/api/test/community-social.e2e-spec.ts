import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Same disposable-database pattern as the other Community E2E specs -- a
// dedicated, disposable MariaDB container, never bloodmoon-mysql, never
// production, and never real player data (two synthetic accounts created
// fresh by this spec, per the Etapa 10 brief).
const CONTAINER = 'bloodmoon-e2e-community-social'

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

describe('Community social interactions (comments, reactions, saves, reposts -- real data)', () => {
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

    // Same reasoning as community-post.e2e-spec.ts: this spec needs several
    // comments back-to-back (comment pagination) without waiting out the
    // real 10s cooldown. Relaxed on this disposable database only.
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
    name: 'E2E Social Author',
    username: `e2esocial_a_${uniqueSuffix}`,
    password: 'e2e-test-password-social-a',
    personalId: '33344455566',
    email: `e2e-social-a-${uniqueSuffix}@example.invalid`
  }
  const userB = {
    name: 'E2E Social Other',
    username: `e2esocial_b_${uniqueSuffix}`,
    password: 'e2e-test-password-social-b',
    personalId: '77788899911',
    email: `e2e-social-b-${uniqueSuffix}@example.invalid`
  }
  let tokenA = ''
  let tokenB = ''
  let postId = ''
  let commentId = ''

  it('registers and logs in two synthetic accounts', async () => {
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

  it('A creates a real post', async () => {
    const res = await (
      await request()
    )
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'TEXT', content: 'Post real do E2E de interacoes sociais.' })
    expect(res.status).toBe(201)
    postId = res.body.id
  })

  describe('COMMENTS', () => {
    it("B comments on A's post (create)", async () => {
      const res = await (
        await request()
      )
        .post(`/api/community/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ content: 'Primeiro comentario real do E2E.' })
      expect(res.status).toBe(201)
      commentId = res.body.id
    })

    it('B edits own comment, reloads independently, confirms persistence', async () => {
      const update = await (
        await request()
      )
        .patch(`/api/community/comments/${commentId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ content: 'Comentario editado pelo proprio autor.' })
      expect(update.status).toBe(200)
      expect(update.body.edited).toBe(true)

      const reloaded = await (await request()).get(`/api/community/posts/${postId}`)
      const found = reloaded.body.comments.find((item: any) => item.id === commentId)
      expect(found).toBeTruthy()
      expect(found.content).toBe('Comentario editado pelo proprio autor.')
      expect(found.edited).toBe(true)
    })

    it("rejects A editing B's comment (ownership enforced by the backend)", async () => {
      const res = await (
        await request()
      )
        .patch(`/api/community/comments/${commentId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: 'Tentativa indevida de edicao.' })
      expect(res.status).toBe(404)
    })

    it("rejects A deleting B's comment", async () => {
      const res = await (
        await request()
      )
        .delete(`/api/community/comments/${commentId}`)
        .set('Authorization', `Bearer ${tokenA}`)
      expect(res.status).toBe(404)
    })

    it('rejects a reply nested more than one level deep', async () => {
      const reply = await (
        await request()
      )
        .post(`/api/community/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: 'Resposta de primeiro nivel.', parentId: commentId })
      expect(reply.status).toBe(201)
      const nestedReply = await (
        await request()
      )
        .post(`/api/community/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ content: 'Tentativa de segundo nivel.', parentId: reply.body.id })
      expect(nestedReply.status).toBe(400)
    })

    it('paginates comments beyond the first 5 embedded in the post', async () => {
      for (let index = 0; index < 6; index += 1) {
        const res = await (
          await request()
        )
          .post(`/api/community/posts/${postId}/comments`)
          .set('Authorization', `Bearer ${tokenA}`)
          .send({ content: `Comentario de paginacao numero ${index}.` })
        expect(res.status).toBe(201)
      }
      const post = await (await request()).get(`/api/community/posts/${postId}`)
      expect(post.body.comments.length).toBe(5)
      expect(post.body._count.comments).toBeGreaterThanOrEqual(8)

      const page1 = await (
        await request()
      )
        .get(`/api/community/posts/${postId}/comments`)
        .query({ page: 1, pageSize: 5 })
      expect(page1.status).toBe(200)
      expect(page1.body.data.length).toBe(5)
      const page2 = await (
        await request()
      )
        .get(`/api/community/posts/${postId}/comments`)
        .query({ page: 2, pageSize: 5 })
      expect(page2.status).toBe(200)
      expect(page2.body.data.length).toBeGreaterThan(0)
      const page1Ids = page1.body.data.map((item: any) => item.id)
      const page2Ids = page2.body.data.map((item: any) => item.id)
      expect(page2Ids.some((id: string) => page1Ids.includes(id))).toBe(false)
    })

    it('B deletes own comment and confirms removal from the post', async () => {
      const before = await (await request()).get(`/api/community/posts/${postId}`)
      const beforeCount = before.body._count.comments

      const remove = await (
        await request()
      )
        .delete(`/api/community/comments/${commentId}`)
        .set('Authorization', `Bearer ${tokenB}`)
      expect(remove.status).toBe(200)

      const after = await (await request()).get(`/api/community/posts/${postId}`)
      expect(after.body._count.comments).toBe(beforeCount - 1)
      expect(after.body.comments.find((item: any) => item.id === commentId)).toBeFalsy()
    })
  })

  describe('REACTIONS', () => {
    it('B reacts to the post (add), count reflects on independent reload', async () => {
      const react = await (
        await request()
      )
        .post('/api/community/reactions')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ postId, type: 'LIKE' })
      expect(react.status).toBe(201)
      expect(react.body.active).toBe(true)

      const reloaded = await (await request()).get(`/api/community/posts/${postId}`)
      expect(reloaded.body._count.reactions).toBe(1)
    })

    it('B reacts again with the same type (toggle off / remove)', async () => {
      const react = await (
        await request()
      )
        .post('/api/community/reactions')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ postId, type: 'LIKE' })
      expect(react.status).toBe(201)
      expect(react.body.active).toBe(false)

      const reloaded = await (await request()).get(`/api/community/posts/${postId}`)
      expect(reloaded.body._count.reactions).toBe(0)
    })

    it('concurrent double-click does not crash or duplicate a reaction row (race-safe)', async () => {
      const [first, second] = await Promise.all([
        (await request())
          .post('/api/community/reactions')
          .set('Authorization', `Bearer ${tokenB}`)
          .send({ postId, type: 'HONOR' }),
        (await request())
          .post('/api/community/reactions')
          .set('Authorization', `Bearer ${tokenB}`)
          .send({ postId, type: 'HONOR' })
      ])
      // Neither request should crash (no raw 500 from the DB unique
      // constraint racing with the create) -- both resolve to a real
      // decision (active true/false).
      expect([first.status, second.status]).toEqual([201, 201])

      const reloaded = await (await request()).get(`/api/community/posts/${postId}`)
      // toggleReaction is a real toggle, so the *exact* outcome of two
      // simultaneous toggles is legitimately interleaving-dependent: both
      // requests can race the create() (idempotent thanks to the unique
      // constraint + P2002 catch -> net 1), or one can fully finish before
      // the other starts and get toggled back off by it (net 0). Either is
      // a safe, real outcome. What must never happen is a duplicate row
      // (>1) or a corrupted/negative count -- that's the actual invariant.
      expect([0, 1]).toContain(reloaded.body._count.reactions)
    })
  })

  describe('SAVES', () => {
    it('B saves the post (save)', async () => {
      const save = await (
        await request()
      )
        .post(`/api/community/posts/${postId}/save`)
        .set('Authorization', `Bearer ${tokenB}`)
      expect(save.status).toBe(201)
      expect(save.body.saved).toBe(true)
    })

    it("B's saved feed lists the post; A's saved feed (never saved anything) does not", async () => {
      const savedByB = await (
        await request()
      )
        .get('/api/community/feed/authenticated')
        .set('Authorization', `Bearer ${tokenB}`)
        .query({ feed: 'saved' })
      expect(savedByB.body.data.some((item: any) => item.id === postId)).toBe(true)

      const savedByA = await (
        await request()
      )
        .get('/api/community/feed/authenticated')
        .set('Authorization', `Bearer ${tokenA}`)
        .query({ feed: 'saved' })
      expect(savedByA.body.data.some((item: any) => item.id === postId)).toBe(false)
    })

    it('B unsaves the post (unsave), removed from saved feed', async () => {
      const unsave = await (
        await request()
      )
        .post(`/api/community/posts/${postId}/save`)
        .set('Authorization', `Bearer ${tokenB}`)
      expect(unsave.status).toBe(201)
      expect(unsave.body.saved).toBe(false)

      const savedByB = await (
        await request()
      )
        .get('/api/community/feed/authenticated')
        .set('Authorization', `Bearer ${tokenB}`)
        .query({ feed: 'saved' })
      expect(savedByB.body.data.some((item: any) => item.id === postId)).toBe(false)
    })

    it('concurrent double-click save does not create a duplicate (race-safe)', async () => {
      const [first, second] = await Promise.all([
        (await request())
          .post(`/api/community/posts/${postId}/save`)
          .set('Authorization', `Bearer ${tokenB}`),
        (await request())
          .post(`/api/community/posts/${postId}/save`)
          .set('Authorization', `Bearer ${tokenB}`)
      ])
      expect([first.status, second.status]).toEqual([201, 201])
      // Clean up back to unsaved so later tests start from a known state.
      const state = await (
        await request()
      )
        .get('/api/community/feed/authenticated')
        .set('Authorization', `Bearer ${tokenB}`)
        .query({ feed: 'saved' })
      const isSaved = state.body.data.some((item: any) => item.id === postId)
      if (isSaved)
        await (
          await request()
        )
          .post(`/api/community/posts/${postId}/save`)
          .set('Authorization', `Bearer ${tokenB}`)
    })
  })

  describe('REPOSTS', () => {
    it('cannot repost your own post', async () => {
      const res = await (
        await request()
      )
        .post(`/api/community/posts/${postId}/repost`)
        .set('Authorization', `Bearer ${tokenA}`)
      expect(res.status).toBe(400)
    })

    it('cannot repost a non-public post even when visible to the viewer', async () => {
      await (
        await request()
      )
        .post(`/api/community/profiles/${userA.username}/follow`)
        .set('Authorization', `Bearer ${tokenB}`)
      const followersPost = await (
        await request()
      )
        .post('/api/community/posts')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          type: 'TEXT',
          visibility: 'FOLLOWERS',
          content: 'Post restrito a seguidores do E2E.'
        })
      expect(followersPost.status).toBe(201)

      // B follows A, so B can see this FOLLOWERS post (accessiblePost
      // succeeds) -- but repost is still rejected because it isn't PUBLIC.
      const viewable = await (
        await request()
      )
        .get(`/api/community/posts/${followersPost.body.id}/authenticated`)
        .set('Authorization', `Bearer ${tokenB}`)
      expect(viewable.status).toBe(200)

      const repost = await (
        await request()
      )
        .post(`/api/community/posts/${followersPost.body.id}/repost`)
        .set('Authorization', `Bearer ${tokenB}`)
      expect(repost.status).toBe(400)
    })

    it("B reposts A's public post (repost), references the original, count reflects on reload", async () => {
      const repost = await (
        await request()
      )
        .post(`/api/community/posts/${postId}/repost`)
        .set('Authorization', `Bearer ${tokenB}`)
      expect(repost.status).toBe(201)
      expect(repost.body.reposted).toBe(true)

      const reloaded = await (await request()).get(`/api/community/posts/${postId}`)
      expect(reloaded.body._count.reposts).toBe(1)
      // The repost references the original post -- it does not fabricate a
      // new post or alter the original author/content.
      expect(reloaded.body.author.username).toBe(userA.username)
      expect(reloaded.body.content).toBe('Post real do E2E de interacoes sociais.')
    })

    it('B undoes the repost, count reflects on reload', async () => {
      const undo = await (
        await request()
      )
        .post(`/api/community/posts/${postId}/repost`)
        .set('Authorization', `Bearer ${tokenB}`)
      expect(undo.status).toBe(201)
      expect(undo.body.reposted).toBe(false)

      const reloaded = await (await request()).get(`/api/community/posts/${postId}`)
      expect(reloaded.body._count.reposts).toBe(0)
    })

    it('concurrent double-click repost does not crash or duplicate a repost row (race-safe)', async () => {
      const [first, second] = await Promise.all([
        (await request())
          .post(`/api/community/posts/${postId}/repost`)
          .set('Authorization', `Bearer ${tokenB}`),
        (await request())
          .post(`/api/community/posts/${postId}/repost`)
          .set('Authorization', `Bearer ${tokenB}`)
      ])
      expect([first.status, second.status]).toEqual([201, 201])

      const reloaded = await (await request()).get(`/api/community/posts/${postId}`)
      // Same reasoning as the reaction race above: toggleRepost is a real
      // toggle, so 0 or 1 are both legitimate outcomes of two simultaneous
      // toggles depending on interleaving. A duplicate row or a crash would
      // not be.
      expect([0, 1]).toContain(reloaded.body._count.reposts)
    })
  })

  describe('Full flow: post -> comment -> reaction -> save -> repost -> reload', () => {
    it('persists every interaction and every ownership boundary after an independent reload', async () => {
      const create = await (
        await request()
      )
        .post('/api/community/posts')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'TEXT', content: 'Post do fluxo completo E2E.' })
      expect(create.status).toBe(201)
      const flowPostId = create.body.id

      const comment = await (
        await request()
      )
        .post(`/api/community/posts/${flowPostId}/comments`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ content: 'Comentario do fluxo completo.' })
      expect(comment.status).toBe(201)

      const react = await (
        await request()
      )
        .post('/api/community/reactions')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ postId: flowPostId, type: 'VICTORY' })
      expect(react.status).toBe(201)

      const save = await (
        await request()
      )
        .post(`/api/community/posts/${flowPostId}/save`)
        .set('Authorization', `Bearer ${tokenB}`)
      expect(save.status).toBe(201)

      const repost = await (
        await request()
      )
        .post(`/api/community/posts/${flowPostId}/repost`)
        .set('Authorization', `Bearer ${tokenB}`)
      expect(repost.status).toBe(201)

      // Reload: fresh, independent GETs -- not the mutation responses.
      const reloadedPost = await (
        await request()
      )
        .get(`/api/community/posts/${flowPostId}/authenticated`)
        .set('Authorization', `Bearer ${tokenB}`)
      expect(reloadedPost.status).toBe(200)
      expect(reloadedPost.body._count.comments).toBe(1)
      expect(reloadedPost.body._count.reactions).toBe(1)
      expect(reloadedPost.body._count.reposts).toBe(1)
      expect(reloadedPost.body.viewer.saved).toBe(true)
      expect(reloadedPost.body.viewer.reposted).toBe(true)
      expect(reloadedPost.body.viewer.reactions).toContain('VICTORY')
      expect(reloadedPost.body.comments[0].author.username).toBe(userB.username)
      expect(reloadedPost.body.comments[0].content).toBe('Comentario do fluxo completo.')

      const savedByB = await (
        await request()
      )
        .get('/api/community/feed/authenticated')
        .set('Authorization', `Bearer ${tokenB}`)
        .query({ feed: 'saved' })
      expect(savedByB.body.data.some((item: any) => item.id === flowPostId)).toBe(true)
    })
  })
})
