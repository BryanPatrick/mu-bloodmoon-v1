import { Prisma } from '@prisma/client'
import { safeMessage } from './payment-reconciliation.service'

describe('payment reconciliation log redaction', () => {
  it('never logs arbitrary error messages or untrusted string values', () => {
    expect(safeMessage(new Error('synthetic legal name / 11122233344 / fake-token'))).toBe('Error')
    expect(safeMessage('fake-provider-secret')).toBe('UnknownError')
    const named = new Error('fake-key')
    named.name = 'fake-key-ServiceUnavailableException'
    expect(safeMessage(named)).toBe('Error')
  })

  it('keeps only allowlisted exception names and Prisma codes', () => {
    const known = new Error('fake-billing-document')
    known.name = 'ServiceUnavailableException'
    expect(safeMessage(known)).toBe('ServiceUnavailableException')
    const prisma = new Prisma.PrismaClientKnownRequestError('fake-sensitive-detail', {
      code: 'P2002', clientVersion: 'test'
    })
    expect(safeMessage(prisma)).toBe('Prisma:P2002')
  })
})
