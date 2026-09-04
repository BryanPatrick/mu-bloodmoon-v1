import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { BetaRewardsModule } from '../beta-rewards/beta-rewards.module'
import { AdminBugReportsController, PlayerBugReportsController } from './bug-hunters.controller'
import { BugHuntersService } from './bug-hunters.service'

@Module({
  imports: [AuthModule, AuditModule, BetaRewardsModule],
  controllers: [PlayerBugReportsController, AdminBugReportsController],
  providers: [BugHuntersService],
  exports: [BugHuntersService]
})
export class BugHuntersModule {}
