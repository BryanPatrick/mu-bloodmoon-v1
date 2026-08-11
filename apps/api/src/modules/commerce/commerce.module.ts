import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { ObservabilityModule } from '../observability/observability.module'
import { PaymentsModule } from '../payments/payments.module'
import { CommerceController } from './commerce.controller'
import { CommerceService } from './commerce.service'
import { RechargeWebhookController } from './recharge-webhook.controller'
import { StoreAdminService } from './store-admin.service'

@Module({
  imports: [AuthModule, AuditModule, ObservabilityModule, PaymentsModule],
  controllers: [CommerceController, RechargeWebhookController],
  providers: [CommerceService, StoreAdminService]
})
export class CommerceModule {}
