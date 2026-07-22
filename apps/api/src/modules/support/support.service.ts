import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { ModerationActionType, SupportTicketStatus } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'

const ticketStatuses: SupportTicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
const moderationTypes: ModerationActionType[] = ['NOTE', 'WARNING', 'BLOCK', 'UNBLOCK', 'BAN']

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  ownTickets(user: AuthenticatedUser) {
    return this.prisma.supportTicket.findMany({ where: { accountId: user.id }, orderBy: { updatedAt: 'desc' } })
  }

  async createTicket(payload: { subject?: string; category?: string; message?: string }, user: AuthenticatedUser) {
    const subject = payload.subject?.trim(); const message = payload.message?.trim()
    if (!subject || subject.length < 4 || !message || message.length < 10) throw new BadRequestException('Informe um assunto e uma mensagem validos.')
    const ticket = await this.prisma.supportTicket.create({ data: { accountId: user.id, subject, category: payload.category?.trim() || 'support', message } })
    await this.audit.record({ actorId: user.id, actorUsername: user.username, action: 'support.ticket.created', targetType: 'SupportTicket', targetId: ticket.id, metadata: { subject, result: 'success' } })
    return ticket
  }

  adminTickets(status?: string) {
    return this.prisma.supportTicket.findMany({ where: ticketStatuses.includes(status as SupportTicketStatus) ? { status: status as SupportTicketStatus } : {}, include: { account: { select: { username: true, name: true } }, assignee: { select: { username: true } } }, orderBy: { updatedAt: 'desc' }, take: 200 })
  }

  async updateTicket(id: string, payload: { status?: SupportTicketStatus; response?: string; reason?: string }, user: AuthenticatedUser) {
    const current = await this.prisma.supportTicket.findUnique({ where: { id } })
    if (!current) throw new NotFoundException('Ticket nao encontrado.')
    if (payload.status && !ticketStatuses.includes(payload.status)) throw new BadRequestException('Status invalido.')
    const reason = payload.reason?.trim()
    if (!reason || reason.length < 5) throw new BadRequestException('Informe uma justificativa com pelo menos 5 caracteres.')
    const ticket = await this.prisma.supportTicket.update({ where: { id }, data: { status: payload.status, response: payload.response?.trim(), assigneeId: user.id } })
    await this.audit.record({ actorId: user.id, actorUsername: user.username, action: 'support.ticket.updated', targetType: 'SupportTicket', targetId: id, metadata: { previousStatus: current.status, nextStatus: ticket.status, reason, result: 'success' } })
    return ticket
  }

  async moderationList(accountId?: string, user?: AuthenticatedUser) {
    if (user?.role === 'ADMIN' && accountId) {
      const target = await this.prisma.account.findUnique({ where: { id: accountId } })
      if (target?.role !== 'PLAYER') throw new ForbiddenException('O ADM pode consultar apenas a moderacao de jogadores.')
    }
    return this.prisma.accountModeration.findMany({ where: accountId ? { accountId } : {}, include: { account: { select: { username: true, name: true, role: true } }, actor: { select: { username: true } } }, orderBy: { createdAt: 'desc' }, take: 200 })
  }

  async moderate(payload: { accountId?: string; type?: ModerationActionType; reason?: string; expiresAt?: string | null }, user: AuthenticatedUser) {
    const reason = payload.reason?.trim()
    if (!payload.accountId || !payload.type || !moderationTypes.includes(payload.type) || !reason || reason.length < 5) throw new BadRequestException('Selecione a conta, a acao e informe uma justificativa.')
    const target = await this.prisma.account.findUnique({ where: { id: payload.accountId } })
    if (!target) throw new NotFoundException('Conta nao encontrada.')
    if (target.id === user.id || target.role === 'SUPER_ADMIN' || (user.role === 'ADMIN' && target.role !== 'PLAYER')) throw new ForbiddenException('Esta conta e protegida contra esta acao.')
    const record = await this.prisma.$transaction(async (tx) => {
      if (payload.type === 'BLOCK' || payload.type === 'BAN') await tx.account.update({ where: { id: target.id }, data: { status: 'BLOCKED', sessionVersion: { increment: 1 } } })
      if (payload.type === 'UNBLOCK') await tx.account.update({ where: { id: target.id }, data: { status: 'ACTIVE', sessionVersion: { increment: 1 } } })
      return tx.accountModeration.create({ data: { accountId: target.id, actorId: user.id, type: payload.type!, reason, expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null } })
    })
    await this.audit.record({ actorId: user.id, actorUsername: user.username, action: `moderation.${payload.type.toLowerCase()}`, targetType: 'Account', targetId: target.id, severity: ['BLOCK', 'BAN'].includes(payload.type) ? 'critical' : 'warning', metadata: { username: target.username, reason, expiresAt: payload.expiresAt || null, result: 'success' } })
    return record
  }
}
