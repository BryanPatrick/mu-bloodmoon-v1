import { ServiceUnavailableException } from '@nestjs/common'

export const ASAAS_SANDBOX_URL = 'https://api-sandbox.asaas.com/v3'

export type AsaasConfig = {
  enabled: boolean
  apiKey: string
  webhookToken: string
  baseUrl: typeof ASAAS_SANDBOX_URL
}

// This phase deliberately cannot select the production endpoint. Even a
// misconfigured ASAAS_BASE_URL or production API key fails before fetch().
export function loadAsaasConfig(): AsaasConfig {
  const enabled = process.env.ASAAS_ENABLED === 'true'
  const environment = process.env.ASAAS_ENVIRONMENT || 'disabled'
  const baseUrl = process.env.ASAAS_BASE_URL || ASAAS_SANDBOX_URL
  const apiKey = process.env.ASAAS_API_KEY?.trim() || ''
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim() || ''
  if (
    enabled &&
    (!['development', 'test'].includes(process.env.NODE_ENV || '') ||
      environment !== 'sandbox' ||
      baseUrl !== ASAAS_SANDBOX_URL ||
      (apiKey.length > 0 && !apiKey.startsWith('$aact_hmlg_')))
  ) {
    throw new ServiceUnavailableException('ASAAS_SANDBOX_CONFIG_INVALID')
  }
  if (enabled && (process.env.NODE_ENV === 'development' || process.env.DATABASE_URL)) {
    let localDatabase = false
    try {
      const host = new URL(process.env.DATABASE_URL || '').hostname
      localDatabase = ['localhost', '127.0.0.1', '[::1]'].includes(host)
    } catch {
      // Missing/malformed DATABASE_URL cannot authorize sandbox writes.
    }
    if (!localDatabase) throw new ServiceUnavailableException('ASAAS_LOCAL_DATABASE_REQUIRED')
  }
  return { enabled, apiKey, webhookToken, baseUrl: ASAAS_SANDBOX_URL }
}
