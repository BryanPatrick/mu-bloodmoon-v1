import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { ObservabilityModule } from '../observability/observability.module'
import { RoadmapAdminController, RoadmapPublicController } from './roadmap.controller'
import { RoadmapService } from './roadmap.service'

@Module({
  imports: [AuthModule, AuditModule, ObservabilityModule],
  controllers: [RoadmapPublicController, RoadmapAdminController],
  providers: [RoadmapService]
})
export class RoadmapModule {}
