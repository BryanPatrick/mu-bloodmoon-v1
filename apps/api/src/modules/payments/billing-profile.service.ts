import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException
} from '@nestjs/common'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AsaasPaymentProvider } from './asaas.provider'
import { loadAsaasConfig } from './asaas.config'

function billingKey(): Buffer {
  const encoded = process.env.BILLING_PII_KEY_B64 || ''
  const key = Buffer.from(encoded, 'base64')
  if (key.length !== 32) throw new ServiceUnavailableException('BILLING_PII_KEY_NOT_CONFIGURED')
  return key
}

function seal(value: string, accountId: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', billingKey(), iv)
  cipher.setAAD(Buffer.from(accountId))
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url')
  ].join('.')
}

function open(value: string, accountId: string): string {
  const [version, iv, tag, encrypted] = value.split('.')
  if (version !== 'v1' || !iv || !tag || !encrypted)
    throw new ServiceUnavailableException('BILLING_PII_ENVELOPE_INVALID')
  const decipher = createDecipheriv('aes-256-gcm', billingKey(), Buffer.from(iv, 'base64url'))
  decipher.setAAD(Buffer.from(accountId))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final()
  ]).toString('utf8')
}

@Injectable()
export class BillingProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasPaymentProvider
  ) {}

  async saveForAccount(
    accountId: string,
    input: { legalName: string; cpfCnpj: string; country?: string }
  ) {
    this.asaas.assertSandboxEnabled()
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
      open(existing.legalNameCiphertext, accountId) === legalName &&
      open(existing.cpfCnpjCiphertext, accountId) === cpfCnpj
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
        legalNameCiphertext: seal(legalName, accountId),
        cpfCnpjCiphertext: seal(cpfCnpj!, accountId),
        country: 'BR'
      },
      update: {
        legalNameCiphertext: seal(legalName, accountId),
        cpfCnpjCiphertext: seal(cpfCnpj!, accountId)
      }
    })
    return { configured: true, country: 'BR' }
  }

  async ensureAsaasCustomer(accountId: string): Promise<string> {
    this.asaas.assertSandboxEnabled()
    if (!loadAsaasConfig().apiKey)
      throw new ServiceUnavailableException('ASAAS_SANDBOX_KEY_MISSING')
    const profile = await this.prisma.billingProfile.findUnique({ where: { accountId } })
    if (!profile)
      throw new BadRequestException('Perfil de faturamento necessario para PIX sandbox.')
    const externalReference = `bm-account:${accountId}`
    const existing = await this.prisma.providerCustomer.findUnique({
      where: {
        accountId_provider_environment: { accountId, provider: 'asaas', environment: 'sandbox' }
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
            environment: 'sandbox',
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
        accountId_provider_environment: { accountId, provider: 'asaas', environment: 'sandbox' }
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
        legalName: open(profile.legalNameCiphertext, accountId),
        cpfCnpj: open(profile.cpfCnpjCiphertext, accountId),
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
