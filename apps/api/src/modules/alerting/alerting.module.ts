import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { GameDataModule } from '../game-data/game-data.module'
import { AlertDispatchService, alertChannelsProvider } from './alert-dispatch.service'
import { AlertSweepService } from './alert-sweep.service'
import { EmailAlertChannel } from './channels/email-alert-channel'
import { WebhookAlertChannel } from './channels/webhook-alert-channel'
import { GameBridgeHeartbeatAlertService } from './gamebridge-heartbeat-alert.service'
import { Http5xxBurstDetector } from './http-5xx-burst-detector'
import { InternalOpsEventsController } from './internal-ops-events.controller'
import { InternalOpsEventsGuard } from './internal-ops-events.guard'
import { AsaasOperationalAlertService } from './asaas-operational-alert.service'

// Phase AA -- proactive alerting foundation. ObservabilityService/
// SystemAlert/SystemError/OperationalEvent already do the hard part
// (detection, fingerprint dedup, storage); this module adds only the
// missing outbound layer: dedup/cooldown-aware notification (email +
// generic webhook), a 5xx-burst detector, and a read-only GameBridge
// heartbeat alert poller. Deliberately does NOT import ObservabilityModule
// -- ObservabilityModule is @Global() (observability.module.ts), so
// GameBridgeHeartbeatAlertService can inject ObservabilityService without
// a module-level edge back to it, keeping this a one-directional
// dependency (ObservabilityModule -> this module, for SafeExceptionFilter
// to use Http5xxBurstDetector) rather than a cycle.
@Module({
  imports: [AuthModule, GameDataModule],
  controllers: [InternalOpsEventsController],
  providers: [
    EmailAlertChannel,
    WebhookAlertChannel,
    alertChannelsProvider,
    AlertDispatchService,
    AlertSweepService,
    Http5xxBurstDetector,
    GameBridgeHeartbeatAlertService,
    AsaasOperationalAlertService,
    InternalOpsEventsGuard
  ],
  exports: [Http5xxBurstDetector, AlertDispatchService, AlertSweepService, AsaasOperationalAlertService]
})
export class AlertingModule {}
