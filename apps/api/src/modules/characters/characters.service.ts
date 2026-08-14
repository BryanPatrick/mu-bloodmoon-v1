import { Injectable, NotFoundException } from '@nestjs/common'
import type { AccountCharacter, CharacterRuntimeStatus, Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import type { CharacterActionPayload, CharacterQuery } from './characters.types'

const normalizeKey = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const seedCharacters = [
  {
    username: 'admin',
    name: 'MoonElf',
    className: 'High Elf',
    level: 400,
    reset: 18,
    masterReset: 2,
    map: 'Noria',
    status: 'ONLINE' as CharacterRuntimeStatus,
    guild: 'Blood Pact',
    pkStatus: 'Hero'
  },
  {
    username: 'admin',
    name: 'LordAdmin',
    className: 'Dark Lord',
    level: 380,
    reset: 11,
    masterReset: 1,
    map: 'Lorencia',
    status: 'OFFLINE' as CharacterRuntimeStatus,
    guild: 'Blood Pact',
    pkStatus: 'Commoner'
  },
  {
    username: 'admin',
    name: 'BloodMage',
    className: 'Soul Master',
    level: 320,
    reset: 7,
    masterReset: 0,
    map: 'Devias',
    status: 'OFFLINE' as CharacterRuntimeStatus,
    guild: '-',
    pkStatus: 'Commoner'
  },
  {
    username: 'player',
    name: 'FairyQueen',
    className: 'Fairy Elf',
    level: 275,
    reset: 4,
    masterReset: 0,
    map: 'Atlans',
    status: 'OFFLINE' as CharacterRuntimeStatus,
    guild: '-',
    pkStatus: 'Commoner'
  }
]

const canViewAllCharacters = (user: AuthenticatedUser) =>
  user.role === 'GM' || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'

const mapCharacter = (character: AccountCharacter & { account: { username: string } }) => ({
  id: character.id,
  ownerUsername: character.account.username,
  name: character.name,
  class: character.className,
  level: character.level,
  reset: character.reset,
  masterReset: character.masterReset,
  map: character.map,
  status: character.status === 'ONLINE' ? 'Online' : character.status === 'BLOCKED' ? 'Bloqueado' : 'Offline',
  guild: character.guild,
  pkStatus: character.pkStatus,
  createdAt: character.createdAt.toISOString(),
  updatedAt: character.updatedAt.toISOString()
})

@Injectable()
export class CharactersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async ensureSeeded() {
    const count = await this.prisma.accountCharacter.count()
    if (count) {
      return
    }

    const accounts = await this.prisma.account.findMany({
      where: { username: { in: Array.from(new Set(seedCharacters.map((character) => character.username))) } }
    })
    const accountByUsername = new Map(accounts.map((account) => [account.username, account]))

    await Promise.all(seedCharacters.map((character) => {
      const account = accountByUsername.get(character.username)
      if (!account) {
        return Promise.resolve()
      }

      return this.prisma.accountCharacter.upsert({
        where: { key: normalizeKey(`${character.username}-${character.name}`) },
        update: {},
        create: {
          accountId: account.id,
          key: normalizeKey(`${character.username}-${character.name}`),
          name: character.name,
          className: character.className,
          level: character.level,
          reset: character.reset,
          masterReset: character.masterReset,
          map: character.map,
          status: character.status,
          guild: character.guild,
          pkStatus: character.pkStatus
        }
      })
    }))
  }

  async list(user: AuthenticatedUser, query: CharacterQuery) {
    await this.ensureSeeded()

    const where: Prisma.AccountCharacterWhereInput = {
      ...(!canViewAllCharacters(user) ? { accountId: user.id } : {}),
      ...(query.className ? { className: query.className } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { className: { contains: query.search } },
              { map: { contains: query.search } },
              { guild: { contains: query.search } },
              { account: { username: { contains: query.search } } }
            ]
          }
        : {})
    }

    const items = await this.prisma.accountCharacter.findMany({
      where,
      include: { account: { select: { username: true } } },
      orderBy: [{ account: { username: 'asc' } }, { reset: 'desc' }, { level: 'desc' }, { name: 'asc' }]
    })

    return {
      data: items.map(mapCharacter),
      total: items.length
    }
  }

  async action(id: string, payload: CharacterActionPayload, user: AuthenticatedUser) {
    const character = await this.prisma.accountCharacter.findUnique({
      where: { id },
      include: { account: { select: { id: true, username: true } } }
    })
    if (!character || (!canViewAllCharacters(user) && character.account.id !== user.id)) {
      throw new NotFoundException(`Character not found: ${id}`)
    }

    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: payload.action === 'reset-request' ? 'characters.reset.requested' : 'characters.details.opened',
      targetType: 'AccountCharacter',
      targetId: character.id,
      metadata: {
        character: character.name,
        ownerUsername: character.account.username,
        className: character.className
      }
    })

    return {
      ok: true,
      character: mapCharacter(character),
      message: payload.action === 'reset-request'
        ? `Solicitacao de reset para ${character.name} registrada.`
        : `Detalhes de ${character.name} registrados.`
    }
  }
}
