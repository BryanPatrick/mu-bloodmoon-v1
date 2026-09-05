import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { CommerceModule } from '../commerce/commerce.module'
import { WalletModule } from '../wallet/wallet.module'
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
  // PHASE Q DECISION CLOSURE (2026-08-31): CommerceModule imported for
  // PaymentRiskService (TRANSFER_RESTRICTION on Market BUY only -- see
  // marketplace.service.ts#createOrder's own comment for the real
  // economic-flow audit this is based on). No cycle: CommerceModule
  // never imports MarketplaceModule.
  imports: [AuthModule, AuditModule, WalletModule, CommerceModule],
  controllers: [
    MarketplaceController,
    MarketplaceAdminController,
    ...(isMarketplaceBridgeDevControlsSafe() ? [MarketplaceBridgeDevController] : [])
  ],
  providers: [MarketplaceService, MarketplaceAdminService]
})
export class MarketplaceModule {}
