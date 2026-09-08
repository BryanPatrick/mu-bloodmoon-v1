import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import type { TransferWcPayload } from './wallet-transfer.service'
import { WalletTransferService } from './wallet-transfer.service'

@Controller('wallet')
export class WalletTransferController {
  constructor(private readonly walletTransfer: WalletTransferService) {}

  @Post('transfers')
  @UseGuards(JwtAuthGuard)
  transfer(@Body() payload: TransferWcPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.walletTransfer.transfer(user, payload)
  }

  @Get('transfers/history')
  @UseGuards(JwtAuthGuard)
  history(@CurrentUser() user: AuthenticatedUser) {
    return this.walletTransfer.listMyTransferHistory(user)
  }

  @Get('transfers/fee-info')
  @UseGuards(JwtAuthGuard)
  feeInfo() {
    return this.walletTransfer.getFeeInfo()
  }
}
