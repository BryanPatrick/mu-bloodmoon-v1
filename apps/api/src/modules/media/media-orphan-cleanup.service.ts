import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { ObservabilityService } from '../observability/observability.service'
import { MediaStorageService } from './storage/media-storage.service'

export interface OrphanCleanupOptions {
  // TEMPORARY rows younger than this are still mid-upload (the request
  // between writeQuarantine and the validation result) -- not orphans.
  // REJECTED rows are kept this long deliberately, as the abuse-review trail
  // the quarantine step exists for; only swept once that window has passed.
  // READY rows use the same window for the same reason: a post is often
  // created in a second request right after the upload finishes, so a
  // freshly-uploaded, not-yet-attached file is normal, not orphaned.
  olderThanHours?: number
  dryRun?: boolean
}

export interface OrphanCleanupResult {
  scanned: number
  deletedFiles: number
  deletedRows: number
  releasedFiles: number
  releasedRows: number
  dryRun: boolean
}

// Locally-testable helper, not a production cron -- run manually via
// `npm run media:cleanup:orphans` (apps/api/scripts/cleanup-orphan-media.mjs).
//
// Two distinct orphan categories, handled differently:
// - TEMPORARY/REJECTED: never had (or never will have) a public file --
//   quarantine copy deleted, row hard-deleted. Nothing to preserve.
// - READY with postId null: a real, successfully-processed upload that was
//   never attached to a post and never promoted to an avatar/cover
//   (attachByUrl would have moved it to ATTACHED) -- e.g. the post-create
//   request that should have followed the upload never happened, or an
//   avatar/cover picker was closed without saving. This DOES have a public
//   file, so it's released the same way moderation/replace does everywhere
//   else in this pipeline: moved out of the served directory, row kept as
//   REMOVED for the audit trail -- never hard-deleted.
// ATTACHED/REMOVED media (and the files behind them) are never in scope.
@Injectable()
export class MediaOrphanCleanupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MediaStorageService,
    private readonly observability: ObservabilityService
  ) {}

  async cleanup(options: OrphanCleanupOptions = {}): Promise<OrphanCleanupResult> {
    const olderThanHours = options.olderThanHours ?? 24
    const dryRun = options.dryRun ?? true
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)

    const [quarantineRows, readyRows] = await Promise.all([
      this.prisma.communityMedia.findMany({
        where: { status: { in: ['TEMPORARY', 'REJECTED'] }, createdAt: { lt: cutoff } },
        select: { id: true, storagePath: true }
      }),
      this.prisma.communityMedia.findMany({
        where: { status: 'READY', postId: null, createdAt: { lt: cutoff } },
        select: { id: true, url: true }
      })
    ])

    let deletedFiles = 0
    let deletedRows = 0
    for (const row of quarantineRows) {
      if (dryRun) continue
      try {
        await this.storage.deleteQuarantine(row.storagePath)
        deletedFiles += 1
      } catch (error) {
        await this.recordFailure('COMMUNITY_MEDIA_ORPHAN_CLEANUP_FAILED', 'Falha ao remover arquivo orfao da quarentena.', row.id, error)
        continue
      }
      await this.prisma.communityMedia.delete({ where: { id: row.id } })
      deletedRows += 1
    }

    let releasedFiles = 0
    let releasedRows = 0
    for (const row of readyRows) {
      if (dryRun || !row.url) continue
      const key = row.url.split('/').pop() || ''
      try {
        await this.storage.moveAvailableToRemoved(key)
        releasedFiles += 1
      } catch (error) {
        await this.recordFailure('COMMUNITY_MEDIA_ORPHAN_RELEASE_FAILED', 'Falha ao liberar midia READY nunca anexada.', row.id, error)
        continue
      }
      await this.prisma.communityMedia.update({ where: { id: row.id }, data: { status: 'REMOVED', removedAt: new Date() } })
      releasedRows += 1
    }

    return {
      scanned: quarantineRows.length + readyRows.length,
      deletedFiles,
      deletedRows,
      releasedFiles,
      releasedRows,
      dryRun
    }
  }

  private async recordFailure(errorCode: string, publicMessage: string, mediaId: string, error: unknown) {
    await this.observability.recordSystemError({
      module: 'community.media', severity: 'WARNING', errorCode,
      publicMessage,
      internalMessage: `mediaId=${mediaId}: ${error instanceof Error ? error.message : String(error)}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      entityType: 'CommunityMedia', entityId: mediaId
    })
  }
}
