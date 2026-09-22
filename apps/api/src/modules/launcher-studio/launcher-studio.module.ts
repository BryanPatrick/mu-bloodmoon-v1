import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { DatabaseModule } from '../../database/database.module'
import { LauncherAssetMediaController } from './launcher-asset-media.controller'
import { LocalLauncherAssetStorageProvider, R2LauncherAssetStorageProvider } from './launcher-asset-storage'
import { LauncherContentController } from './launcher-content.controller'
import { LAUNCHER_ASSET_STORAGE_PROVIDER } from './launcher-studio.constants'
import { LauncherStudioController } from './launcher-studio.controller'
import { LauncherStudioService } from './launcher-studio.service'

@Module({
  imports: [DatabaseModule, AuditModule, AuthModule],
  controllers: [LauncherStudioController, LauncherContentController, LauncherAssetMediaController],
  providers: [
    LauncherStudioService,
    LocalLauncherAssetStorageProvider,
    R2LauncherAssetStorageProvider,
    // LOCAL by default (unchanged) -- LAUNCHER_MEDIA_STORAGE_PROVIDER=r2
    // switches to R2LauncherAssetStorageProvider (Phase CF-R2-02). Never
    // activated in production by this phase; see docs/cloudflare-migration/
    // R2_ASSETS.md's launcher model. Note: LauncherAssetMediaController's
    // read route (/media/launcher-assets/:fileName) is still local-disk-only
    // regardless of this switch -- an R2-stored asset's real, working URL is
    // the one returned in SavedAsset.publicUrl (an R2 URL), not that route.
    {
      provide: LAUNCHER_ASSET_STORAGE_PROVIDER,
      useFactory: (local: LocalLauncherAssetStorageProvider, r2: R2LauncherAssetStorageProvider) =>
        (process.env.LAUNCHER_MEDIA_STORAGE_PROVIDER || 'local').toLowerCase() === 'r2' ? r2 : local,
      inject: [LocalLauncherAssetStorageProvider, R2LauncherAssetStorageProvider]
    }
  ],
  exports: [LauncherStudioService]
})
export class LauncherStudioModule {}
