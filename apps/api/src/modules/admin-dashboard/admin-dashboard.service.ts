import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'

const priceToNumber = (price: string) => Number(price.replace(/\./g, '').replace(',', '.')) || 0

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [
      accounts,
      characters,
      onlineCharacters,
      purchases,
      recharges,
      pendingPurchases,
      pendingRecharges,
      paidRecharges,
      recentAudit
    ] = await Promise.all([
      this.prisma.account.count(),
      this.prisma.accountCharacter.count(),
      this.prisma.accountCharacter.count({ where: { status: 'ONLINE' } }),
      this.prisma.purchaseIntent.count(),
      this.prisma.rechargeIntent.count(),
      this.prisma.purchaseIntent.count({ where: { status: 'PREPARED' } }),
      this.prisma.rechargeIntent.count({ where: { status: 'PREPARED' } }),
      this.prisma.rechargeIntent.findMany({ where: { status: 'PAID' }, select: { price: true } }),
      this.prisma.auditEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 5 })
    ])

    const revenue = paidRecharges.reduce((total, recharge) => total + priceToNumber(recharge.price), 0)

    return {
      metrics: {
        accounts,
        characters,
        onlineCharacters,
        purchases,
        recharges,
        pending: pendingPurchases + pendingRecharges,
        recentRevenue: revenue
      },
      activity: [
        {
          key: 'characters',
          title: 'Personagens cadastrados',
          description: 'Personagens reais vinculados as contas do portal.',
          status: `${characters} registros`,
          trend: `${onlineCharacters} online`
        },
        {
          key: 'purchases',
          title: 'Loja e compras',
          description: 'Intencoes de compra registradas e auditadas.',
          status: `${purchases} compras`,
          trend: `${pendingPurchases} pendentes`
        },
        {
          key: 'recharges',
          title: 'Recargas pendentes',
          description: 'Fila financeira de recargas aguardando aprovacao.',
          status: `${recharges} recargas`,
          trend: `${pendingRecharges} pendentes`
        }
      ],
      recentAudit: recentAudit.map((event) => ({
        id: event.id,
        action: event.action,
        actorUsername: event.actorUsername || 'system',
        targetType: event.targetType,
        severity: event.severity,
        createdAt: event.createdAt.toISOString()
      }))
    }
  }
}
