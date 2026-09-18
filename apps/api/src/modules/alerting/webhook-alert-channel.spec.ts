import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { WebhookAlertChannel } from './channels/webhook-alert-channel'
import type { SafeAlertPayload } from './alert-payload'

describe('WebhookAlertChannel local delivery', () => {
  it('POSTs a safe JSON alert to a loopback receiver and observes its ACK', async () => {
    const previousEnabled = process.env.ALERT_WEBHOOK_ENABLED
    const previousUrl = process.env.ALERT_WEBHOOK_URL
    let resolveDelivery!: (value: { method: string; contentType: string; body: string }) => void
    const delivery = new Promise<{ method: string; contentType: string; body: string }>((resolve) => { resolveDelivery = resolve })
    const server = createServer((request, response) => {
      const chunks: Buffer[] = []
      request.on('data', (chunk: Buffer) => chunks.push(chunk))
      request.on('end', () => {
        resolveDelivery({ method: request.method || '', contentType: String(request.headers['content-type']), body: Buffer.concat(chunks).toString('utf8') })
        response.writeHead(200)
        response.end('ok')
      })
    })

    try {
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
      const address = server.address() as AddressInfo
      process.env.ALERT_WEBHOOK_ENABLED = 'true'
      process.env.ALERT_WEBHOOK_URL = `http://127.0.0.1:${address.port}/alerts`
      const payload: SafeAlertPayload = {
        correlationId: 'local-test', service: 'blood-moon-api', module: 'commerce',
        alertType: 'ASAAS_WALLET_CREDIT_FAILED', severity: 'CRITICAL', title: 'Local delivery test',
        summary: 'Synthetic alert only', occurredAt: '2026-09-18T00:00:00.000Z',
        firstSeenAt: '2026-09-18T00:00:00.000Z', occurrenceCount: 1, detailRef: 'admin/alertas#local-test'
      }
      const channel = new WebhookAlertChannel()
      expect(channel.isEnabled()).toBe(true)
      await channel.send(payload)
      const received = await delivery
      expect(received.method).toBe('POST')
      expect(received.contentType).toBe('application/json')
      expect(JSON.parse(received.body)).toEqual(payload)
    } finally {
      if (previousEnabled === undefined) delete process.env.ALERT_WEBHOOK_ENABLED
      else process.env.ALERT_WEBHOOK_ENABLED = previousEnabled
      if (previousUrl === undefined) delete process.env.ALERT_WEBHOOK_URL
      else process.env.ALERT_WEBHOOK_URL = previousUrl
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})
