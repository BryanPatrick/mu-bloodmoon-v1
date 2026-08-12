import nodemailer from 'nodemailer'
import { MailTransportService } from '../src/modules/auth/mail-transport.service'

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: jest.fn() }
}))

const environmentKeys = [
  'NODE_ENV',
  'AUTH_MAIL_TEST_BYPASS',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_REQUIRE_TLS',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM_EMAIL',
  'SMTP_FROM_NAME',
  'SMTP_TIMEOUT_MS'
] as const

describe('MailTransportService', () => {
  const original = new Map(environmentKeys.map((key) => [key, process.env[key]]))
  const sendMail = jest.fn()
  const close = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NODE_ENV = 'production'
    delete process.env.AUTH_MAIL_TEST_BYPASS
    process.env.SMTP_HOST = 'mail.example.invalid'
    process.env.SMTP_PORT = '465'
    process.env.SMTP_SECURE = 'true'
    process.env.SMTP_REQUIRE_TLS = 'false'
    process.env.SMTP_USER = 'no-reply@example.invalid'
    process.env.SMTP_PASSWORD = 'test-placeholder-value'
    process.env.SMTP_FROM_EMAIL = 'no-reply@example.invalid'
    process.env.SMTP_FROM_NAME = 'BloodMoon'
    process.env.SMTP_TIMEOUT_MS = '8000'
    ;(nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail, close })
    sendMail.mockResolvedValue({ messageId: 'test-message' })
  })

  afterAll(() => {
    for (const [key, value] of original) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  it('sends through TLS SMTP without exposing credentials in the message', async () => {
    const service = new MailTransportService()
    await service.send({
      to: 'player@example.invalid',
      subject: 'Password reset',
      text: 'Reset instructions'
    })

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'mail.example.invalid',
        port: 465,
        secure: true,
        tls: expect.objectContaining({ minVersion: 'TLSv1.2', rejectUnauthorized: true })
      })
    )
    expect(sendMail).toHaveBeenCalledWith({
      from: { name: 'BloodMoon', address: 'no-reply@example.invalid' },
      to: 'player@example.invalid',
      subject: 'Password reset',
      text: 'Reset instructions'
    })
  })

  it('fails closed when SMTP configuration is missing', async () => {
    delete process.env.SMTP_PASSWORD
    const service = new MailTransportService()
    await expect(
      service.send({ to: 'player@example.invalid', subject: 'Reset', text: 'Instructions' })
    ).rejects.toMatchObject({ status: 503 })
    expect(nodemailer.createTransport).not.toHaveBeenCalled()
  })

  it('requires STARTTLS when using a non-secure SMTP socket', async () => {
    process.env.SMTP_PORT = '587'
    process.env.SMTP_SECURE = 'false'
    process.env.SMTP_REQUIRE_TLS = 'false'
    const service = new MailTransportService()
    await expect(
      service.send({ to: 'player@example.invalid', subject: 'Reset', text: 'Instructions' })
    ).rejects.toMatchObject({ status: 503 })
  })

  it('keeps the explicit test-only bypass provider independent', async () => {
    process.env.NODE_ENV = 'test'
    process.env.AUTH_MAIL_TEST_BYPASS = '1'
    delete process.env.SMTP_HOST
    const service = new MailTransportService()
    const message = { to: 'player@example.invalid', subject: 'Reset', text: 'Instructions' }
    await service.send(message)
    expect(service.consumeLastSentForTest()).toEqual(message)
    expect(nodemailer.createTransport).not.toHaveBeenCalled()
  })
})
