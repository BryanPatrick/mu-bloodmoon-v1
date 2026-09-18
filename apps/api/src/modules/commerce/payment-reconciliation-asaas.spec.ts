import { PaymentReconciliationService } from './payment-reconciliation.service'

it('surfaces ambiguous Asaas creation for admin recovery without an external payment ID', async () => {
  const ambiguous = {
    id: 'recharge-qa', accountId: 'account-qa', status: 'PREPARED', createdAt: new Date('2026-09-18T00:00:00Z')
  }
  const prisma = {
    rechargeIntent: {
      findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
        where.providerCreateState === 'RECONCILE_REQUIRED' ? [ambiguous] : [])
    },
    walletLedgerEntry: { findMany: jest.fn(async () => []) }
  }
  const service = new PaymentReconciliationService(prisma as never, {} as never, {} as never, {} as never)
  await expect(service.findAnomalies()).resolves.toEqual([{
    rechargeIntentId: 'recharge-qa', accountId: 'account-qa',
    issue: 'ASAAS_RECONCILE_REQUIRED', status: 'PREPARED',
    detail: expect.stringContaining('no new charge'),
    createdAt: '2026-09-18T00:00:00.000Z'
  }])
})
