import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { GmController } from './gm.controller'
import { GmService } from './gm.service'
import { GmEventsController } from './gm-events.controller'
import { GmEventsService } from './gm-events.service'

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [GmController, GmEventsController],
  providers: [GmService, GmEventsService],
  exports: [GmService, GmEventsService]
})
export class GmModule {}
