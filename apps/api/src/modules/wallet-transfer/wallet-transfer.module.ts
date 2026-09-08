import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { CommerceModule } from '../commerce/commerce.module'
import { ObservabilityModule } from '../observability/observability.module'
import { WalletModule } from '../wallet/wallet.module'
import { WalletTransferController } from './wallet-transfer.controller'
import { WalletTransferService } from './wallet-transfer.service'

// PHASE Q (2026-08-31), Part 4 -- deliberately its OWN module, not folded
// into WalletModule: WalletModule is a low-level dependency of
// CommerceModule (WalletLedgerService), so WalletModule importing
// CommerceModule back (needed here for PaymentRiskService) would create a
// real circular dependency. This module sits "above" both instead.
@Module({
  imports: [AuthModule, AuditModule, ObservabilityModule, WalletModule, CommerceModule],
  controllers: [WalletTransferController],
  providers: [WalletTransferService],
  exports: [WalletTransferService]
})
export class WalletTransferModule {}
