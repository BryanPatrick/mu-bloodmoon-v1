import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Same disposable-database pattern as the other Community E2E specs -- a
// dedicated, disposable MariaDB container, never bloodmoon-mysql, never
// production, and never real player data. Also needs an isolated
// COMMUNITY_MEDIA_DIR (same reasoning as community-media.e2e-spec.ts) for
// the malicious-upload-evidence test below.
const CONTAINER = 'bloodmoon-e2e-community-moderation'
let mediaDir = ''

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  mediaDir = mkdtempSync(join(tmpdir(), 'bloodmoon-e2e-moderation-'))

  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
  process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
  process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-test-two-factor-key-at-least-32-characters'
  process.env.COMMUNITY_MEDIA_DIR = mediaDir
  process.env.MEDIA_QUARANTINE_DIR = join(mediaDir, 'quarantine')
  process.env.MEDIA_REMOVED_DIR = join(mediaDir, 'removed')

  execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })
}, 120000)

afterAll(() => {
  stopDisposableDatabase(CONTAINER)
  try {
    rmSync(mediaDir, { recursive: true, force: true })
  } catch {
    /* best effort cleanup */
  }
})

jest.setTimeout(30000)

describe('Community moderation, reports, sanctions, and audit (real data, no parallel system)', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const { PrismaService } = await import('../src/database/prisma.service')
    const express = (await import('express')).default

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    // Same reasoning as community-media.e2e-spec.ts: Test.createTestingModule
    // never runs main.ts's bootstrap(), so the static mount that serves
    // /api/media/community/* is otherwise absent here -- needed below to
    // prove a moderated post's media actually stops/resumes being servable.
    app.use('/api/media/community', express.static(mediaDir, { dotfiles: 'deny', index: false, fallthrough: false, maxAge: '7d' }))
    await app.init()
    httpServer = app.getHttpServer()
    prisma = app.get(PrismaService)

    // Same cooldown relaxation as Etapa 9/10's specs -- irrelevant to this
    // spec's own assertions, kept only so post/report creation isn't
    // accidentally rate-limited while the suite runs.
    await prisma.communityPolicy.upsert({
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
    name: 'E2E Mod Author',
    username: `e2emod_a_${uniqueSuffix}`,
    password: 'e2e-test-password-mod-a',
    personalId: '11122233399',
    email: `e2e-mod-a-${uniqueSuffix}@example.invalid`
  }
  const userB = {
    name: 'E2E Mod Reporter',
    username: `e2emod_b_${uniqueSuffix}`,
    password: 'e2e-test-password-mod-b',
    personalId: '55566677744',
    email: `e2e-mod-b-${uniqueSuffix}@example.invalid`
  }
  const userC = {
    name: 'E2E Mod Moderator',
    username: `e2emod_c_${uniqueSuffix}`,
    password: 'e2e-test-password-mod-c',
    personalId: '99988877766',
    email: `e2e-mod-c-${uniqueSuffix}@example.invalid`
  }
  let tokenA = ''
  let tokenB = ''
  let tokenC = ''
  let postId = ''
  let reportId = ''

  it('registers three synthetic accounts; C is promoted to SUPER_ADMIN directly in the disposable DB (no self-service promotion exists, by design)', async () => {
    const req = await request()
    for (const user of [userA, userB, userC]) {
      const res = await req.post('/api/auth/register').send(user)
      expect(res.status).toBe(201)
    }
    const loginA = await (
      await request()
    )
      .post('/api/auth/login')
      .send({ username: userA.username, password: userA.password })
    tokenA = loginA.body.accessToken
    const loginB = await (
      await request()
    )
      .post('/api/auth/login')
      .send({ username: userB.username, password: userB.password })
    tokenB = loginB.body.accessToken

    await prisma.account.update({
      where: { username: userC.username },
      data: { role: 'SUPER_ADMIN' }
    })
    const loginC = await (
      await request()
    )
      .post('/api/auth/login')
      .send({ username: userC.username, password: userC.password })
    expect(loginC.status).toBe(201)
    tokenC = loginC.body.accessToken
    // 2FA is mandatory for any non-PLAYER role reaching a role-gated route.
    // Flip it on after login so the already-issued token keeps working.
    await prisma.account.update({ where: { username: userC.username }, data: { twoFactorEnabled: true } })
  })

  it('rejects a plain user hitting an admin endpoint -- unauthenticated (401) and authenticated non-admin (403)', async () => {
    const anon = await (await request()).get('/api/admin/community/reports')
    expect(anon.status).toBe(401)

    const asPlayer = await (
      await request()
    )
      .get('/api/admin/community/reports')
      .set('Authorization', `Bearer ${tokenB}`)
    expect(asPlayer.status).toBe(403)

    const actionAsPlayer = await (
      await request()
    )
      .post('/api/admin/community/posts/00000000-0000-0000-0000-000000000000/actions')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ action: 'HIDE', reason: 'tentativa indevida' })
    expect(actionAsPlayer.status).toBe(403)
  })

  it('A publishes a post', async () => {
    const res = await (
      await request()
    )
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'TEXT', content: 'Post real de A que sera denunciado no E2E de moderacao.' })
    expect(res.status).toBe(201)
    postId = res.body.id
  })

  describe('REPORT FLOW: usuario -> denuncia -> motivo -> registro -> fila -> acao', () => {
    it('B reports the post with a reason (registro)', async () => {
      const res = await (
        await request()
      )
        .post('/api/community/reports')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ postId, reason: 'Conteudo ofensivo real reportado no E2E.' })
      expect(res.status).toBe(201)
      expect(res.body.status).toBe('NEW')
      reportId = res.body.id
    })

    it('rejects a report with no reason (400)', async () => {
      const res = await (
        await request()
      )
        .post('/api/community/reports')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ postId })
      expect(res.status).toBe(400)
    })

    it('rejects a duplicate abusive report while the first is still open', async () => {
      const res = await (
        await request()
      )
        .post('/api/community/reports')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ postId, reason: 'Segunda tentativa de denunciar o mesmo conteudo.' })
      expect(res.status).toBe(400)
    })

    it('rejects the author reporting their own post', async () => {
      const res = await (
        await request()
      )
        .post('/api/community/reports')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ postId, reason: 'Auto-denuncia nao deveria ser permitida.' })
      expect(res.status).toBe(400)
    })

    it('moderator (fila administrativa) sees the report in the queue', async () => {
      const res = await (
        await request()
      )
        .get('/api/admin/community/reports')
        .set('Authorization', `Bearer ${tokenC}`)
        .query({ status: 'NEW' })
      expect(res.status).toBe(200)
      const found = res.body.data.find((item: any) => item.id === reportId)
      expect(found).toBeTruthy()
      expect(found.post.id).toBe(postId)
      expect(found.reporter.username).toBe(userB.username)
    })

    it('moderator acts on the content: hides the post (acao)', async () => {
      const res = await (
        await request()
      )
        .post(`/api/admin/community/posts/${postId}/actions`)
        .set('Authorization', `Bearer ${tokenC}`)
        .send({ action: 'HIDE', reason: 'Conteudo violou as diretrizes da comunidade -- E2E.' })
      expect(res.status).toBe(201)
      expect(res.body.status).toBe('HIDDEN')
      expect(res.body.hiddenBy).toBe(await prismaAccountId(prisma, userC.username))
    })

    it('the hidden post no longer appears in the public feed', async () => {
      const feed = await (
        await request()
      )
        .get('/api/community/feed')
        .query({ feed: 'recent', pageSize: 30 })
      expect(feed.body.data.some((item: any) => item.id === postId)).toBe(false)
    })

    it('moderator resolves the report (decisao final da fila)', async () => {
      const res = await (
        await request()
      )
        .patch(`/api/admin/community/reports/${reportId}`)
        .set('Authorization', `Bearer ${tokenC}`)
        .send({ status: 'RESOLVED', reason: 'Post removido por violar diretrizes -- E2E.' })
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('RESOLVED')
      expect(res.body.resolvedAt).toBeTruthy()
    })
  })

  describe('AUDITORIA', () => {
    it('generates a real audit trail entry for the moderation action (actor/action/target/timestamp/reason), with no secrets', async () => {
      const events = await prisma.auditEvent.findMany({
        where: {
          targetType: 'CommunityPost',
          targetId: postId,
          action: 'admin.community.post.hide'
        }
      })
      expect(events).toHaveLength(1)
      const event = events[0]!
      expect(event.actorUsername).toBe(userC.username)
      expect(event.actorRole).toBe('SUPER_ADMIN')
      expect(event.targetId).toBe(postId)
      expect(event.reason).toBe('Conteudo violou as diretrizes da comunidade -- E2E.')
      expect(event.createdAt).toBeInstanceOf(Date)

      // "Sem secrets": beforeData/afterData are the raw CommunityPost row --
      // confirm no password/token/secret-shaped key ever made it into the
      // stored JSON (defense-in-depth check of the real redaction helper in
      // apps/api/src/common/sensitive-data.ts, not just a code-read claim).
      const serialized = JSON.stringify({
        before: event.beforeData,
        after: event.afterData
      }).toLowerCase()
      expect(serialized).not.toMatch(/passwordhash|personalidhash|"password"|"token"|"secret"/)
    })

    it('generates an audit trail entry for the report resolution too', async () => {
      const events = await prisma.auditEvent.findMany({
        where: { targetType: 'CommunityReport', targetId: reportId }
      })
      expect(events.length).toBeGreaterThanOrEqual(1)
      expect(events[0]!.actorUsername).toBe(userC.username)
    })
  })

  describe('SANCOES (warning/block/suspension -- ja existentes, homologadas aqui)', () => {
    it('applies a WARNING to B and increments warningCount', async () => {
      const accountId = await prismaAccountId(prisma, userB.username)
      const res = await (
        await request()
      )
        .post(`/api/admin/community/users/${accountId}/moderation`)
        .set('Authorization', `Bearer ${tokenC}`)
        .send({ type: 'WARNING', reason: 'Denuncia abusiva registrada -- E2E.' })
      expect(res.status).toBe(201)
      expect(res.body.warningCount).toBe(1)
    })

    it('applies a timed POST_BLOCK, and the sanctioned user cannot create a new post while it is active', async () => {
      const accountId = await prismaAccountId(prisma, userB.username)
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString()
      const block = await (
        await request()
      )
        .post(`/api/admin/community/users/${accountId}/moderation`)
        .set('Authorization', `Bearer ${tokenC}`)
        .send({ type: 'POST_BLOCK', reason: 'Bloqueio de postagem -- E2E.', expiresAt: future })
      expect(block.status).toBe(201)
      expect(block.body.postBlockedUntil).toBeTruthy()

      const blockedPost = await (
        await request()
      )
        .post('/api/community/posts')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ type: 'TEXT', content: 'B tentando postar durante o bloqueio -- E2E.' })
      expect(blockedPost.status).toBe(403)
    })

    it('restoreUser clears the active sanction and posting works again', async () => {
      const accountId = await prismaAccountId(prisma, userB.username)
      const restore = await (
        await request()
      )
        .post(`/api/admin/community/users/${accountId}/restore`)
        .set('Authorization', `Bearer ${tokenC}`)
        .send({ reason: 'Sancao revisada e revertida -- E2E.' })
      expect(restore.status).toBe(201)
      expect(restore.body.postBlockedUntil).toBeNull()

      const postAfterRestore = await (
        await request()
      )
        .post('/api/community/posts')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ type: 'TEXT', content: 'B postando normalmente apos a restauracao -- E2E.' })
      expect(postAfterRestore.status).toBe(201)
    })
  })

  describe('UPLOAD MALICIOSO (integra com a Etapa 8)', () => {
    it('a rejected/corrupted upload leaves technical evidence (SystemError with the uploader) and is counted on the moderation dashboard', async () => {
      const before = await (
        await request()
      )
        .get('/api/admin/community/dashboard')
        .set('Authorization', `Bearer ${tokenC}`)
      expect(before.status).toBe(200)
      const errorsBefore = before.body.errors as number

      const garbage = Buffer.from(
        'this is not really a PNG file no matter what the name says -- E2E moderation'.repeat(10)
      )
      const upload = await (
        await request()
      )
        .post('/api/community/media')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('file', garbage, { filename: 'malicious.png', contentType: 'image/png' })
      expect(upload.status).toBe(400)

      // Evidence is now two-layered: the SystemError row below (who/when/why
      // for the moderation dashboard), plus a REJECTED CommunityMedia row
      // whose raw bytes are actually kept in quarantine -- unlike the
      // pipeline's earlier version, which discarded rejected uploads
      // entirely and had nothing to show a reviewer beyond the error log.
      const accountAId = await prismaAccountId(prisma, userA.username)
      const errors = await prisma.systemError.findMany({
        where: { module: 'community.media', userId: accountAId },
        orderBy: { createdAt: 'desc' },
        take: 1
      })
      expect(errors).toHaveLength(1)
      expect(errors[0]!.internalMessage).toBeTruthy()

      const rejected = await prisma.communityMedia.findFirst({
        where: { ownerId: accountAId, status: 'REJECTED' },
        orderBy: { createdAt: 'desc' }
      })
      expect(rejected).toBeTruthy()
      expect(rejected!.rejectionReason).toBeTruthy()
      expect(rejected!.url).toBeNull()
      const { existsSync } = await import('node:fs')
      expect(existsSync(join(mediaDir, 'quarantine', rejected!.storagePath))).toBe(true)

      const after = await (
        await request()
      )
        .get('/api/admin/community/dashboard')
        .set('Authorization', `Bearer ${tokenC}`)
      expect(after.body.errors).toBe(errorsBefore + 1)
    })
  })

  describe('MODERACAO DE MIDIA: post com imagem real, HIDE remove o arquivo da area publica, RESTORE devolve', () => {
    it('HIDE moves the post media file out of the public route; RESTORE moves it back', async () => {
      const sharp = ((await import('sharp')).default) as unknown as typeof import('sharp')
      const png = await sharp({
        create: { width: 30, height: 30, channels: 3, background: { r: 5, g: 5, b: 200 } }
      })
        .png()
        .toBuffer()
      const upload = await (
        await request()
      )
        .post('/api/community/media')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('file', png, 'moderation-media.png')
      expect(upload.status).toBe(201)

      const post = await (
        await request()
      )
        .post('/api/community/posts')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'IMAGE', content: 'Post com midia para moderacao -- E2E.', mediaIds: [upload.body.id] })
      expect(post.status).toBe(201)
      const mediaPostId = post.body.id as string

      const reachableBeforeHide = await (await request()).get(upload.body.url)
      expect(reachableBeforeHide.status).toBe(200)

      const hide = await (
        await request()
      )
        .post(`/api/admin/community/posts/${mediaPostId}/actions`)
        .set('Authorization', `Bearer ${tokenC}`)
        .send({ action: 'HIDE', reason: 'Moderacao de midia -- E2E.' })
      expect(hide.status).toBe(201)
      expect(hide.body.status).toBe('HIDDEN')

      const removedAfterHide = await (await request()).get(upload.body.url)
      expect(removedAfterHide.status).toBe(404)
      const rowAfterHide = await prisma.communityMedia.findUnique({ where: { id: upload.body.id } })
      expect(rowAfterHide!.status).toBe('REMOVED')

      const restore = await (
        await request()
      )
        .post(`/api/admin/community/posts/${mediaPostId}/actions`)
        .set('Authorization', `Bearer ${tokenC}`)
        .send({ action: 'RESTORE', reason: 'Revertendo moderacao de teste -- E2E.' })
      expect(restore.status).toBe(201)
      expect(restore.body.status).toBe('PUBLISHED')

      const reachableAfterRestore = await (await request()).get(upload.body.url)
      expect(reachableAfterRestore.status).toBe(200)
      const rowAfterRestore = await prisma.communityMedia.findUnique({ where: { id: upload.body.id } })
      expect(rowAfterRestore!.status).toBe('ATTACHED')
    })
  })
})

async function prismaAccountId(
  prisma: import('../src/database/prisma.service').PrismaService,
  username: string
) {
  const account = await prisma.account.findUnique({ where: { username }, select: { id: true } })
  return account!.id
}
