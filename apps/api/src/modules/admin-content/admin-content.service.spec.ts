// AdminContentService.uploadImage() had no unit coverage at all before this
// phase (confirmed -- no test/admin-content*.e2e-spec.ts exists either).
// Uses a mocked PrismaService/AuditService/AdminContentStorageService --
// this is the same "write path" every reader (media.controller.ts) and the
// Phase CF-R2-03 audit in docs/cloudflare-migration/R2_ASSETS.md describes;
// createAsset/updateAsset/archiveAsset are metadata-only (no file I/O, no
// StorageProvider involvement) and are not covered here.
import { AdminContentService } from './admin-content.service'

const PNG_1PX_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

function makePayload(overrides: Partial<{ dataUrl: string; name: string }> = {}) {
  return { dataUrl: `data:image/png;base64,${PNG_1PX_BASE64}`, name: 'Test asset', ...overrides }
}

function makeService() {
  const created: unknown[] = []
  const prisma = {
    referenceAsset: {
      create: jest.fn(async ({ data }: { data: unknown }) => {
        created.push(data)
        return { id: 'asset-1', ...(data as object) }
      })
    }
  }
  const audit = { record: jest.fn(async () => undefined) }
  const storage = {
    name: 'local' as const,
    writeAvailable: jest.fn(async (key: string, _body: Buffer, _contentType: string) => ({
      storagePath: `/fake/storage/uploads/${key}`,
      url: `/api/media/${key}`
    }))
  }
  // Constructor args match AdminContentService's real (prisma, audit, storage)
  // order -- cast through unknown since these are minimal structural mocks,
  // not full PrismaService/AuditService instances.
  const service = new AdminContentService(prisma as never, audit as never, storage as never)
  return { service, prisma, audit, storage, created }
}

describe('AdminContentService.uploadImage', () => {
  it('rejects a non-image/malformed dataUrl before touching storage or the database', async () => {
    const { service, storage, prisma } = makeService()
    await expect(service.uploadImage(makePayload({ dataUrl: 'not-a-data-url' }))).rejects.toThrow('Envie uma imagem PNG, JPEG ou WebP valida.')
    expect(storage.writeAvailable).not.toHaveBeenCalled()
    expect(prisma.referenceAsset.create).not.toHaveBeenCalled()
  })

  it('rejects an oversized image (>5MB) before touching storage or the database', async () => {
    const { service, storage, prisma } = makeService()
    const big = Buffer.alloc(5 * 1024 * 1024 + 1, 1).toString('base64')
    await expect(service.uploadImage(makePayload({ dataUrl: `data:image/png;base64,${big}` }))).rejects.toThrow('A imagem deve ter no maximo 5 MB.')
    expect(storage.writeAvailable).not.toHaveBeenCalled()
    expect(prisma.referenceAsset.create).not.toHaveBeenCalled()
  })

  it('writes to storage BEFORE creating the ReferenceAsset row (persist object -> DB commit ordering)', async () => {
    const { service, storage, prisma } = makeService()
    const callOrder: string[] = []
    storage.writeAvailable.mockImplementation(async () => { callOrder.push('storage'); return { storagePath: 'x', url: 'https://pub-test.r2.dev/x' } })
    prisma.referenceAsset.create.mockImplementation(async ({ data }: { data: unknown }) => { callOrder.push('db'); return { id: 'asset-1', ...(data as object) } })
    await service.uploadImage(makePayload())
    expect(callOrder).toEqual(['storage', 'db'])
  })

  it('a storage failure propagates and creates NO ReferenceAsset row -- no phantom record', async () => {
    const { service, storage, prisma } = makeService()
    storage.writeAvailable.mockRejectedValue(new Error('R2 upload failed'))
    await expect(service.uploadImage(makePayload())).rejects.toThrow('R2 upload failed')
    expect(prisma.referenceAsset.create).not.toHaveBeenCalled()
  })

  it('sets localPath/storageKey to the provider storagePath (never the public URL, never a fabricated path) and publicPath/storageProvider from the provider result', async () => {
    const { service, prisma } = makeService()
    await service.uploadImage(makePayload())
    const data = prisma.referenceAsset.create.mock.calls[0][0].data as Record<string, unknown>
    expect(data.localPath).toMatch(/^\/fake\/storage\/uploads\//)
    expect(data.storageKey).toBe(data.localPath)
    expect(data.publicPath).toMatch(/^\/api\/media\//)
    expect(data.storageProvider).toBe('local')
  })

  it('sets status PUBLISHED, kind IMAGE, correct mimeType/bytes, and a friendly name derived from the payload or a date fallback', async () => {
    const { service, prisma } = makeService()
    await service.uploadImage(makePayload({ name: '  My Cool Asset  ' }))
    const data = prisma.referenceAsset.create.mock.calls[0][0].data as Record<string, unknown>
    expect(data.status).toBe('PUBLISHED')
    expect(data.kind).toBe('IMAGE')
    expect(data.mimeType).toBe('image/png')
    expect(data.bytes).toBeGreaterThan(0)
    expect(data.metadata).toEqual({ friendlyName: 'My Cool Asset' })
  })

  it('records an audit event referencing the created asset id', async () => {
    const { service, audit } = makeService()
    await service.uploadImage(makePayload())
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'admin.asset.uploaded',
      targetType: 'ReferenceAsset',
      targetId: 'asset-1'
    }))
  })

  it('returns the provider public URL, not a hardcoded /api/media/ path (matters once R2 is active)', async () => {
    const { service, storage } = makeService()
    storage.writeAvailable.mockResolvedValue({ storagePath: 'admin-content/available/x.png', url: 'https://pub-test.r2.dev/admin-content/available/x.png' })
    const result = await service.uploadImage(makePayload())
    expect(result.url).toBe('https://pub-test.r2.dev/admin-content/available/x.png')
  })

  it('each upload generates an independent random key -- two uploads of identical content never collide or get treated as the same asset (no automatic dedup by design, matches the pre-existing model)', async () => {
    const { service, storage } = makeService()
    await service.uploadImage(makePayload())
    await service.uploadImage(makePayload())
    const keys = storage.writeAvailable.mock.calls.map((call) => call[0])
    expect(keys[0]).not.toBe(keys[1])
  })
})
