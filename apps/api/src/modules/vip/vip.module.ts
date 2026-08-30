import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { WalletModule } from '../wallet/wallet.module'
import { VipController } from './vip.controller'
import { VipDeliveryController } from './vip-delivery.controller'
import { VipDeliveryService } from './vip-delivery.service'
import { VipService } from './vip.service'

@Module({
  imports: [AuthModule, AuditModule, WalletModule],
  controllers: [VipController, VipDeliveryController],
  providers: [VipService, VipDeliveryService],
  exports: [VipService, VipDeliveryService]
})
export class VipModule {}
