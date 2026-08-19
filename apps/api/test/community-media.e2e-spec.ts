import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Same disposable-database pattern as community-profile.e2e-spec.ts -- see
// that file's comment for why. Media additionally needs an isolated
// COMMUNITY_MEDIA_DIR: real files get written to disk during these tests,
// and that must never be the real dev/production storage/community-media
// directory. A fresh OS temp dir is created in beforeAll and removed in
// afterAll -- nothing from this suite is left behind.
const CONTAINER = 'bloodmoon-e2e-community-media'
let mediaDir = ''

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  mediaDir = mkdtempSync(join(tmpdir(), 'bloodmoon-e2e-media-'))

  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
  process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
  process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-test-two-factor-key-at-least-32-characters'
  process.env.COMMUNITY_MEDIA_DIR = mediaDir
  // Quarantine/removed are separate roots from the available dir above
  // (never served, never the same directory) -- kept as subdirectories of
  // the same temp root so the single rmSync(mediaDir) in afterAll cleans up
  // all three together, instead of leaking into the real repo-local
  // storage/ dirs the way an unset env var would (defaults resolve under
  // process.cwd()).
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

describe('Community media (real pipeline, no base64/mock)', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let sharp: typeof import('sharp')
  let prisma: import('../src/database/prisma.service').PrismaService

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const { PrismaService } = await import('../src/database/prisma.service')
    const express = (await import('express')).default
    sharp = (await import('sharp')).default as unknown as typeof import('sharp')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    // Test.createTestingModule + createNestApplication builds the app
    // directly from AppModule and never runs main.ts's bootstrap() -- so the
    // express.static mount that serves /api/media/community/* in the real
    // app is otherwise entirely absent here. Mirrors main.ts exactly so
    // tests that fetch a media URL exercise real serving behaviour, not a
    // route that plain doesn't exist in this harness.
    app.use('/api/media/community', express.static(mediaDir, { dotfiles: 'deny', index: false, fallthrough: false, maxAge: '7d' }))
    await app.init()
    prisma = app.get(PrismaService)
    httpServer = app.getHttpServer()
  }, 60000)

  afterAll(async () => {
    await app?.close()
  })

  const request = () => import('supertest').then((m) => m.default(httpServer))

  const uniqueSuffix = Date.now().toString(36)
  const user = {
    name: 'E2E Media User',
    username: `e2emedia_${uniqueSuffix}`,
    password: 'e2e-test-password-media',
    personalId: '99988877766',
    email: `e2e-media-${uniqueSuffix}@example.invalid`
  }
  let token = ''

  it('registers and logs in a real account', async () => {
    const register = await (await request()).post('/api/auth/register').send(user)
    expect(register.status).toBe(201)
    const login = await (
      await request()
    )
      .post('/api/auth/login')
      .send({ username: user.username, password: user.password })
    expect(login.status).toBe(201)
    token = login.body.accessToken
    expect(typeof token).toBe('string')
  })

  it('rejects an upload with no authentication (401)', async () => {
    const png = await sharp({
      create: { width: 4, height: 4, channels: 3, background: { r: 10, g: 10, b: 10 } }
    })
      .png()
      .toBuffer()
    const res = await (
      await request()
    )
      .post('/api/community/media')
      .attach('file', png, 'noauth.png')
    expect(res.status).toBe(401)
  })

  it('uploads a valid image (201, real byte validation, re-encoded)', async () => {
    const png = await sharp({
      create: { width: 32, height: 24, channels: 3, background: { r: 200, g: 20, b: 20 } }
    })
      .png()
      .toBuffer()
    const res = await (
      await request()
    )
      .post('/api/community/media')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', png, 'valid.png')
    expect(res.status).toBe(201)
    expect(res.body.kind).toBe('IMAGE')
    expect(typeof res.body.url).toBe('string')
    expect(res.body.url).toMatch(/^\/api\/media\/community\/[a-f0-9-]+\.webp$/)
    expect(res.body.mimeType).toBe('image/webp')
  })

  it('rejects a disallowed file type (400) before touching image decoding', async () => {
    const res = await (
      await request()
    )
      .post('/api/community/media')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('plain text, not an image'), 'notes.txt')
    expect(res.status).toBe(400)
  })

  it('rejects a file over the 8 MB limit', async () => {
    const oversized = Buffer.alloc(9 * 1024 * 1024, 1)
    const res = await (
      await request()
    )
      .post('/api/community/media')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', oversized, 'big.png')
    // Multer enforces `limits.fileSize` at the interceptor level, before the
    // controller/service ever runs -- rejected either as a client error
    // (400/413) depending on how the interceptor surfaces LIMIT_FILE_SIZE.
    // What matters for this test: it's a 4xx client rejection, not a crash
    // and not a 201.
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('rejects a corrupted file (valid extension/mimetype, garbage bytes)', async () => {
    const garbage = Buffer.from(
      'this is not really a PNG file no matter what the name says'.repeat(20)
    )
    const res = await (
      await request()
    )
      .post('/api/community/media')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', garbage, { filename: 'corrupted.png', contentType: 'image/png' })
    expect(res.status).toBe(400)
  })

  it('returns 500 (not 400) when storage itself fails; the quarantine row is left at TEMPORARY, never promoted', async () => {
    // Point COMMUNITY_MEDIA_DIR at a path that already exists as a *file* --
    // mkdir(..., {recursive:true}) genuinely fails with ENOTDIR here, a real
    // filesystem fault, not a crafted validation failure. Quarantine write
    // and validation both succeed first (they don't use COMMUNITY_MEDIA_DIR)
    // -- only the promotion step fails, so a TEMPORARY row does exist
    // afterwards. It is not a REJECTED row (validation never said no) and
    // has no url (never promoted) -- the orphan-cleanup helper is what
    // eventually sweeps a row stuck in this state, same as any other
    // never-finished upload.
    const { writeFileSync, unlinkSync } = await import('node:fs')
    const blockerPath = join(mediaDir, 'this-is-a-file-not-a-directory')
    writeFileSync(blockerPath, 'blocking')
    const previous = process.env.COMMUNITY_MEDIA_DIR
    process.env.COMMUNITY_MEDIA_DIR = join(blockerPath, 'nested')

    try {
      const png = await sharp({
        create: { width: 4, height: 4, channels: 3, background: { r: 1, g: 2, b: 3 } }
      })
        .png()
        .toBuffer()
      const res = await (
        await request()
      )
        .post('/api/community/media')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', png, 'storage-fail.png')
      expect(res.status).toBe(500)

      const stuck = await prisma.communityMedia.findFirst({
        where: { ownerId: (await prisma.account.findUnique({ where: { username: user.username }, select: { id: true } }))!.id, status: 'TEMPORARY' },
        orderBy: { createdAt: 'desc' }
      })
      expect(stuck).toBeTruthy()
      expect(stuck!.url).toBeNull()
    } finally {
      process.env.COMMUNITY_MEDIA_DIR = previous
      unlinkSync(blockerPath)
    }
  })

  it('quarantined/rejected files are never reachable through the public media route', async () => {
    const garbage = Buffer.from('definitely not an image'.repeat(30))
    const upload = await (
      await request()
    )
      .post('/api/community/media')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', garbage, { filename: 'quarantine-check.png', contentType: 'image/png' })
    expect(upload.status).toBe(400)

    const account = await prisma.account.findUnique({ where: { username: user.username }, select: { id: true } })
    const rejected = await prisma.communityMedia.findFirst({
      where: { ownerId: account!.id, status: 'REJECTED' },
      orderBy: { createdAt: 'desc' }
    })
    expect(rejected).toBeTruthy()
    expect(rejected!.url).toBeNull()
    // storagePath for a REJECTED row is the quarantine key -- proving the
    // public static mount (which only ever serves COMMUNITY_MEDIA_DIR) 404s
    // on it confirms the quarantine directory is genuinely never reachable
    // by URL, not just that the DB row lacks one.
    const res = await (await request()).get(`/api/media/community/${rejected!.storagePath}`)
    expect(res.status).toBe(404)
  })

  it('avatar: uses the real upload pipeline, no base64/manual URL', async () => {
    const png = await sharp({
      create: { width: 48, height: 48, channels: 3, background: { r: 5, g: 100, b: 5 } }
    })
      .png()
      .toBuffer()
    const upload = await (
      await request()
    )
      .post('/api/community/media')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', png, 'avatar.png')
    expect(upload.status).toBe(201)

    const update = await (
      await request()
    )
      .patch('/api/community/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ avatarUrl: upload.body.url })
    expect(update.status).toBe(200)
    expect(update.body.avatarUrl).toBe(upload.body.url)

    const profile = await (await request()).get(`/api/community/profiles/${user.username}`)
    expect(profile.body.communityProfile.avatarUrl).toBe(upload.body.url)
  })

  it('avatar replace: the previous avatar file is released (moved out of the served dir), not left as a silent orphan', async () => {
    const firstPng = await sharp({
      create: { width: 40, height: 40, channels: 3, background: { r: 10, g: 10, b: 200 } }
    })
      .png()
      .toBuffer()
    const firstUpload = await (
      await request()
    )
      .post('/api/community/media')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', firstPng, 'avatar-1.png')
    expect(firstUpload.status).toBe(201)
    await (await request())
      .patch('/api/community/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ avatarUrl: firstUpload.body.url })
    const reachableBeforeReplace = await (await request()).get(firstUpload.body.url)
    expect(reachableBeforeReplace.status).toBe(200)

    const secondPng = await sharp({
      create: { width: 40, height: 40, channels: 3, background: { r: 200, g: 10, b: 10 } }
    })
      .png()
      .toBuffer()
    const secondUpload = await (
      await request()
    )
      .post('/api/community/media')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', secondPng, 'avatar-2.png')
    expect(secondUpload.status).toBe(201)
    const replace = await (
      await request()
    )
      .patch('/api/community/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ avatarUrl: secondUpload.body.url })
    expect(replace.status).toBe(200)
    expect(replace.body.avatarUrl).toBe(secondUpload.body.url)

    const firstStillReachable = await (await request()).get(firstUpload.body.url)
    expect(firstStillReachable.status).toBe(404)
    const secondReachable = await (await request()).get(secondUpload.body.url)
    expect(secondReachable.status).toBe(200)

    const firstRow = await prisma.communityMedia.findUnique({ where: { id: firstUpload.body.id } })
    expect(firstRow!.status).toBe('REMOVED')
    const secondRow = await prisma.communityMedia.findUnique({ where: { id: secondUpload.body.id } })
    expect(secondRow!.status).toBe('ATTACHED')
  })

  it('avatar re-save with the same URL does not release the still-in-use file', async () => {
    // Reuses the avatar the previous test left active (secondUpload from
    // "avatar replace") instead of uploading a fresh one -- this file shares
    // one 10-uploads/60s throttle window across all its tests, so an extra
    // upload here isn't free.
    const activeAvatarUrl = (await (await request()).get(`/api/community/profiles/${user.username}`)).body
      .communityProfile.avatarUrl
    expect(typeof activeAvatarUrl).toBe('string')

    const resave = await (
      await request()
    )
      .patch('/api/community/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ avatarUrl: activeAvatarUrl, bio: 'no-op resave' })
    expect(resave.status).toBe(200)

    const stillReachable = await (await request()).get(activeAvatarUrl)
    expect(stillReachable.status).toBe(200)
  })

  it('post with media: uses the real upload pipeline and attaches correctly', async () => {
    const png = await sharp({
      create: { width: 64, height: 40, channels: 3, background: { r: 40, g: 40, b: 200 } }
    })
      .png()
      .toBuffer()
    const upload = await (
      await request()
    )
      .post('/api/community/media')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', png, 'post-image.png')
    expect(upload.status).toBe(201)

    const post = await (
      await request()
    )
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'IMAGE', content: 'Post E2E com midia real.', mediaIds: [upload.body.id] })
    expect(post.status).toBe(201)

    const profile = await (await request()).get(`/api/community/profiles/${user.username}`)
    const created = profile.body.communityPosts.find((item: any) => item.id === post.body.id)
    expect(created).toBeTruthy()
    expect(Array.isArray(created.media)).toBe(true)
    expect(created.media[0].url).toBe(upload.body.url)

    // Continues the same post/media (no extra upload -- this file shares one
    // 10-uploads/60s throttle window) into author-initiated delete, which
    // goes through a different code path than moderation HIDE/REMOVE
    // (removeOwnPost, not postAction) -- never directly verified end-to-end
    // that its media release actually takes the file out of the public
    // route, only that moderation's did.
    const reachableBeforeDelete = await (await request()).get(upload.body.url)
    expect(reachableBeforeDelete.status).toBe(200)

    const remove = await (
      await request()
    )
      .delete(`/api/community/posts/${post.body.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(remove.status).toBe(200)

    const unreachableAfterDelete = await (await request()).get(upload.body.url)
    expect(unreachableAfterDelete.status).toBe(404)
    const mediaRow = await prisma.communityMedia.findUnique({ where: { id: upload.body.id } })
    expect(mediaRow!.status).toBe('REMOVED')
  })

  it('failed upload creates no ghost post: post creation rejects an unknown mediaId', async () => {
    const post = await (
      await request()
    )
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'IMAGE',
        content: 'Nao deveria ser criado.',
        mediaIds: ['00000000-0000-0000-0000-000000000000']
      })
    expect(post.status).toBe(400)
  })
})
