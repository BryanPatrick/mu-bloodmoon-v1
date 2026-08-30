import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { AccountController, AccountsController } from './accounts.controller'
import { AccountDeletionController } from './account-deletion.controller'
import { AccountDeletionService } from './account-deletion.service'
import { AccountsService } from './accounts.service'

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [AccountController, AccountsController, AccountDeletionController],
  providers: [AccountsService, AccountDeletionService],
  exports: [AccountsService, AccountDeletionService]
})
export class AccountsModule {}
