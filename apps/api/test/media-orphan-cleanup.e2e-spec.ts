import { execSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Same disposable-database + isolated-media-dir pattern as
// community-media.e2e-spec.ts (see that file's comment for why).
const CONTAINER = 'bloodmoon-e2e-media-orphan-cleanup'
let mediaDir = ''

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  mediaDir = mkdtempSync(join(tmpdir(), 'bloodmoon-e2e-orphan-'))

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

describe('MediaOrphanCleanupService -- READY-but-never-attached media (Community Step 3)', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService
  let cleanup: import('../src/modules/media/media-orphan-cleanup.service').MediaOrphanCleanupService
  let sharp: typeof import('sharp')

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { MediaOrphanCleanupService } = await import('../src/modules/media/media-orphan-cleanup.service')
    const express = (await import('express')).default
    sharp = (await import('sharp')).default as unknown as typeof import('sharp')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    app.use('/api/media/community', express.static(mediaDir, { dotfiles: 'deny', index: false, fallthrough: false, maxAge: '7d' }))
    await app.init()
    httpServer = app.getHttpServer()
    prisma = app.get(PrismaService)
    cleanup = app.get(MediaOrphanCleanupService)
  }, 60000)

  afterAll(async () => {
    await app?.close()
  })

  const request = () => import('supertest').then((m) => m.default(httpServer))

  const uniqueSuffix = Date.now().toString(36)
  const user = {
    name: 'E2E Orphan User',
    username: `e2eorphan_${uniqueSuffix}`,
    password: 'e2e-test-password-orphan',
    personalId: '44455566677',
    email: `e2e-orphan-${uniqueSuffix}@example.invalid`
  }
  let token = ''

  it('registers and logs in', async () => {
    const register = await (await request()).post('/api/auth/register').send(user)
    expect(register.status).toBe(201)
    const login = await (await request()).post('/api/auth/login').send({ username: user.username, password: user.password })
    expect(login.status).toBe(201)
    token = login.body.accessToken
  })

  it('a fresh READY upload (never attached) is not swept -- too recent, matching the same age-gate TEMPORARY/REJECTED already get', async () => {
    const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: { r: 9, g: 9, b: 9 } } }).png().toBuffer()
    const upload = await (await request()).post('/api/community/media').set('Authorization', `Bearer ${token}`).attach('file', png, 'fresh-orphan.png')
    expect(upload.status).toBe(201)

    const result = await cleanup.cleanup({ dryRun: false, olderThanHours: 24 })
    expect(result.releasedRows).toBe(0)

    const row = await prisma.communityMedia.findUnique({ where: { id: upload.body.id } })
    expect(row!.status).toBe('READY')
    const stillReachable = await (await request()).get(upload.body.url)
    expect(stillReachable.status).toBe(200)
  })

  it('an old READY upload with no post attached is released: file leaves the served directory, row becomes REMOVED, dry run changes nothing', async () => {
    const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: { r: 40, g: 40, b: 200 } } }).png().toBuffer()
    const upload = await (await request()).post('/api/community/media').set('Authorization', `Bearer ${token}`).attach('file', png, 'old-orphan.png')
    expect(upload.status).toBe(201)

    // Backdate createdAt directly -- this is the one legitimate way to
    // simulate "old" without sleeping the test for real hours.
    await prisma.communityMedia.update({
      where: { id: upload.body.id },
      data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) }
    })

    const dryRun = await cleanup.cleanup({ dryRun: true, olderThanHours: 24 })
    expect(dryRun.scanned).toBeGreaterThanOrEqual(1)
    expect(dryRun.releasedRows).toBe(0)
    const stillReachableAfterDryRun = await (await request()).get(upload.body.url)
    expect(stillReachableAfterDryRun.status).toBe(200)

    const applied = await cleanup.cleanup({ dryRun: false, olderThanHours: 24 })
    expect(applied.releasedRows).toBeGreaterThanOrEqual(1)
    expect(applied.releasedFiles).toBeGreaterThanOrEqual(1)

    const row = await prisma.communityMedia.findUnique({ where: { id: upload.body.id } })
    expect(row!.status).toBe('REMOVED')
    expect(row!.removedAt).toBeTruthy()
    const unreachable = await (await request()).get(upload.body.url)
    expect(unreachable.status).toBe(404)
    expect(existsSync(join(mediaDir, 'removed', upload.body.url.split('/').pop()!))).toBe(true)
  })

  it('a READY upload that gets attached to a post before the sweep is never touched', async () => {
    const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: { r: 200, g: 40, b: 40 } } }).png().toBuffer()
    const upload = await (await request()).post('/api/community/media').set('Authorization', `Bearer ${token}`).attach('file', png, 'attached.png')
    expect(upload.status).toBe(201)
    await prisma.communityMedia.update({
      where: { id: upload.body.id },
      data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) }
    })
    const post = await (await request()).post('/api/community/posts').set('Authorization', `Bearer ${token}`).send({ type: 'IMAGE', content: 'Post real com midia -- E2E orphan cleanup.', mediaIds: [upload.body.id] })
    expect(post.status).toBe(201)

    await cleanup.cleanup({ dryRun: false, olderThanHours: 24 })
    const row = await prisma.communityMedia.findUnique({ where: { id: upload.body.id } })
    expect(row!.status).toBe('ATTACHED')
    expect(row!.postId).toBe(post.body.id)
    const reachable = await (await request()).get(upload.body.url)
    expect(reachable.status).toBe(200)
  })
})
