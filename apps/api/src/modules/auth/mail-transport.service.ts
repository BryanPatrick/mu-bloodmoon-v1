import { Injectable, ServiceUnavailableException } from '@nestjs/common'

export type MailMessage = {
  to: string
  subject: string
  text: string
}

export interface MailTransport {
  send(message: MailMessage): Promise<void>
}

/**
 * No transactional-email provider has been approved for this deployment yet
 * (see docs/handoff/auth-recovery-provider-blocker.md). This transport never
 * fabricates a delivered email: it fails loudly so callers must treat the
 * message as undelivered. The only exception is a narrow, explicit test-only
 * bypass that keeps the last message in memory for assertions -- it never
 * writes to disk/console and is inert unless NODE_ENV is exactly 'test'.
 */
@Injectable()
export class MailTransportService implements MailTransport {
  private lastSentForTest: MailMessage | null = null

  async send(message: MailMessage): Promise<void> {
    if (process.env.NODE_ENV === 'test' && process.env.AUTH_MAIL_TEST_BYPASS === '1') {
      this.lastSentForTest = message
      return
    }
    throw new ServiceUnavailableException('O envio de e-mails nao esta configurado.')
  }

  consumeLastSentForTest(): MailMessage | null {
    if (process.env.NODE_ENV !== 'test') return null
    const message = this.lastSentForTest
    this.lastSentForTest = null
    return message
  }
}
