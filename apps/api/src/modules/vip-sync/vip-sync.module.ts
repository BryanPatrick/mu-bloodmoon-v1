import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { GameAccountIdentityModule } from '../game-account-identity/game-account-identity.module'
import { VipSyncController } from './vip-sync.controller'
import { VipSyncService } from './vip-sync.service'

// GameBridge extension plan Part 3B. Imports GameAccountIdentityModule only
// for its exported GameCommandTransportClient, never modifies that module's
// files beyond the export it already added for this purpose.
@Module({
  imports: [AuthModule, GameAccountIdentityModule],
  controllers: [VipSyncController],
  providers: [VipSyncService],
  exports: [VipSyncService]
})
export class VipSyncModule {}
