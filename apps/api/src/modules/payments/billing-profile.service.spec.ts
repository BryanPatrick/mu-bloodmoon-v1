import { BillingProfileService } from './billing-profile.service'
import { Prisma } from '@prisma/client'

const original = {
  key: process.env.BILLING_PII_KEY_B64,
  enabled: process.env.ASAAS_ENABLED,
  environment: process.env.ASAAS_ENVIRONMENT,
  nodeEnv: process.env.NODE_ENV,
  apiKey: process.env.ASAAS_API_KEY
}

beforeEach(() => {
  process.env.BILLING_PII_KEY_B64 = Buffer.alloc(32, 7).toString('base64')
  process.env.ASAAS_ENABLED = 'true'
  process.env.ASAAS_ENVIRONMENT = 'sandbox'
  process.env.ASAAS_API_KEY = '$aact_hmlg_fake_test_only'
  process.env.NODE_ENV = 'test'
})

afterEach(() => {
  const values = {
    BILLING_PII_KEY_B64: original.key,
    ASAAS_ENABLED: original.enabled,
    ASAAS_ENVIRONMENT: original.environment,
    NODE_ENV: original.nodeEnv,
    ASAAS_API_KEY: original.apiKey
  }
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

function fixture() {
  let profile: Record<string, string> | null = null
  let customer: Record<string, string | null> | null = null
  const prisma = {
    billingProfile: {
      findUnique: jest.fn(async () => profile),
      upsert: jest.fn(
        async ({
          create,
          update
        }: {
          create: Record<string, string>
          update: Record<string, string>
        }) => {
          profile = profile ? { ...profile, ...update } : { ...create, id: 'billing-1' }
          return profile
        }
      )
    },
    providerCustomer: {
      findFirst: jest.fn(async () => customer),
      findUnique: jest.fn(async () => customer),
      create: jest.fn(async ({ data }: { data: Record<string, string> }) => {
        if (customer)
          throw new Prisma.PrismaClientKnownRequestError('duplicate', {
            code: 'P2002',
            clientVersion: '5.22.0'
          })
        customer = { ...data, id: 'mapping-1', providerCustomerId: null }
        return customer
      }),
      findUniqueOrThrow: jest.fn(async () => customer),
      update: jest.fn(async ({ data }: { data: Record<string, string> }) => {
        customer = { ...customer, ...data } as Record<string, string | null>
        return customer
      })
    }
  }
  const asaas = {
    assertSandboxEnabled: jest.fn(),
    createCustomer: jest.fn(async () => 'cus_1'),
    findCustomerByExternalReference: jest.fn(async () => 'cus_1')
  }
  const service = new BillingProfileService(prisma as never, asaas as never)
  return { prisma, asaas, service, profile: () => profile, customer: () => customer }
}

describe('billing profile and provider customer (no network)', () => {
  it('encrypts personal data and returns no CPF', async () => {
    const f = fixture()
    const result = await f.service.saveForAccount('account-1', {
      legalName: 'QA Player',
      cpfCnpj: '111.444.777-35'
    })
    expect(result).toEqual({ configured: true, country: 'BR' })
    expect(JSON.stringify(f.profile())).not.toContain('11144477735')
    expect(JSON.stringify(f.profile())).not.toContain('QA Player')
  })

  it('creates once and reuses the persisted provider customer', async () => {
    const f = fixture()
    await f.service.saveForAccount('account-1', { legalName: 'QA Player', cpfCnpj: '11144477735' })
    expect(await f.service.ensureAsaasCustomer('account-1')).toBe('cus_1')
    expect(await f.service.ensureAsaasCustomer('account-1')).toBe('cus_1')
    expect(f.asaas.createCustomer).toHaveBeenCalledTimes(1)
    expect(f.customer()).toMatchObject({
      externalReference: 'bm-account:account-1',
      createState: 'CREATED'
    })
  })

  it('does not repeat POST after ambiguous customer creation', async () => {
    const f = fixture()
    await f.service.saveForAccount('account-1', { legalName: 'QA Player', cpfCnpj: '11144477735' })
    f.asaas.createCustomer.mockRejectedValueOnce(new Error('timeout'))
    await expect(f.service.ensureAsaasCustomer('account-1')).rejects.toThrow()
    expect(f.customer()).toMatchObject({ createState: 'RECONCILE_REQUIRED' })
    expect(await f.service.ensureAsaasCustomer('account-1')).toBe('cus_1')
    expect(f.asaas.createCustomer).toHaveBeenCalledTimes(1)
    expect(f.asaas.findCustomerByExternalReference).toHaveBeenCalledWith('bm-account:account-1')
  })

  it('two concurrent customer requests reserve only one provider POST', async () => {
    const f = fixture()
    await f.service.saveForAccount('account-1', { legalName: 'QA Player', cpfCnpj: '11144477735' })
    const results = await Promise.all([
      f.service.ensureAsaasCustomer('account-1'),
      f.service.ensureAsaasCustomer('account-1')
    ])
    expect(results).toEqual(['cus_1', 'cus_1'])
    expect(f.asaas.createCustomer).toHaveBeenCalledTimes(1)
  })
})
