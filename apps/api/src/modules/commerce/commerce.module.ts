import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { ObservabilityModule } from '../observability/observability.module'
import { PaymentsModule } from '../payments/payments.module'
import { WalletModule } from '../wallet/wallet.module'
import { ChargebackCaseService } from './chargeback-case.service'
import { CommerceController } from './commerce.controller'
import { CommerceService } from './commerce.service'
import { LegacyCatalogConfigService } from './legacy-catalog-config.service'
import { LegacyCatalogEffectiveStateService } from './legacy-catalog-effective-state.service'
import { PaymentReconciliationService } from './payment-reconciliation.service'
import { PaymentRiskController } from './payment-risk.controller'
import { PaymentRiskService } from './payment-risk.service'
import { RechargeWebhookController } from './recharge-webhook.controller'
import { StoreAdminService } from './store-admin.service'

@Module({
  imports: [AuthModule, AuditModule, ObservabilityModule, PaymentsModule, WalletModule],
  controllers: [CommerceController, RechargeWebhookController, PaymentRiskController],
  providers: [
    CommerceService,
    StoreAdminService,
    LegacyCatalogConfigService,
    LegacyCatalogEffectiveStateService,
    PaymentReconciliationService,
    PaymentRiskService,
    ChargebackCaseService
  ],
  exports: [PaymentReconciliationService, PaymentRiskService, ChargebackCaseService]
})
export class CommerceModule {}
