import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { Account, AccountCurrency, AccountStatus, Prisma, Role } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { delegableAdminPermissions, permissionsForAccount } from '../auth/permissions'
import type { AdminAccountsQuery, UpdateAccountPayload, UpdateAccountPermissionsPayload } from './accounts.types'

const defaultPageSize = 30
const maxPageSize = 100
const assignableRoles: Role[] = ['PLAYER', 'ADMIN']
const allowedStatuses: AccountStatus[] = ['ACTIVE', 'PENDING', 'BLOCKED']

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function pagination(query: { page?: string; pageSize?: string }) {
  const page = toPositiveInt(query.page, 1)
  const pageSize = Math.min(toPositiveInt(query.pageSize, defaultPageSize), maxPageSize)
  return { page, pageSize, skip: (page - 1) * pageSize }
}

function enumOrFallback<T extends string>(value: T | undefined, allowed: readonly T[], fallback: T) {
  return value && allowed.includes(value) ? value : fallback
}

function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  return local && domain ? `${local.slice(0, 2)}***@${domain}` : '***'
}

function mapAdminAccount(account: Account & { currencies: AccountCurrency[], _count?: { characters: number } }, viewerRole: Role) {
  return {
    id: account.id,
    username: account.username,
    name: account.name,
    email: viewerRole === 'SUPER_ADMIN' ? account.email : maskEmail(account.email),
    role: account.role,
    status: account.status,
    twoFactorEnabled: account.twoFactorEnabled,
    personalIdMask: account.personalIdHash ? '***-**-****' : 'Nao definido',
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    characters: account._count?.characters ?? 0,
    currencies: Object.fromEntries(account.currencies.map((currency) => [currency.currency, currency.balance]))
  }
}

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async adminList(query: AdminAccountsQuery, user: AuthenticatedUser) {
    const { page, pageSize, skip } = pagination(query)
    const where: Prisma.AccountWhereInput = {
      ...(user.role === 'ADMIN' ? { role: 'PLAYER' } : query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { OR: [{ username: { contains: query.search } }, { name: { contains: query.search } }, { email: { contains: query.search } }] }
        : {})
    }

    const [total, data] = await Promise.all([
      this.prisma.account.count({ where }),
      this.prisma.account.findMany({
        where,
        orderBy: [{ role: 'asc' }, { username: 'asc' }],
        skip,
        take: pageSize,
        include: { currencies: true, _count: { select: { characters: true } } }
      })
    ])

    return {
      data: data.map((account) => mapAdminAccount(account, user.role)),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  }

  async profile(user: AuthenticatedUser) {
    const account = await this.prisma.account.findUnique({ where: { id: user.id }, include: { currencies: true } })
    if (!account) throw new NotFoundException('Account not found')
    return mapAdminAccount(account, user.role)
  }

  async updateAccount(id: string, payload: UpdateAccountPayload, user: AuthenticatedUser) {
    const reason = payload.reason?.trim()
    if (!payload.role && !payload.status) throw new BadRequestException('role or status is required')
    if (!reason || reason.length < 5) throw new BadRequestException('A justification with at least 5 characters is required')

    const account = await this.prisma.account.findUnique({ where: { id } })
    if (!account) throw new NotFoundException('Account not found')
    if (account.id === user.id) {
      await this.recordDeniedChange(user, account, payload, reason, 'self-change')
      throw new ForbiddenException('You cannot change your own role or status')
    }

    if (payload.role) {
      if (user.role !== 'SUPER_ADMIN') {
        await this.recordDeniedChange(user, account, payload, reason, 'role-change-requires-super-admin')
        throw new ForbiddenException('Only Super ADM can change account roles')
      }
      if (!assignableRoles.includes(payload.role) || account.role === 'SUPER_ADMIN') {
        await this.recordDeniedChange(user, account, payload, reason, 'protected-role')
        throw new ForbiddenException('This role transition is not allowed')
      }
      if (!['PLAYER->ADMIN', 'ADMIN->PLAYER'].includes(`${account.role}->${payload.role}`)) {
        await this.recordDeniedChange(user, account, payload, reason, 'invalid-role-transition')
        throw new BadRequestException('Only PLAYER and ADMIN promotion or demotion is allowed')
      }
    }

    if (payload.status && user.role === 'ADMIN' && account.role !== 'PLAYER') {
      await this.recordDeniedChange(user, account, payload, reason, 'admin-target-is-not-player')
      throw new ForbiddenException('ADM can only change Player account status')
    }

    const updated = await this.prisma.account.update({
      where: { id },
      data: {
        ...(payload.role ? { role: payload.role } : {}),
        ...(payload.status ? { status: enumOrFallback(payload.status, allowedStatuses, account.status) } : {}),
        sessionVersion: { increment: 1 }
      },
      include: { currencies: true }
    })

    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: payload.role ? 'admin.account.role.changed' : 'admin.account.status.changed',
      targetType: 'Account',
      targetId: updated.id,
      severity: payload.role || payload.status === 'BLOCKED' ? 'warning' : 'info',
      metadata: {
        username: updated.username,
        previousRole: account.role,
        nextRole: updated.role,
        previousStatus: account.status,
        nextStatus: updated.status,
        reason,
        result: 'success'
      }
    })

    return mapAdminAccount(updated, user.role)
  }

  async accountPermissions(id: string) {
    const account = await this.prisma.account.findUnique({ where: { id }, include: { permissions: true } })
    if (!account) throw new NotFoundException('Account not found')
    if (account.role !== 'ADMIN') throw new BadRequestException('Permissions can only be customized for ADM accounts')
    return {
      accountId: account.id,
      username: account.username,
      available: delegableAdminPermissions,
      effective: permissionsForAccount(account.role, account.permissions),
      overrides: account.permissions.map(({ key, granted }) => ({ key, granted }))
    }
  }

  async updateAccountPermissions(id: string, payload: UpdateAccountPermissionsPayload, user: AuthenticatedUser) {
    const reason = payload.reason?.trim()
    if (!reason || reason.length < 5) throw new BadRequestException('A justification with at least 5 characters is required')
    if (id === user.id) throw new ForbiddenException('You cannot change your own permissions')
    const account = await this.prisma.account.findUnique({ where: { id }, include: { permissions: true } })
    if (!account) throw new NotFoundException('Account not found')
    if (account.role !== 'ADMIN') throw new BadRequestException('Permissions can only be customized for ADM accounts')

    const requested = payload.permissions || []
    if (requested.some((entry) => !delegableAdminPermissions.includes(entry.key as never))) {
      throw new BadRequestException('One or more permissions cannot be delegated')
    }

    await this.prisma.$transaction([
      this.prisma.accountPermission.deleteMany({ where: { accountId: id } }),
      ...requested.map((entry) => this.prisma.accountPermission.create({ data: { accountId: id, key: entry.key, granted: Boolean(entry.granted) } })),
      this.prisma.account.update({ where: { id }, data: { sessionVersion: { increment: 1 } } })
    ])
    await this.audit.record({
      actorId: user.id, actorUsername: user.username, action: 'admin.account.permissions.changed',
      targetType: 'Account', targetId: id, severity: 'warning',
      metadata: { username: account.username, before: account.permissions.map(({ key, granted }) => ({ key, granted })), after: requested, reason, result: 'success' }
    })
    return this.accountPermissions(id)
  }

  async ownSessions(user: AuthenticatedUser) {
    const sessions = await this.prisma.accountSession.findMany({
      where: { accountId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
    return sessions.map((session) => ({
      id: session.id,
      current: session.id === user.sessionId,
      active: !session.revokedAt && session.expiresAt > new Date(),
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      revokeReason: session.revokeReason,
      ipAddress: session.ipAddress ? this.maskIp(session.ipAddress) : null,
      label: this.deviceLabel(session.userAgent)
    }))
  }

  async revokeOwnSessions(reason: string | undefined, user: AuthenticatedUser) {
    return this.revokeAccountSessions(user.id, reason || 'Revogação solicitada pelo titular', user, true)
  }

  async revokeAccountSessions(id: string, reason: string | undefined, user: AuthenticatedUser, self = false) {
    const normalizedReason = reason?.trim()
    if (!normalizedReason || normalizedReason.length < 5) throw new BadRequestException('A justification with at least 5 characters is required')
    const account = await this.prisma.account.findUnique({ where: { id } })
    if (!account) throw new NotFoundException('Account not found')
    if (!self && user.role === 'ADMIN' && account.role !== 'PLAYER') throw new ForbiddenException('ADM can only revoke Player sessions')
    await this.prisma.$transaction([
      this.prisma.account.update({ where: { id }, data: { sessionVersion: { increment: 1 } } }),
      this.prisma.accountSession.updateMany({
        where: { accountId: id, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: normalizedReason }
      })
    ])
    await this.audit.record({ actorId: user.id, actorUsername: user.username, action: 'account.sessions.revoked', targetType: 'Account', targetId: id, severity: 'warning', metadata: { username: account.username, reason: normalizedReason, self, result: 'success' } })
    return { ok: true, message: 'Sessions revoked' }
  }

  private recordDeniedChange(
    user: AuthenticatedUser,
    account: Account,
    payload: UpdateAccountPayload,
    reason: string,
    denialReason: string
  ) {
    return this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'admin.account.change.denied',
      targetType: 'Account',
      targetId: account.id,
      severity: 'warning',
      metadata: {
        username: account.username,
        currentRole: account.role,
        requestedRole: payload.role || null,
        currentStatus: account.status,
        requestedStatus: payload.status || null,
        reason,
        denialReason,
        result: 'denied'
      }
    })
  }

  private deviceLabel(userAgent: string | null) {
    if (!userAgent) return 'Dispositivo nao identificado'
    const browser = /Edg\//.test(userAgent) ? 'Edge'
      : /Chrome\//.test(userAgent) ? 'Chrome'
        : /Firefox\//.test(userAgent) ? 'Firefox'
          : /Safari\//.test(userAgent) ? 'Safari' : 'Navegador'
    const system = /Windows/.test(userAgent) ? 'Windows'
      : /Android/.test(userAgent) ? 'Android'
        : /iPhone|iPad/.test(userAgent) ? 'iOS'
          : /Mac OS/.test(userAgent) ? 'macOS'
            : /Linux/.test(userAgent) ? 'Linux' : 'Sistema desconhecido'
    return `${browser} em ${system}`
  }

  private maskIp(ip: string) {
    if (ip.includes(':')) return `${ip.split(':').slice(0, 3).join(':')}::***`
    const parts = ip.split('.')
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.***.***` : '***'
  }
}
