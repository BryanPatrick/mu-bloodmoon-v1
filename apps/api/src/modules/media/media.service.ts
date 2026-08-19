import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common'
import type { CommunityPostType, Prisma } from '@prisma/client'
import { createHash, randomUUID } from 'node:crypto'
import { PrismaService } from '../../database/prisma.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ObservabilityService } from '../observability/observability.service'
import { MediaStorageService } from './storage/media-storage.service'
import { validateAndProcessImage } from './validation/image-validation'

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly observability: ObservabilityService,
    private readonly storage: MediaStorageService
  ) {}

  // The public URL's last path segment is always the bare storage key,
  // regardless of provider (local filename or R2 object key) -- deriving it
  // this way instead of re-parsing storagePath keeps every call site
  // provider-agnostic.
  private keyFromUrl(url: string) {
    return url.split('/').pop() || ''
  }

  async upload(file: Express.Multer.File, user: AuthenticatedUser) {
    const id = randomUUID()
    const quarantineKey = `${id}.upload`
    let quarantined = false
    try {
      // Written and audited before any validation runs -- even a rejected
      // upload leaves a real row and a real file for abuse-pattern review,
      // which nothing in this codebase did before this pipeline.
      await this.storage.writeQuarantine(quarantineKey, file.buffer)
      quarantined = true
      await this.prisma.communityMedia.create({
        data: {
          id,
          ownerId: user.id,
          kind: 'IMAGE',
          status: 'TEMPORARY',
          storagePath: quarantineKey,
          storageProvider: this.storage.name,
          originalName: file.originalname.slice(0, 255),
          declaredMimeType: file.mimetype?.slice(0, 100),
          sizeBytes: file.buffer.byteLength,
          sha256: createHash('sha256').update(file.buffer).digest('hex')
        }
      })

      const result = await validateAndProcessImage(file.buffer, file.originalname, file.mimetype)
      if (!result.ok) {
        await this.prisma.communityMedia.update({
          where: { id },
          data: { status: 'REJECTED', rejectionReason: result.reason }
        })
        throw new BadRequestException(result.reason)
      }

      const availableKey = `${id}.${result.extension}`
      const { url } = await this.storage.writeAvailable(availableKey, result.processed, result.mimeType)
      await this.storage.deleteQuarantine(quarantineKey)
      const sha256 = createHash('sha256').update(result.processed).digest('hex')
      const media = await this.prisma.communityMedia.update({
        where: { id },
        data: {
          status: 'READY',
          url,
          storagePath: availableKey,
          kind: result.extension === 'gif' ? 'GIF' : 'IMAGE',
          mimeType: result.mimeType,
          extension: result.extension,
          sizeBytes: result.processed.byteLength,
          width: result.width,
          height: result.height,
          sha256
        },
        select: { id: true, kind: true, url: true, mimeType: true, sizeBytes: true, width: true, height: true }
      })
      await this.observability.recordOperationalEvent({
        module: 'community.media',
        eventType: 'COMMUNITY_MEDIA_UPLOADED',
        entityType: 'CommunityMedia',
        entityId: media.id,
        actorUserId: user.id,
        description: `Midia enviada (${media.kind}, ${media.sizeBytes} bytes).`,
        data: { sha256, mimeType: media.mimeType, width: media.width, height: media.height }
      })
      return media
    } catch (error) {
      // A REJECTED row (validation said no) already has its own status and
      // reason recorded above via the REJECTED row -- this SystemError call
      // is a second, pre-existing audit trail (the moderation dashboard's
      // error counter and community-moderation.e2e-spec.ts's "malicious
      // upload leaves evidence" test both depend on exactly one row per
      // failed upload) kept for both validation and infrastructure faults,
      // same as before this pipeline existed.
      const isValidationRejection = error instanceof BadRequestException
      await this.observability.recordSystemError({
        module: 'community.media',
        severity: isValidationRejection ? 'WARNING' : 'ERROR',
        errorCode: 'COMMUNITY_MEDIA_PROCESSING_FAILED',
        publicMessage: 'Nao foi possivel processar a midia.',
        internalMessage: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
        userId: user.id
      })
      // The quarantine file is only ever cleaned up here on an
      // infrastructure fault (nothing useful to review) -- a validation
      // rejection keeps it, since that raw file *is* the abuse-review trail
      // this pipeline exists to create.
      if (quarantined && !isValidationRejection) await this.storage.deleteQuarantine(quarantineKey).catch(() => undefined)
      if (isValidationRejection) throw error
      throw new InternalServerErrorException('Nao foi possivel salvar a midia no momento.')
    }
  }

  async resolveForPost(mediaIds: string[] | undefined, ownerId: string, type: CommunityPostType) {
    const ids = [...new Set((mediaIds || []).map(String).filter(Boolean))]
    const limits: Partial<Record<CommunityPostType, [number, number]>> = { TEXT: [0, 0], ARTICLE: [0, 1], IMAGE: [1, 1], GALLERY: [2, 6], GIF: [1, 1] }
    const [minimum, maximum] = limits[type] || [0, 0]
    if (ids.length < minimum || ids.length > maximum) throw new BadRequestException(`Quantidade de midias invalida para ${type}.`)
    if (!ids.length) return []
    const assets = await this.prisma.communityMedia.findMany({ where: { id: { in: ids }, ownerId, status: { in: ['READY', 'ATTACHED'] } } })
    if (assets.length !== ids.length) throw new BadRequestException('Uma ou mais midias nao pertencem a sua conta ou nao estao disponiveis.')
    if (type === 'GIF' && assets.some((asset) => asset.kind !== 'GIF')) throw new BadRequestException('A publicacao GIF exige um arquivo GIF valido.')
    if (type !== 'GIF' && assets.some((asset) => asset.kind === 'GIF')) throw new BadRequestException('Use o tipo GIF para publicar este arquivo.')
    return ids.map((id) => assets.find((asset) => asset.id === id)!)
  }

  snapshot(assets: Awaited<ReturnType<MediaService['resolveForPost']>>): Prisma.InputJsonValue {
    return assets.map(({ id, kind, url, mimeType, width, height }) => ({ id, kind, url, mimeType, width, height }))
  }

  // Physical-storage counterpart to a CommunityMedia row already marked
  // REMOVED in the DB (post hidden/removed/edited-away, or an avatar/cover
  // replaced). Best-effort and never throws: the DB status change is the
  // authoritative, already-committed fact; a filesystem/R2 hiccup moving the
  // now-orphaned bytes out of the public directory is worth logging, not
  // worth failing an otherwise-successful moderation or edit action over.
  async releaseMedia(mediaIds: string[]) {
    if (!mediaIds.length) return
    const rows = await this.prisma.communityMedia.findMany({
      where: { id: { in: mediaIds }, url: { not: null } },
      select: { id: true, url: true }
    })
    await Promise.all(
      rows.map(async (row) => {
        try {
          await this.storage.moveAvailableToRemoved(this.keyFromUrl(row.url!))
        } catch (error) {
          await this.observability.recordSystemError({
            module: 'community.media', severity: 'WARNING', errorCode: 'COMMUNITY_MEDIA_RELEASE_FAILED',
            publicMessage: 'Falha ao mover midia para a area removida.',
            internalMessage: `mediaId=${row.id}: ${error instanceof Error ? error.message : String(error)}`,
            stackTrace: error instanceof Error ? error.stack : undefined,
            entityType: 'CommunityMedia', entityId: row.id
          })
        }
      })
    )
  }

  // Inverse of releaseMedia -- moderation restore. Same best-effort contract.
  async restoreMedia(mediaIds: string[]) {
    if (!mediaIds.length) return
    const rows = await this.prisma.communityMedia.findMany({
      where: { id: { in: mediaIds }, url: { not: null } },
      select: { id: true, url: true, mimeType: true }
    })
    await Promise.all(
      rows.map(async (row) => {
        try {
          await this.storage.moveRemovedToAvailable(this.keyFromUrl(row.url!), row.mimeType || 'application/octet-stream')
        } catch (error) {
          await this.observability.recordSystemError({
            module: 'community.media', severity: 'WARNING', errorCode: 'COMMUNITY_MEDIA_RESTORE_FAILED',
            publicMessage: 'Falha ao restaurar midia da area removida.',
            internalMessage: `mediaId=${row.id}: ${error instanceof Error ? error.message : String(error)}`,
            stackTrace: error instanceof Error ? error.stack : undefined,
            entityType: 'CommunityMedia', entityId: row.id
          })
        }
      })
    )
  }

  // Profile avatar/cover replace: the previous CommunityMedia row (matched
  // by URL -- there's no dedicated avatarMediaId/coverMediaId column, the
  // profile just stores the URL string directly) becomes an orphan the
  // instant a new one is saved. Marks it REMOVED and releases the file, the
  // same as a post's media does today -- this call site just never made
  // that connection before.
  async releaseByUrl(url: string | null | undefined, ownerId: string) {
    if (!url) return
    const row = await this.prisma.communityMedia.findFirst({
      where: { ownerId, url, status: { in: ['READY', 'ATTACHED'] } },
      select: { id: true }
    })
    if (!row) return
    await this.prisma.communityMedia.update({ where: { id: row.id }, data: { status: 'REMOVED', removedAt: new Date() } })
    await this.releaseMedia([row.id])
  }

  // Marks a freshly-uploaded avatar/cover media row as in-use, mirroring
  // what post creation does for post media -- otherwise a profile's active
  // avatar/cover sits at status READY forever, indistinguishable from an
  // unused upload.
  async attachByUrl(url: string | null | undefined, ownerId: string) {
    if (!url) return
    await this.prisma.communityMedia.updateMany({ where: { ownerId, url, status: 'READY' }, data: { status: 'ATTACHED' } })
  }
}
