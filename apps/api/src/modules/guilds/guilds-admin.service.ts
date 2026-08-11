import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ObservabilityService } from '../observability/observability.service'
import { GuildsService } from './guilds.service'
import type {
  GuildAdminActionPayload,
  GuildCreatePayload,
  GuildLevelConfigPayload,
  GuildQuery,
  GuildXpRulePayload
} from './guilds.contract'

const pageValues = (query: GuildQuery) => {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25))
  return { page, pageSize, skip: (page - 1) * pageSize }
}

const required = (value: string | undefined, label: string, minimum = 2) => {
  const clean = value?.trim()
  if (!clean || clean.length < minimum) throw new BadRequestException(`Informe ${label}.`)
  return clean
}

@Injectable()
export class GuildsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly observability: ObservabilityService,
    private readonly guilds: GuildsService
  ) {}

  private async audited(user: AuthenticatedUser, action: string, entityType: string, entityId: string, reason: string, before: unknown, after: unknown) {
    await this.audit.record({
      module: 'guilds',
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action,
      targetType: entityType,
      targetId: entityId,
      reason,
      beforeData: before as Record<string, unknown>,
      afterData: after as Record<string, unknown>,
      workDescription: `${user.username} executou ${action} em ${entityType} ${entityId}.`
    })
  }

  async list(query: GuildQuery) {
    const { page, pageSize, skip } = pageValues(query)
    const search = query.search?.trim()
    const where: Prisma.GuildWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.syncStatus ? { syncStatus: query.syncStatus } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { tag: { contains: search } }, { slug: { contains: search } }] } : {})
    }
    const [data, total] = await Promise.all([
      this.prisma.guild.findMany({
        where, skip, take: pageSize, orderBy: { createdAt: 'desc' },
        include: { _count: { select: { members: { where: { removedAt: null } }, requests: true, projects: true } } }
      }),
      this.prisma.guild.count({ where })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async detail(id: string) {
    const guild = await this.prisma.guild.findUnique({
      where: { id },
      include: {
        focusTags: true,
        members: { where: { removedAt: null }, include: { character: { select: { id: true, name: true } }, account: { select: { id: true, username: true } } } },
        treasury: { include: { balances: true } },
        vault: { include: { items: true } },
        _count: { select: { requests: true, projects: true, joinRequests: true } }
      }
    })
    if (!guild) throw new NotFoundException('Guild não encontrada.')
    return guild
  }

  // The only creation path this round -- players cannot self-service create
  // a guild (see the plan's Tier A note in the guilds README). Delegates to
  // GuildsService.createGuild, which stays gateway-agnostic by caller.
  async createGuild(payload: GuildCreatePayload, user: AuthenticatedUser) {
    const guild = await this.guilds.createGuild(payload, user)
    await this.audited(user, 'admin.guilds.create', 'Guild', guild.id, 'Criação administrativa de guild.', null, guild)
    return guild
  }

  async action(id: string, payload: GuildAdminActionPayload, user: AuthenticatedUser) {
    const guild = await this.prisma.guild.findUnique({ where: { id } })
    if (!guild) throw new NotFoundException('Guild não encontrada.')
    const reason = required(payload.reason, 'uma justificativa com pelo menos 4 caracteres', 4)
    const action = payload.action?.toUpperCase() || ''
    const statusByAction: Record<string, 'ACTIVE' | 'DISBANDED' | 'SUSPENDED'> = {
      SUSPEND: 'SUSPENDED', DISBAND: 'DISBANDED', RESTORE: 'ACTIVE'
    }
    const status = statusByAction[action]
    if (!status) throw new BadRequestException('Ação inválida.')
    const after = await this.prisma.guild.update({ where: { id }, data: { status } })
    await this.audited(user, `admin.guilds.${action.toLowerCase()}`, 'Guild', id, reason, guild, after)
    await this.observability.recordOperationalEvent({ module: 'guilds', eventType: `GUILD_${action}`, entityType: 'Guild', entityId: id, actorUserId: user.id, description: reason })
    return after
  }

  async levelConfig() {
    return this.prisma.guildLevelConfig.findMany({ orderBy: { level: 'asc' } })
  }

  async saveLevelConfig(id: string | null, payload: GuildLevelConfigPayload, user: AuthenticatedUser) {
    const level = Number(payload.level)
    if (!Number.isInteger(level) || level < 1) throw new BadRequestException('Informe um nível válido.')
    const xpRequired = Number(payload.xpRequired)
    if (!Number.isInteger(xpRequired) || xpRequired < 0) throw new BadRequestException('Informe o XP necessário.')
    const title = required(payload.title, 'um título para o nível', 2)
    const data = {
      level, xpRequired, title,
      perks: payload.perks !== undefined ? (JSON.parse(JSON.stringify(payload.perks ?? null)) as Prisma.InputJsonValue) : undefined,
      active: payload.active ?? true,
      updatedBy: user.id
    }
    const saved = id
      ? await this.prisma.guildLevelConfig.update({ where: { id }, data })
      : await this.prisma.guildLevelConfig.create({ data: { ...data, createdBy: user.id } })
    await this.audited(user, id ? 'admin.guilds.level-config.update' : 'admin.guilds.level-config.create', 'GuildLevelConfig', saved.id, 'Configuração de nível de guild.', null, saved)
    return saved
  }

  async xpRules() {
    return this.prisma.guildXpConversionRule.findMany({ orderBy: { createdAt: 'desc' } })
  }

  // Placeholder numbers only -- nothing ever executes a rule this round
  // (active defaults false, and no endpoint anywhere consumes these rows).
  // Creating/activating a rule never touches GuildTreasuryBalance.
  async saveXpRule(id: string | null, payload: GuildXpRulePayload, user: AuthenticatedUser) {
    const resourceType = required(payload.resourceType, 'o tipo de recurso', 2)
    const resourceKey = required(payload.resourceKey, 'a chave do recurso', 2)
    const amountRequired = BigInt(Math.max(1, Math.floor(Number(payload.amountRequired) || 0)))
    const guildXpGranted = Math.max(0, Math.floor(Number(payload.guildXpGranted) || 0))
    const data = {
      resourceType, resourceKey, amountRequired, guildXpGranted,
      active: payload.active ?? false,
      seasonId: payload.seasonId?.trim() || null,
      perGuildLimit: payload.perGuildLimit ?? null,
      perMemberLimit: payload.perMemberLimit ?? null,
      updatedBy: user.id
    }
    const saved = id
      ? await this.prisma.guildXpConversionRule.update({ where: { id }, data })
      : await this.prisma.guildXpConversionRule.create({ data: { ...data, createdBy: user.id } })
    await this.audited(user, id ? 'admin.guilds.xp-rule.update' : 'admin.guilds.xp-rule.create', 'GuildXpConversionRule', saved.id, 'Regra de conversão de XP de guild (não executada).', null, saved)
    return saved
  }

  async deleteXpRule(id: string, user: AuthenticatedUser) {
    const rule = await this.prisma.guildXpConversionRule.findUnique({ where: { id } })
    if (!rule) throw new NotFoundException('Regra não encontrada.')
    await this.prisma.guildXpConversionRule.delete({ where: { id } })
    await this.audited(user, 'admin.guilds.xp-rule.delete', 'GuildXpConversionRule', id, 'Regra de conversão removida.', rule, null)
    return { deleted: true }
  }

  // Tier C placeholder -- no analytics engine exists yet, matches the
  // preview-only Guild Reports admin tab.
  async reports() {
    const [totalGuilds, activeGuilds, totalMembers, pendingJoinRequests, openRequests, activeProjects] = await Promise.all([
      this.prisma.guild.count(),
      this.prisma.guild.count({ where: { status: 'ACTIVE' } }),
      this.prisma.guildMember.count({ where: { removedAt: null } }),
      this.prisma.guildJoinRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.guildRequest.count({ where: { status: { in: ['DRAFT', 'OPEN', 'IN_PROGRESS'] } } }),
      this.prisma.guildProject.count({ where: { status: { in: ['PLANNING', 'ACTIVE'] } } })
    ])
    return { totalGuilds, activeGuilds, totalMembers, pendingJoinRequests, openRequests, activeProjects, preview: true }
  }
}
