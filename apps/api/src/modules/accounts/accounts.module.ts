import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { AccountController, AccountsController } from './accounts.controller'
import { AccountDeletionController } from './account-deletion.controller'
import { AccountDeletionService } from './account-deletion.service'
import { AccountDeletionRequestController } from './account-deletion-request.controller'
import { AccountDeletionRequestService } from './account-deletion-request.service'
import { AccountsService } from './accounts.service'

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [AccountController, AccountsController, AccountDeletionController, AccountDeletionRequestController],
  providers: [AccountsService, AccountDeletionService, AccountDeletionRequestService],
  exports: [AccountsService, AccountDeletionService, AccountDeletionRequestService]
})
export class AccountsModule {}
