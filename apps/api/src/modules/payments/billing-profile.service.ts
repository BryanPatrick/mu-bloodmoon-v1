import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AsaasPaymentProvider } from './asaas.provider'
import { assertAsaasCreationEnabled, loadAsaasConfig } from './asaas.config'
import { BillingEnvelopeInvalidError, BillingKeyNotConfiguredError, keyVersionOf, openField, sealField } from './billing-crypto'

// Thin wrappers binding the generic, version-aware billing-crypto module
// to BillingProfile's two real fields, and translating its typed errors
// into the same NestJS exception this service already threw for these
// conditions (ServiceUnavailableException) -- API behavior for a
// misconfigured/missing key or a corrupt envelope is unchanged from
// before this file started using billing-crypto.ts.
function seal(value: string, accountId: string, fieldName: 'legalName' | 'cpfCnpj'): string {
  try {
    return sealField(value, accountId, fieldName)
  } catch (error) {
    if (error instanceof BillingKeyNotConfiguredError) throw new ServiceUnavailableException('BILLING_PII_KEY_NOT_CONFIGURED')
    throw error
  }
}

function open(value: string, accountId: string, fieldName: 'legalName' | 'cpfCnpj'): string {
  try {
    return openField(value, accountId, fieldName)
  } catch (error) {
    if (error instanceof BillingKeyNotConfiguredError) throw new ServiceUnavailableException('BILLING_PII_KEY_NOT_CONFIGURED')
    if (error instanceof BillingEnvelopeInvalidError) throw new ServiceUnavailableException('BILLING_PII_ENVELOPE_INVALID')
    // A GCM auth-tag failure (wrong key, wrong account/field AAD, or
    // tampered ciphertext) lands here -- surfaced the same way as an
    // invalid envelope, never as a decrypted-but-wrong plaintext.
    throw new ServiceUnavailableException('BILLING_PII_ENVELOPE_INVALID')
  }
}

