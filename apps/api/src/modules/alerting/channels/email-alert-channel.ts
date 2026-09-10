import { Injectable } from '@nestjs/common'
import { MailTransportService } from '../../auth/mail-transport.service'
import type { AlertChannel } from '../alert-channel.interface'
import { formatPayloadAsEmailText, formatPayloadSubject, type SafeAlertPayload } from '../alert-payload'
import { emailAlertRecipients, isEmailChannelEnabled } from '../alerting.env'

// Reuses the existing, already-in-production MailTransportService
// (apps/api/src/modules/auth/mail-transport.service.ts) exactly the way
// account-deletion-request.service.ts already does -- no new SMTP
// transport is created for alerting. nodemailer accepts a comma-separated
// `to` string natively, so ALERT_EMAIL_TO can list multiple recipients
// without this channel needing to send one message per address.
@Injectable()
export class EmailAlertChannel implements AlertChannel {
  readonly name = 'email'

  constructor(private readonly mailTransport: MailTransportService) {}

  isEnabled(): boolean {
    return isEmailChannelEnabled()
  }

  async send(payload: SafeAlertPayload): Promise<void> {
    await this.mailTransport.send({
      to: emailAlertRecipients(),
      subject: formatPayloadSubject(payload),
      text: formatPayloadAsEmailText(payload)
    })
  }
}
