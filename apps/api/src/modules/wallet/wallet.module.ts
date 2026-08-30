import { Module } from '@nestjs/common'
import { WalletLedgerService } from './wallet-ledger.service'

@Module({
  providers: [WalletLedgerService],
  exports: [WalletLedgerService]
})
export class WalletModule {}
