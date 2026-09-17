import { createServer } from 'node:http'

// Phase 6 only: expose exactly one local disposable-DB webhook route.
if (process.env.ASAAS_PHASE6_APPROVED !== 'true') throw new Error('PHASE6_NOT_APPROVED')
const publicPath = '/api/payments/webhooks/asaas'
const server = createServer(async (request, response) => {
  if (request.method !== 'POST' || request.url !== publicPath) {
    response.writeHead(404).end()
    return
  }
  const chunks = []
  let length = 0
  for await (const chunk of request) {
    length += chunk.length
    if (length > 65536) {
      response.writeHead(413).end()
      return
    }
    chunks.push(chunk)
  }
  try {
    const upstream = await fetch('http://127.0.0.1:37118' + publicPath, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'asaas-access-token': request.headers['asaas-access-token'] || ''
      },
      body: Buffer.concat(chunks)
    })
    response.writeHead(upstream.status).end()
  } catch {
    response.writeHead(503).end()
  }
})
server.listen(37117, '127.0.0.1', () => console.log('PHASE6_WEBHOOK_PROXY_READY'))
