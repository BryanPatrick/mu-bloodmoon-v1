import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { GmController } from './gm.controller'
import { GmService } from './gm.service'
import { GmEventsController } from './gm-events.controller'
import { GmEventsService } from './gm-events.service'
import { EventExecutorFactory } from './event-executors/event-executor.factory'
import { GameBridgeEventExecutor } from './event-executors/game-bridge-event-executor'
import { PortalEventExecutor } from './event-executors/portal-event-executor'

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [GmController, GmEventsController],
  providers: [GmService, GmEventsService, EventExecutorFactory, PortalEventExecutor, GameBridgeEventExecutor],
  exports: [GmService, GmEventsService]
})
export class GmModule {}