@Injectable()
export class BillingProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasPaymentProvider
  ) {}

  // Read-only rotation inventory. Counts profiles depending on each key,
  // without decrypting or returning account IDs, names, or documents.
  async keyVersionInventory() {
    const byVersion: Record<string, number> = {}
    let totalProfiles = 0
    let mixedProfiles = 0
    let malformedProfiles = 0
    let cursor: string | undefined
    while (true) {
      const rows = await this.prisma.billingProfile.findMany({
        select: { id: true, legalNameCiphertext: true, cpfCnpjCiphertext: true },
        orderBy: { id: 'asc' }, take: 250,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
      })
      if (rows.length === 0) break
      for (const row of rows) {
        totalProfiles++
        const envelopes = [row.legalNameCiphertext, row.cpfCnpjCiphertext]
        if (envelopes.some((value) => {
          const parts = value.split('.')
          return !parts.every(Boolean) ||
            (parts.length === 5 ? parts[0] !== '1' : parts.length === 4 ? parts[0] !== 'v1' : true) ||
            !/^v[1-9][0-9]{0,3}$/.test(keyVersionOf(value))
        })) {
          malformedProfiles++
          continue
        }
        const versions = new Set(envelopes.map(keyVersionOf))
        if (versions.size > 1) mixedProfiles++
        for (const version of versions) byVersion[version] = (byVersion[version] || 0) + 1
      }
      cursor = rows[rows.length - 1].id
      if (rows.length < 250) break
    }
    return { totalProfiles, byVersion, mixedProfiles, malformedProfiles }
  }

  async saveForAccount(
    accountId: string,
    input: { legalName: string; cpfCnpj: string; country?: string }
  ) {
    assertAsaasCreationEnabled()
    const legalName = typeof input.legalName === 'string' ? input.legalName.trim() : ''
    const cpfCnpj = typeof input.cpfCnpj === 'string' ? input.cpfCnpj.replace(/\D/g, '') : ''
    if (
      !legalName ||
      legalName.length < 3 ||
      legalName.length > 190 ||
      !/^(\d{11}|\d{14})$/.test(cpfCnpj || '') ||
      (input.country || 'BR') !== 'BR'
    ) {
      throw new BadRequestException('Dados de faturamento invalidos.')
    }
    const existing = await this.prisma.billingProfile.findUnique({ where: { accountId } })
    if (
      existing &&
      open(existing.legalNameCiphertext, accountId, 'legalName') === legalName &&
      open(existing.cpfCnpjCiphertext, accountId, 'cpfCnpj') === cpfCnpj
    ) {
      return { configured: true, country: 'BR' }
    }
    const customer = await this.prisma.providerCustomer.findFirst({
      where: { accountId, provider: 'asaas', environment: 'sandbox' }
    })
    if (customer)
      throw new ConflictException(
        'Perfil vinculado ao provedor; alteracao exige reconciliacao manual.'
      )
    await this.prisma.billingProfile.upsert({
      where: { accountId },
      create: {
        accountId,
        legalNameCiphertext: seal(legalName, accountId, 'legalName'),
        cpfCnpjCiphertext: seal(cpfCnpj!, accountId, 'cpfCnpj'),
        country: 'BR'
      },
      update: {
        legalNameCiphertext: seal(legalName, accountId, 'legalName'),
        cpfCnpjCiphertext: seal(cpfCnpj!, accountId, 'cpfCnpj')
      }
    })
    return { configured: true, country: 'BR' }
  }

  async ensureAsaasCustomer(accountId: string): Promise<string> {
    assertAsaasCreationEnabled()
    if (!loadAsaasConfig().apiKey)
      throw new ServiceUnavailableException('ASAAS_API_KEY_MISSING')
    const profile = await this.prisma.billingProfile.findUnique({ where: { accountId } })
    if (!profile)
      throw new BadRequestException('Perfil de faturamento necessario para PIX.')
    const externalReference = `bm-account:${accountId}`
    const existing = await this.prisma.providerCustomer.findUnique({
      where: {
        accountId_provider_environment: { accountId, provider: 'asaas', environment: loadAsaasConfig().environment }
      }
    })
    if (existing?.providerCustomerId && existing.createState === 'CREATED')
      return existing.providerCustomerId
    let created = false
    if (!existing) {
      try {
        await this.prisma.providerCustomer.create({
          data: {
            accountId,
            provider: 'asaas',
            environment: loadAsaasConfig().environment,
            externalReference,
            createState: 'RESERVED'
          }
        })
        created = true
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'))
          throw error
      }
    }

    const mapping = await this.prisma.providerCustomer.findUniqueOrThrow({
      where: {
        accountId_provider_environment: { accountId, provider: 'asaas', environment: loadAsaasConfig().environment }
      }
    })
    if (mapping.providerCustomerId && mapping.createState === 'CREATED')
      return mapping.providerCustomerId
    if (!created) {
      const recovered = await this.asaas.findCustomerByExternalReference(externalReference)
      if (!recovered) {
        await this.prisma.providerCustomer.update({
          where: { id: mapping.id },
          data: { createState: 'RECONCILE_REQUIRED' }
        })
        throw new ServiceUnavailableException('ASAAS_CUSTOMER_RECONCILE_REQUIRED')
      }
      await this.prisma.providerCustomer.update({
        where: { id: mapping.id },
        data: { providerCustomerId: recovered, createState: 'CREATED' }
      })
      return recovered
    }

    try {
      const providerCustomerId = await this.asaas.createCustomer({
        legalName: open(profile.legalNameCiphertext, accountId, 'legalName'),
        cpfCnpj: open(profile.cpfCnpjCiphertext, accountId, 'cpfCnpj'),
        externalReference
      })
      await this.prisma.providerCustomer.update({
        where: { id: mapping.id },
        data: { providerCustomerId, createState: 'CREATED' }
      })
      return providerCustomerId
    } catch {
      await this.prisma.providerCustomer.update({
        where: { id: mapping.id },
        data: { createState: 'RECONCILE_REQUIRED' }
      })
      throw new ServiceUnavailableException('ASAAS_CUSTOMER_RECONCILE_REQUIRED')
    }
  }
}
