import { ServiceUnavailableException } from '@nestjs/common'

export const ASAAS_SANDBOX_URL = 'https://api-sandbox.asaas.com/v3'
export const ASAAS_PRODUCTION_URL = 'https://api.asaas.com/v3'

export type AsaasConfig = {
  enabled: boolean
  environment: 'sandbox' | 'production' | 'disabled'
  frontendEnabled: boolean
  paymentCreationEnabled: boolean
  webhookProcessingEnabled: boolean
  reconciliationEnabled: boolean
  apiKey: string
  webhookToken: string
  baseUrl: string
}

// Configuration alone never authorizes a charge. All operational flags default
// to false and production requires an explicit, exact environment/URL pairing.
export function loadAsaasConfig(): AsaasConfig {
  const enabled = process.env.ASAAS_ENABLED === 'true'
  const environment = process.env.ASAAS_ENVIRONMENT || 'disabled'
  const frontendEnabled = process.env.ASAAS_FRONTEND_ENABLED === 'true'
  const paymentCreationEnabled = process.env.ASAAS_PAYMENT_CREATION_ENABLED === 'true'
  const webhookProcessingEnabled = process.env.ASAAS_WEBHOOK_PROCESSING_ENABLED === 'true'
  const reconciliationEnabled = process.env.ASAAS_RECONCILIATION_ENABLED === 'true'
  const apiKey = process.env.ASAAS_API_KEY?.trim() || ''
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim() || ''
  const expectedUrl = environment === 'production' ? ASAAS_PRODUCTION_URL : ASAAS_SANDBOX_URL
  const baseUrl = process.env.ASAAS_BASE_URL || (environment === 'sandbox' ? ASAAS_SANDBOX_URL : '')
  if (enabled && !['sandbox', 'production'].includes(environment))
    throw new ServiceUnavailableException('ASAAS_ENVIRONMENT_INVALID')
  if (enabled && (baseUrl !== expectedUrl ||
    (environment === 'sandbox' && (!['development', 'test'].includes(process.env.NODE_ENV || '') ||
      (apiKey && !apiKey.startsWith('$aact_hmlg_')))) ||
    (environment === 'production' && (process.env.NODE_ENV !== 'production' ||
      (apiKey && !apiKey.startsWith('$aact_prod_')))))) {
    throw new ServiceUnavailableException('ASAAS_PROVIDER_CONFIG_INVALID')
  }
  if (enabled && environment === 'sandbox' && (process.env.NODE_ENV === 'development' || process.env.DATABASE_URL)) {
    let localDatabase = false
    try {
      const host = new URL(process.env.DATABASE_URL || '').hostname
      localDatabase = ['localhost', '127.0.0.1', '[::1]'].includes(host)
    } catch {
      // Missing/malformed DATABASE_URL cannot authorize sandbox writes.
    }
    if (!localDatabase) throw new ServiceUnavailableException('ASAAS_LOCAL_DATABASE_REQUIRED')
  }
  return {
    enabled, environment: environment as AsaasConfig['environment'], frontendEnabled,
    paymentCreationEnabled, webhookProcessingEnabled, reconciliationEnabled,
    apiKey, webhookToken, baseUrl
  }
}

export function assertAsaasCreationEnabled(): AsaasConfig {
  const config = loadAsaasConfig()
  if (!config.enabled || !config.frontendEnabled || !config.paymentCreationEnabled)
    throw new ServiceUnavailableException('PAYMENTS_DISABLED')
  if (!config.apiKey) throw new ServiceUnavailableException('ASAAS_API_KEY_MISSING')
  return config
}
