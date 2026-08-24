import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { GameAccountIdentityModule } from '../game-account-identity/game-account-identity.module'
import { GameProvisioningReconciliationController } from './game-provisioning-reconciliation.controller'
import { GameProvisioningReconciliationService } from './game-provisioning-reconciliation.service'

// Phase 3D-B. A standalone module -- imports GameAccountIdentityModule only
// for its already-public exports (GameAccountProvisioningService), never
// modifies that module or any file inside it.
@Module({
  imports: [AuthModule, GameAccountIdentityModule],
  controllers: [GameProvisioningReconciliationController],
  providers: [GameProvisioningReconciliationService],
  exports: [GameProvisioningReconciliationService]
})
export class GameProvisioningReconciliationModule {}
