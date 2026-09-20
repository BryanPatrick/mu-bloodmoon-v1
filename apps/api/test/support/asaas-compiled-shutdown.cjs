// Runs the compiled Nest module lifecycle (not ts-jest) with an intentionally
// in-flight inbox sweep, then proves app.close() waits and prevents new work.
require('reflect-metadata')
const { NestFactory } = require('@nestjs/core')
const { AppModule } = require('../../dist/apps/api/src/app.module.js')
const { AsaasWebhookInboxWorker } = require('../../dist/apps/api/src/modules/commerce/asaas-webhook-inbox.worker.js')
const { PaymentWebhookEventService } = require('../../dist/apps/api/src/modules/payments/payment-webhook-event.service.js')

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false })
  const worker = app.get(AsaasWebhookInboxWorker)
  const events = app.get(PaymentWebhookEventService)
  let release = null
  events.claimNextAsaas = () => new Promise((resolve) => { release = () => resolve(null) })
  const active = worker.runOnce()
  for (let i = 0; i < 100 && !release; i++) await new Promise((resolve) => setTimeout(resolve, 10))
  if (!release) throw new Error('LOCAL_COMPILED_WORKER_DID_NOT_START')
  let closed = false
  const closing = app.close().then(() => { closed = true })
  await new Promise((resolve) => setTimeout(resolve, 50))
  if (closed) throw new Error('LOCAL_COMPILED_WORKER_DID_NOT_WAIT')
  release()
  await Promise.all([active, closing])
  if (await worker.runOnce() !== 0) throw new Error('LOCAL_COMPILED_WORKER_ACCEPTED_AFTER_STOP')
  process.stdout.write('COMPILED_WORKER_GRACEFUL_STOP_PASS\n')
}

main().catch(() => { process.stderr.write('COMPILED_WORKER_GRACEFUL_STOP_FAIL\n'); process.exitCode = 1 })
