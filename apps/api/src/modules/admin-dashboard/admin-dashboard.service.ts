import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import type { AuthenticatedUser } from '../auth/auth.types'

const priceToNumber = (price: string) => Number(price.replace(/\./g, '').replace(',', '.')) || 0

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async operational(_user: AuthenticatedUser) {
    const [accounts, characters, onlineCharacters, pendingPurchases, pendingRecharges, activeListings, pendingTickets, blockedAccounts, recentAudit] = await Promise.all([
      this.prisma.account.count(),
      this.prisma.accountCharacter.count(),
      this.prisma.accountCharacter.count({ where: { status: 'ONLINE' } }),
      this.prisma.purchaseIntent.count({ where: { status: 'PREPARED' } }),
      this.prisma.rechargeIntent.count({ where: { status: 'PREPARED' } }),
      this.prisma.playerMarketListing.count({ where: { status: 'ACTIVE' } }),
      this.prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      this.prisma.account.count({ where: { status: 'BLOCKED' } }),
      this.prisma.auditEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 5 })
    ])
    return {
      metrics: { accounts, characters, onlineCharacters, activeListings, pendingTickets, blockedAccounts, pending: pendingPurchases + pendingRecharges },
      activity: [
        { key: 'tickets', title: 'Tickets pendentes', description: 'Solicitacoes aguardando atendimento.', status: `${pendingTickets} abertos`, trend: 'Suporte' },
        { key: 'marketplace', title: 'Marketplace ativo', description: 'Anuncios atualmente publicados.', status: `${activeListings} anuncios`, trend: 'Moderacao' },
        { key: 'orders', title: 'Pedidos operacionais', description: 'Compras e recargas aguardando processamento.', status: `${pendingPurchases + pendingRecharges} pendentes`, trend: 'Loja' }
      ],
      recentAudit: recentAudit.map((event) => ({ id: event.id, action: event.action, actorUsername: event.actorUsername || 'system', targetType: event.targetType, severity: event.severity, createdAt: event.createdAt.toISOString() }))
    }
  }

  async summary(user: AuthenticatedUser) {
    const canViewFinancials = user.role === 'SUPER_ADMIN'
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5, 1)
    sixMonthsAgo.setHours(0, 0, 0, 0)
    const [
      accounts,
      characters,
      onlineCharacters,
      purchases,
      recharges,
      pendingPurchases,
      pendingRecharges,
      paidRecharges,
      completedMarketOrders,
      recentAudit
    ] = await Promise.all([
      this.prisma.account.count(),
      this.prisma.accountCharacter.count(),
      this.prisma.accountCharacter.count({ where: { status: 'ONLINE' } }),
      this.prisma.purchaseIntent.count(),
      this.prisma.rechargeIntent.count(),
      this.prisma.purchaseIntent.count({ where: { status: 'PREPARED' } }),
      this.prisma.rechargeIntent.count({ where: { status: 'PREPARED' } }),
      canViewFinancials
        ? this.prisma.rechargeIntent.findMany({ where: { status: 'PAID' }, select: { price: true, createdAt: true } })
        : Promise.resolve([]),
      canViewFinancials
        ? this.prisma.playerMarketOrder.findMany({ where: { status: 'COMPLETED' }, select: { price: true, currency: true, createdAt: true } })
        : Promise.resolve([]),
      this.prisma.auditEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 5 })
    ])

    const revenue = paidRecharges.reduce((total, recharge) => total + priceToNumber(recharge.price), 0)
    const revenue30Days = paidRecharges
      .filter((recharge) => recharge.createdAt >= thirtyDaysAgo)
      .reduce((total, recharge) => total + priceToNumber(recharge.price), 0)
    const marketplaceVolume = completedMarketOrders.reduce<Record<string, number>>((totals, order) => {
      totals[order.currency] = (totals[order.currency] || 0) + order.price
      return totals
    }, {})
    const monthlyRevenue = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(sixMonthsAgo)
      date.setMonth(sixMonthsAgo.getMonth() + index)
      const next = new Date(date)
      next.setMonth(date.getMonth() + 1)
      return {
        month: date.toISOString().slice(0, 7),
        value: paidRecharges
          .filter((recharge) => recharge.createdAt >= date && recharge.createdAt < next)
          .reduce((total, recharge) => total + priceToNumber(recharge.price), 0)
      }
    })

    return {
      metrics: {
        accounts,
        characters,
        onlineCharacters,
        purchases,
        recharges,
        pending: pendingPurchases + pendingRecharges,
        ...(canViewFinancials ? { recentRevenue: revenue, revenue30Days, paidRecharges: paidRecharges.length, completedMarketOrders: completedMarketOrders.length } : {})
      },
      ...(canViewFinancials ? { financial: { revenueTotal: revenue, revenue30Days, paidRecharges: paidRecharges.length, completedMarketOrders: completedMarketOrders.length, marketplaceVolume, monthlyRevenue } } : {}),
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
