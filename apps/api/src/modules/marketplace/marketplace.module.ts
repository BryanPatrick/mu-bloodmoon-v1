import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { MarketplaceController } from './marketplace.controller'
import { MarketplaceAdminController } from './marketplace-admin.controller'
import { MarketplaceAdminService } from './marketplace-admin.service'
import { MarketplaceBridgeDevController } from './marketplace-bridge-dev.controller'
import { isMarketplaceBridgeDevControlsSafe } from './marketplace-bridge-dev.env'
import { MarketplaceService } from './marketplace.service'

// isMarketplaceBridgeDevControlsSafe() is read once, synchronously, while
// this decorator is evaluated -- the same timing TestPersonasModule.register()
// relies on. When it is false, MarketplaceBridgeDevController is simply
// absent from the array below: Nest never registers its routes, so a
// request to them 404s at the router, not a 403 from a guard.
@Module({
  imports: [AuthModule, AuditModule],
  controllers: [
    MarketplaceController,
    MarketplaceAdminController,
    ...(isMarketplaceBridgeDevControlsSafe() ? [MarketplaceBridgeDevController] : [])
  ],
  providers: [MarketplaceService, MarketplaceAdminService]
})
export class MarketplaceModule {}
