import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { ObservabilityService } from '../observability/observability.service'
import { MediaStorageService } from './storage/media-storage.service'

export interface OrphanCleanupOptions {
  // TEMPORARY rows younger than this are still mid-upload (the request
  // between writeQuarantine and the validation result) -- not orphans.
  // REJECTED rows are kept this long deliberately, as the abuse-review trail
  // the quarantine step exists for; only swept once that window has passed.
  olderThanHours?: number
  dryRun?: boolean
}

export interface OrphanCleanupResult {
  scanned: number
  deletedFiles: number
  deletedRows: number
  dryRun: boolean
}

// Locally-testable helper, not a production cron -- run manually via
// `npm run media:cleanup:orphans` (apps/api/scripts/cleanup-orphan-media.mjs).
// Only ever touches TEMPORARY/REJECTED CommunityMedia rows and their
// quarantine files; READY/ATTACHED/REMOVED media (and the files behind them)
// are never in scope here.
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
    const rows = await this.prisma.communityMedia.findMany({
      where: { status: { in: ['TEMPORARY', 'REJECTED'] }, createdAt: { lt: cutoff } },
      select: { id: true, storagePath: true, status: true }
    })

    let deletedFiles = 0
    let deletedRows = 0
    for (const row of rows) {
      if (!dryRun) {
        try {
          await this.storage.deleteQuarantine(row.storagePath)
          deletedFiles += 1
        } catch (error) {
          await this.observability.recordSystemError({
            module: 'community.media', severity: 'WARNING', errorCode: 'COMMUNITY_MEDIA_ORPHAN_CLEANUP_FAILED',
            publicMessage: 'Falha ao remover arquivo orfao da quarentena.',
            internalMessage: `mediaId=${row.id}: ${error instanceof Error ? error.message : String(error)}`,
            stackTrace: error instanceof Error ? error.stack : undefined,
            entityType: 'CommunityMedia', entityId: row.id
          })
          continue
        }
        await this.prisma.communityMedia.delete({ where: { id: row.id } })
        deletedRows += 1
      }
    }

    return { scanned: rows.length, deletedFiles, deletedRows, dryRun }
  }
}
