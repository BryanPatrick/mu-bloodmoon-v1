import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { WalletModule } from '../wallet/wallet.module'
import { VipController } from './vip.controller'
import { VipService } from './vip.service'

@Module({
  imports: [AuthModule, AuditModule, WalletModule],
  controllers: [VipController],
  providers: [VipService],
  exports: [VipService]
})
export class VipModule {}
