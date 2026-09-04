import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { BetaRewardsController } from './beta-rewards.controller'
import { BetaRewardsService } from './beta-rewards.service'

// normalizeEmail/hashNormalizedEmail are imported directly as plain
// functions from beta-lifecycle.service.ts (not via DI) -- no module
// dependency on BetaLifecycleModule is needed for that.
@Module({
  imports: [AuthModule, AuditModule],
  controllers: [BetaRewardsController],
  providers: [BetaRewardsService],
  exports: [BetaRewardsService]
})
export class BetaRewardsModule {}
