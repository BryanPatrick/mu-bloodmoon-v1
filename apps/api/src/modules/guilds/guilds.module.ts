import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { GuildsAdminController } from './guilds-admin.controller'
import { GuildsAdminService } from './guilds-admin.service'
import { GuildsController } from './guilds.controller'
import { GuildsMediaService } from './guilds-media.service'
import { GuildsService } from './guilds.service'

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [GuildsController, GuildsAdminController],
  providers: [GuildsService, GuildsAdminService, GuildsMediaService],
  exports: [GuildsService]
})
export class GuildsModule {}
