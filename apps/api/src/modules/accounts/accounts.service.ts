import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { Account, AccountCurrency, AccountStatus, Prisma, Role } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import type { AdminAccountsQuery, UpdateAccountPayload } from './accounts.types'

const defaultPageSize = 30
const maxPageSize = 100
const allowedRoles: Role[] = ['PLAYER', 'MODERATOR', 'GAME_MASTER', 'ADMIN', 'SUPER_ADMIN']
const allowedStatuses: AccountStatus[] = ['ACTIVE', 'PENDING', 'BLOCKED']

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function pagination(query: { page?: string; pageSize?: string }) {
  const page = toPositiveInt(query.page, 1)
  const pageSize = Math.min(toPositiveInt(query.pageSize, defaultPageSize), maxPageSize)
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize
  }
}

function enumOrFallback<T extends string>(value: T | undefined, allowed: readonly T[], fallback: T) {
  return value && allowed.includes(value) ? value : fallback
}

function auditActor(user?: AuthenticatedUser) {
  return {
    actorId: user?.id,
    actorUsername: user?.username
  }
}

function mapAdminAccount(account: Account & { currencies: AccountCurrency[] }) {
  return {
    id: account.id,
    username: account.username,
    name: account.name,
    email: account.email,
    role: account.role,
    status: account.status,
    personalIdMask: account.personalIdHash ? '***-**-****' : 'Nao definido',
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    currencies: Object.fromEntries(account.currencies.map((currency) => [currency.currency, currency.balance]))
  }
}

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async adminList(query: AdminAccountsQuery) {
    const { page, pageSize, skip } = pagination(query)
    const where: Prisma.AccountWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { username: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    }

    const [total, data] = await Promise.all([
      this.prisma.account.count({ where }),
      this.prisma.account.findMany({
        where,
        orderBy: [{ role: 'asc' }, { username: 'asc' }],
        skip,
        take: pageSize,
        include: {
          currencies: true
        }
      })
    ])

    return {
      data: data.map(mapAdminAccount),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  }

  async profile(user: AuthenticatedUser) {
    const account = await this.prisma.account.findUnique({
      where: { id: user.id },
      include: { currencies: true }
    })

    if (!account) {
      throw new NotFoundException(`Account not found: ${user.id}`)
    }

    return mapAdminAccount(account)
  }

  async updateAccount(id: string, payload: UpdateAccountPayload, user?: AuthenticatedUser) {
    if (!payload.role && !payload.status) {
      throw new BadRequestException('role or status is required')
    }

    const account = await this.prisma.account.findUnique({ where: { id } })
    if (!account) {
      throw new NotFoundException(`Account not found: ${id}`)
    }

    const updated = await this.prisma.account.update({
      where: { id },
      data: {
        ...(payload.role ? { role: enumOrFallback(payload.role, allowedRoles, account.role) } : {}),
        ...(payload.status ? { status: enumOrFallback(payload.status, allowedStatuses, account.status) } : {})
      },
      include: {
        currencies: true
      }
    })

    await this.audit.record({
      ...auditActor(user),
      action: 'admin.account.updated',
      targetType: 'Account',
      targetId: updated.id,
      metadata: {
        username: updated.username,
        previousRole: account.role,
        nextRole: updated.role,
        previousStatus: account.status,
        nextStatus: updated.status
      }
    })

    return mapAdminAccount(updated)
  }
}
