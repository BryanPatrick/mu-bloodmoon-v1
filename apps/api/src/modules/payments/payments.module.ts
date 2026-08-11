import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { ObservabilityModule } from '../observability/observability.module'
import { PAYMENT_PROVIDER } from './payment-provider.interface'
import { MercadoPagoProvider } from './mercadopago.provider'
import { PaymentWebhookEventService } from './payment-webhook-event.service'

// Deliberately NOT importing ThrottlerModule.forRoot() here: @nestjs/throttler
// is effectively global once registered, and this app already registers it
// once in media.module.ts (limit: 10/60s, sized for uploads) -- a second
// forRoot() call here would silently collide with that one rather than
// creating an isolated bucket. The webhook route gets its own small,
// self-contained rate check instead (webhook-rate-limit.util.ts), matching
// this codebase's existing hand-rolled style (no ConfigModule/ValidationPipe
// elsewhere either).
@Module({
  imports: [AuditModule, ObservabilityModule],
  providers: [
    MercadoPagoProvider,
    { provide: PAYMENT_PROVIDER, useExisting: MercadoPagoProvider },
    PaymentWebhookEventService
  ],
  exports: [PAYMENT_PROVIDER, PaymentWebhookEventService]
})
export class PaymentsModule {}
