import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { BetaLifecycleController } from './beta-lifecycle.controller'
import { BetaLifecycleService } from './beta-lifecycle.service'

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [BetaLifecycleController],
  providers: [BetaLifecycleService],
  exports: [BetaLifecycleService]
})
export class BetaLifecycleModule {}
