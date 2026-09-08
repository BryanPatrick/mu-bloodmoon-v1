import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { CommerceModule } from '../commerce/commerce.module'
import { GameAccountIdentityModule } from '../game-account-identity/game-account-identity.module'
import { WalletModule } from '../wallet/wallet.module'
import { GameBridgeVipGateway } from './game-bridge-vip.gateway'
import { VipController } from './vip.controller'
import { VipDeliveryController } from './vip-delivery.controller'
import { VipDeliveryService } from './vip-delivery.service'
import { VipService } from './vip.service'

// PHASE O (2026-08-31): GameAccountIdentityModule imported specifically to
// obtain GameCommandTransportClient (already exported from there for
// exactly this kind of reuse -- see that module's own header comment) for
// GameBridgeVipGateway, the real VipGameBridgeGateway implementation.
// PHASE Q (2026-08-31): CommerceModule imported for PaymentRiskService
// (ACCOUNT_RESTRICTION enforcement on VIP purchase) -- no cycle, CommerceModule
// never imports VipModule.
@Module({
  imports: [AuthModule, AuditModule, WalletModule, GameAccountIdentityModule, CommerceModule],
  controllers: [VipController, VipDeliveryController],
  providers: [VipService, VipDeliveryService, GameBridgeVipGateway],
  exports: [VipService, VipDeliveryService]
})
export class VipModule {}
