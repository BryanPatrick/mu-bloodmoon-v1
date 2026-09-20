// Preloaded only by the Phase 7F local compiled-artifact test. Fail closed:
// no network request may reach Asaas or another external service.
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const timedOut = new Set()

global.fetch = async (input) => {
  const url = new URL(String(input))
  if (url.origin !== 'https://api-sandbox.asaas.com') throw new Error('LOCAL_TEST_EXTERNAL_FETCH_BLOCKED')
  const match = /^\/v3\/payments\/([A-Za-z0-9._:-]+)$/.exec(url.pathname)
  if (!match) throw new Error('LOCAL_TEST_PROVIDER_ROUTE_BLOCKED')
  const paymentId = match[1]
  if (paymentId.includes('_timeout_') && !timedOut.has(paymentId)) {
    timedOut.add(paymentId)
    throw new Error('LOCAL_TEST_PROVIDER_TIMEOUT')
  }
  const recharge = await prisma.rechargeIntent.findFirst({
    where: { provider: 'asaas', providerEnvironment: 'sandbox', externalOrderId: paymentId }
  })
  if (!recharge) return new Response('{}', { status: 404 })
  const mapping = await prisma.providerCustomer.findUnique({
    where: { accountId_provider_environment: { accountId: recharge.accountId, provider: 'asaas', environment: 'sandbox' } }
  })
  return new Response(JSON.stringify({
    id: paymentId,
    customer: mapping.providerCustomerId,
    externalReference: recharge.externalReference,
    status: 'RECEIVED',
    value: paymentId.includes('_review_') ? 11 : 10,
    billingType: 'PIX'
  }), { status: 200, headers: { 'content-type': 'application/json' } })
}
