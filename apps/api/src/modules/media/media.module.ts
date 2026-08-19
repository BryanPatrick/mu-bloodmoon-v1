import { Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'
import { AuthModule } from '../auth/auth.module'
import { MediaController } from './media.controller'
import { MediaOrphanCleanupService } from './media-orphan-cleanup.service'
import { MediaService } from './media.service'
import { MediaStorageService } from './storage/media-storage.service'

@Module({
  imports: [
    AuthModule,
    // Scoped to this module only -- upload is the single most CPU/disk
    // expensive endpoint in the API (Sharp re-encode + disk write), so it's
    // the one that actually needs a limit today. 10 uploads/60s per client
    // covers a real gallery post (up to 6 files) with room to spare while
    // bounding repeated abuse. Not applied API-wide -- out of scope for a
    // Community Media etapa.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }])
  ],
  controllers: [MediaController],
  providers: [MediaService, MediaStorageService, MediaOrphanCleanupService],
  exports: [MediaService, MediaOrphanCleanupService]
})
export class MediaModule {}
