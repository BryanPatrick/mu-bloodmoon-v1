import { Inject, Injectable, Logger } from '@nestjs/common'
import type { AlertChannel } from './alert-channel.interface'
import type { SafeAlertPayload } from './alert-payload'
import { EmailAlertChannel } from './channels/email-alert-channel'
import { WebhookAlertChannel } from './channels/webhook-alert-channel'

export const ALERT_CHANNELS = 'ALERT_CHANNELS'

export interface AlertChannelResult {
  channel: string
  ok: boolean
  error?: string
}

// Fans a single safe payload out to every ENABLED channel in parallel.
// One channel failing (e.g. SMTP down) never blocks another (e.g.
// webhook) -- Promise.allSettled, never Promise.all. Channels that are
// disabled (not configured) are skipped, not attempted-and-failed, so a
// deploy with only email configured never logs a spurious webhook error.
@Injectable()
export class AlertDispatchService {
  private readonly logger = new Logger(AlertDispatchService.name)

  constructor(@Inject(ALERT_CHANNELS) private readonly channels: AlertChannel[]) {}

  async dispatch(payload: SafeAlertPayload): Promise<AlertChannelResult[]> {
    const enabledChannels = this.channels.filter((channel) => channel.isEnabled())
    if (enabledChannels.length === 0) {
      return []
    }

    const settled = await Promise.allSettled(enabledChannels.map((channel) => channel.send(payload)))
    return settled.map((result, index) => {
      const channel = enabledChannels[index]
      if (result.status === 'fulfilled') {
        return { channel: channel.name, ok: true }
      }
      const error = result.reason instanceof Error ? result.reason.message : 'Unknown channel error'
      this.logger.error(`Alert channel "${channel.name}" failed: ${error}`)
      return { channel: channel.name, ok: false, error }
    })
  }
}

export const alertChannelsProvider = {
  provide: ALERT_CHANNELS,
  useFactory: (email: EmailAlertChannel, webhook: WebhookAlertChannel): AlertChannel[] => [email, webhook],
  inject: [EmailAlertChannel, WebhookAlertChannel]
}
