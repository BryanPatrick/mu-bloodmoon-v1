import { Injectable, Logger, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common'
import nodemailer, { type Transporter } from 'nodemailer'

export type MailMessage = {
  to: string
  subject: string
  text: string
}

export interface MailTransport {
  send(message: MailMessage): Promise<void>
}

@Injectable()
export class MailTransportService implements MailTransport, OnModuleDestroy {
  private readonly logger = new Logger(MailTransportService.name)
  private lastSentForTest: MailMessage | null = null
  private transporter: Transporter | null = null

  async send(message: MailMessage): Promise<void> {
    if (process.env.NODE_ENV === 'test' && process.env.AUTH_MAIL_TEST_BYPASS === '1') {
      this.lastSentForTest = message
      return
    }

    const config = this.smtpConfig()
    try {
      await this.getTransporter(config).sendMail({
        from: { name: config.fromName, address: config.fromEmail },
        to: message.to,
        subject: message.subject,
        text: message.text
      })
    } catch {
      this.logger.error('SMTP delivery failed')
      throw new ServiceUnavailableException('O envio de e-mails esta temporariamente indisponivel.')
    }
  }

  consumeLastSentForTest(): MailMessage | null {
    if (process.env.NODE_ENV !== 'test') return null
    const message = this.lastSentForTest
    this.lastSentForTest = null
    return message
  }

  onModuleDestroy() {
    this.transporter?.close()
    this.transporter = null
  }

  private getTransporter(config: ReturnType<MailTransportService['smtpConfig']>) {
    if (this.transporter) return this.transporter
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: config.requireTls,
      auth: {
        user: config.user,
        pass: config.password
      },
      tls: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
      },
      connectionTimeout: config.timeoutMs,
      greetingTimeout: config.timeoutMs,
      socketTimeout: config.timeoutMs
    })
    return this.transporter
  }

  private smtpConfig() {
    const host = this.required('SMTP_HOST')
    const port = this.port(this.required('SMTP_PORT'))
    const secure = this.boolean(this.required('SMTP_SECURE'), 'SMTP_SECURE')
    const requireTls = this.boolean(
      process.env.SMTP_REQUIRE_TLS?.trim() || (secure ? 'false' : 'true'),
      'SMTP_REQUIRE_TLS'
    )
    const user = this.required('SMTP_USER')
    const password = this.required('SMTP_PASSWORD')
    const fromEmail = this.required('SMTP_FROM_EMAIL').toLowerCase()
    const fromName = this.required('SMTP_FROM_NAME')

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
      throw new ServiceUnavailableException('O envio de e-mails nao esta configurado corretamente.')
    }
    if (secure && port !== 465) {
      throw new ServiceUnavailableException('O envio de e-mails nao esta configurado corretamente.')
    }
    if (!secure && !requireTls) {
      throw new ServiceUnavailableException('O envio de e-mails nao esta configurado com TLS.')
    }

    return {
      host,
      port,
      secure,
      requireTls,
      user,
      password,
      fromEmail,
      fromName,
      timeoutMs: this.positiveInteger(process.env.SMTP_TIMEOUT_MS, 10_000)
    }
  }

  private required(name: string) {
    const value = process.env[name]?.trim()
    if (!value) {
      throw new ServiceUnavailableException('O envio de e-mails nao esta configurado.')
    }
    return value
  }

  private port(value: string) {
    const port = Number(value)
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
      throw new ServiceUnavailableException('O envio de e-mails nao esta configurado corretamente.')
    }
    return port
  }

  private boolean(value: string, name: string) {
    if (value === 'true') return true
    if (value === 'false') return false
    throw new ServiceUnavailableException(`${name} deve ser true ou false.`)
  }

  private positiveInteger(value: string | undefined, fallback: number) {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
  }
}
