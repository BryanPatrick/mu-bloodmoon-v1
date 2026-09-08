import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { GameAccountIdentityModule } from '../game-account-identity/game-account-identity.module'
import { AccountController, AccountsController } from './accounts.controller'
import { AccountDeletionController } from './account-deletion.controller'
import { AccountDeletionService } from './account-deletion.service'
import { AccountDeletionRequestController } from './account-deletion-request.controller'
import { AccountDeletionRequestService } from './account-deletion-request.service'
import { AccountLifecycleBridgeService } from './account-lifecycle-bridge.service'
import { AccountsService } from './accounts.service'

@Module({
  imports: [AuditModule, AuthModule, GameAccountIdentityModule],
  controllers: [AccountController, AccountsController, AccountDeletionController, AccountDeletionRequestController],
  providers: [AccountsService, AccountDeletionService, AccountDeletionRequestService, AccountLifecycleBridgeService],
  exports: [AccountsService, AccountDeletionService, AccountDeletionRequestService, AccountLifecycleBridgeService]
})
export class AccountsModule {}
