import { Injectable } from '@nestjs/common'
import type { AlertChannel } from '../alert-channel.interface'
import type { SafeAlertPayload } from '../alert-payload'
import { isWebhookChannelEnabled, webhookAlertUrl } from '../alerting.env'

const REQUEST_TIMEOUT_MS = 5000

// Generic JSON POST -- no existing webhook-sender exists anywhere in this
// codebase to reuse (integrations-discord is inbound/read-only, a bot
// polling the site, not a webhook sender; confirmed during this phase's
// audit). Payload is the same SafeAlertPayload the email channel renders
// to text, so a receiving endpoint (a small relay, a Discord-compatible
// bridge, a generic ops inbox) can be built independently of this app
// without needing any Discord-specific formatting baked in here.
@Injectable()
export class WebhookAlertChannel implements AlertChannel {
  readonly name = 'webhook'

  isEnabled(): boolean {
    return isWebhookChannelEnabled()
  }

  async send(payload: SafeAlertPayload): Promise<void> {
    const controller = new AbortController()
    const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch(webhookAlertUrl(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      })
      if (!response.ok) {
        throw new Error(`Webhook responded with status ${response.status}`)
      }
    } finally {
      clearTimeout(timeoutHandle)
    }
  }
}
