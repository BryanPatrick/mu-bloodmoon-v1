import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { DatabaseModule } from '../../database/database.module'
import { LauncherAssetMediaController } from './launcher-asset-media.controller'
import { LocalLauncherAssetStorageProvider } from './launcher-asset-storage'
import { LauncherContentController } from './launcher-content.controller'
import { LAUNCHER_ASSET_STORAGE_PROVIDER } from './launcher-studio.constants'
import { LauncherStudioController } from './launcher-studio.controller'
import { LauncherStudioService } from './launcher-studio.service'

@Module({
  imports: [DatabaseModule, AuditModule, AuthModule],
  controllers: [LauncherStudioController, LauncherContentController, LauncherAssetMediaController],
  providers: [
    LauncherStudioService,
    // LOCAL today (Part O) -- swap to an R2 provider here once real
    // Cloudflare R2 credentials exist; nothing else in this module changes.
    { provide: LAUNCHER_ASSET_STORAGE_PROVIDER, useClass: LocalLauncherAssetStorageProvider }
  ],
  exports: [LauncherStudioService]
})
export class LauncherStudioModule {}
