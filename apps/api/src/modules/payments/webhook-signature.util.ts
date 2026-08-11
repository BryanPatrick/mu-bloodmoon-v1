import { createHmac, timingSafeEqual } from 'node:crypto'

// Confirmed against Mercado Pago's live webhook signature docs
// (your-integrations/notifications/webhooks): the x-signature header is
// "ts=<unix_ts>,v1=<hex_hmac_sha256>". The HMAC is computed over a manifest
// string built from the notification's data.id (read from the QUERY STRING,
// not the JSON body -- the body repeats data.id but the manifest uses the
// query-string value per Mercado Pago's own SDK reference implementation),
// the x-request-id header, and the ts value parsed out of x-signature
// itself:
//
//   id:{data.id};request-id:{x-request-id};ts:{ts};
//
// Raw request body bytes are never part of this computation.
export function verifyMercadoPagoSignature(input: {
  signatureHeader: string | undefined
  requestId: string | undefined
  dataId: string | undefined
  secret: string
}): boolean {
  const { signatureHeader, requestId, dataId, secret } = input
  if (!signatureHeader || !requestId || !dataId || !secret) return false

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const [key, value] = part.split('=')
      return [key?.trim(), value?.trim()]
    })
  )
  const ts = parts.ts
  const receivedHash = parts.v1
  if (!ts || !receivedHash) return false

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const expectedHash = createHmac('sha256', secret).update(manifest).digest('hex')

  const expectedBuffer = Buffer.from(expectedHash, 'hex')
  const receivedBuffer = Buffer.from(receivedHash, 'hex')
  if (expectedBuffer.length !== receivedBuffer.length) return false

  return timingSafeEqual(expectedBuffer, receivedBuffer)
}
