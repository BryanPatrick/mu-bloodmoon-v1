import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { AdminErrorsController, AdminAlertsController } from './admin-errors.controller'
import { AdminObservabilityController } from './admin-observability.controller'
import { AdminObservabilityService } from './admin-observability.service'

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [
    AdminObservabilityController,
    AdminErrorsController,
    AdminAlertsController
  ],
  providers: [AdminObservabilityService]
})
export class AdminObservabilityModule {}
