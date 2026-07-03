import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { AccountController, AccountsController } from './accounts.controller'
import { AccountsService } from './accounts.service'

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [AccountController, AccountsController],
  providers: [AccountsService],
  exports: [AccountsService]
})
export class AccountsModule {}
