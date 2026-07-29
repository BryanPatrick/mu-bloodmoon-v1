import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { CommunityAdminController } from './community-admin.controller'
import { CommunityAdminService } from './community-admin.service'
import { CommunityController } from './community.controller'
import { CommunityService } from './community.service'

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [CommunityController, CommunityAdminController],
  providers: [CommunityService, CommunityAdminService]
})
export class CommunityModule {}
