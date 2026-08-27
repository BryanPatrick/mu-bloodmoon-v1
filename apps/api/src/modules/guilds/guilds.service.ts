import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ObservabilityService } from '../observability/observability.service'
import { GuildsMediaService } from './guilds-media.service'
import type {
  GuildCreatePayload,
  GuildDisbandPayload,
  GuildInviteCandidateQuery,
  GuildInvitePayload,
  GuildJoinDecisionPayload,
  GuildJoinPayload,
  GuildMemberKickPayload,
  GuildMemberRolePayload,
  GuildProjectPayload,
  GuildProjectUpdatePayload,
  GuildQuery,
  GuildRequestPayload,
  GuildRequestUpdatePayload,
  GuildUpdatePayload
} from './guilds.contract'

const ROLE_VOCABULARY = ['LEADER', 'OFFICER', 'TREASURER', 'MEMBER', 'RECRUIT'] as const
type RoleKey = typeof ROLE_VOCABULARY[number]

// Minimum demo seed only -- NOT the definitive resource catalog. More
// resourceKeys (Life/Creation/Harmony/Guardian/Gemstone jewels, materials,
// seasonal currencies, ...) can be added later with zero schema change --
// see GuildTreasuryBalance in schema.prisma.
const TREASURY_SEED: Array<{ resourceType: string, resourceKey: string }> = [
  { resourceType: 'CURRENCY', resourceKey: 'ZEN' },
  { resourceType: 'CURRENCY', resourceKey: 'WCOIN' },
  { resourceType: 'CURRENCY', resourceKey: 'GOBLIN_POINT' },
  { resourceType: 'CURRENCY', resourceKey: 'HUNT_POINT' },
  { resourceType: 'JEWEL', resourceKey: 'JEWEL_BLESS' },
  { resourceType: 'JEWEL', resourceKey: 'JEWEL_SOUL' },
  { resourceType: 'JEWEL', resourceKey: 'JEWEL_CHAOS' }
]

const pageValues = (query: GuildQuery) => {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 20))
  return { page, pageSize, skip: (page - 1) * pageSize }
}

const slugify = (value: string) => value
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue

@Injectable()
export class GuildsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly observability: ObservabilityService,
    private readonly media: GuildsMediaService
  ) {}

  private guildSummaryInclude() {
    return {
      focusTags: { select: { tag: true } },
      _count: { select: { members: { where: { removedAt: null } } } }
    } satisfies Prisma.GuildInclude
  }

  async directory(query: GuildQuery) {
    const { page, pageSize, skip } = pageValues(query)
    const search = query.search?.trim()
    const where: Prisma.GuildWhereInput = {
      status: 'ACTIVE',
      ...(query.recruitment ? { recruitment: query.recruitment } : {}),
      ...(query.focus ? { focusTags: { some: { tag: query.focus } } } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { tag: { contains: search } }] } : {})
    }
    // Relation-count ordering (`members: { _count }`) can't be filtered by
    // removedAt the way the `_count.select` above can -- acceptable for an
    // MVP directory sort, unlike the returned member count which must be
    // accurate.
    const orderBy: Prisma.GuildOrderByWithRelationInput[] =
      query.sort === 'level' ? [{ guildLevel: 'desc' }, { guildXp: 'desc' }]
      : query.sort === 'name' ? [{ name: 'asc' }]
      : query.sort === 'members' ? [{ members: { _count: 'desc' } }]
      : [{ createdAt: 'desc' }]
    const [data, total] = await Promise.all([
      this.prisma.guild.findMany({ where, include: this.guildSummaryInclude(), orderBy, skip, take: pageSize }),
      this.prisma.guild.count({ where })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  private async guildBySlugOrThrow(slug: string) {
    const guild = await this.prisma.guild.findUnique({
      where: { slug },
      include: {
        focusTags: { select: { tag: true } },
        members: {
          where: { removedAt: null },
          orderBy: { roleKey: 'asc' },
          include: {
            character: { select: { id: true, name: true, className: true, level: true } },
            account: { select: { id: true, username: true } }
          }
        },
        _count: { select: { members: { where: { removedAt: null } }, requests: true, projects: true } }
      }
    })
    if (!guild) throw new NotFoundException('Guild não encontrada.')
    return guild
  }

  async bySlug(slug: string) {
    return this.guildBySlugOrThrow(slug)
  }

  private async guildIdBySlug(slug: string) {
    const guild = await this.prisma.guild.findUnique({ where: { slug }, select: { id: true, name: true, status: true, recruitment: true } })
    if (!guild) throw new NotFoundException('Guild não encontrada.')
    return guild
  }

  async members(slug: string, query: GuildQuery) {
    const guild = await this.guildIdBySlug(slug)
    const { page, pageSize, skip } = pageValues(query)
    const where: Prisma.GuildMemberWhereInput = { guildId: guild.id, removedAt: null }
    const [data, total] = await Promise.all([
      this.prisma.guildMember.findMany({
        where, skip, take: pageSize, orderBy: [{ roleKey: 'asc' }, { joinedAt: 'asc' }],
        include: {
          character: { select: { id: true, name: true, className: true, level: true } },
          account: { select: { id: true, username: true } }
        }
      }),
      this.prisma.guildMember.count({ where })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async requests(slug: string, query: GuildQuery) {
    const guild = await this.guildIdBySlug(slug)
    const { page, pageSize, skip } = pageValues(query)
    const where: Prisma.GuildRequestWhereInput = { guildId: guild.id, status: { not: 'CANCELLED' } }
    const [data, total] = await Promise.all([
      this.prisma.guildRequest.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.guildRequest.count({ where })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async projects(slug: string, query: GuildQuery) {
    const guild = await this.guildIdBySlug(slug)
    const { page, pageSize, skip } = pageValues(query)
    const where: Prisma.GuildProjectWhereInput = { guildId: guild.id }
    const [data, total] = await Promise.all([
      this.prisma.guildProject.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.guildProject.count({ where })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  // Tier B: real, auditable rows, zero write endpoint. No deposit is
  // modeled this round -- these stay the zero-value rows seeded at guild
  // creation until a future round adds real GuildMovement execution. A
  // deposit here would never grant guildXp even then -- see the module
  // header in schema.prisma.
  async treasury(slug: string) {
    const guild = await this.guildIdBySlug(slug)
    const treasury = await this.prisma.guildTreasury.findUnique({ where: { guildId: guild.id }, include: { balances: true } })
    return { balances: treasury?.balances || [] }
  }

  // LEADER/OFFICER-only listing of pending join requests -- separate from
  // requests() (GuildRequest, resource asks), this is GuildJoinRequest
  // (membership asks). Needed for the approve/reject UI to have anything to
  // act on.
  async joinRequests(slug: string, user: AuthenticatedUser) {
    const guild = await this.guildIdBySlug(slug)
    await this.assertRole(guild.id, user, ['LEADER', 'OFFICER'])
    const requests = await this.prisma.guildJoinRequest.findMany({
      where: { guildId: guild.id, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: 100
    })
    if (!requests.length) return []
    // GuildJoinRequest.characterId/accountId are plain scalars (no Prisma
    // relation) -- same reasoning as GuildMovement, kept out of the
    // relation graph. Resolved with two batched lookups instead.
    const [characters, accounts] = await Promise.all([
      this.prisma.accountCharacter.findMany({ where: { id: { in: requests.map((request) => request.characterId) } }, select: { id: true, name: true, className: true, level: true } }),
      this.prisma.account.findMany({ where: { id: { in: requests.map((request) => request.accountId) } }, select: { id: true, username: true } })
    ])
    return requests.map((request) => ({
      ...request,
      character: characters.find((character) => character.id === request.characterId) || null,
      account: accounts.find((account) => account.id === request.accountId) || null
    }))
  }

  async vault(slug: string) {
    const guild = await this.guildIdBySlug(slug)
    const vault = await this.prisma.guildVault.findUnique({ where: { guildId: guild.id }, include: { items: true } })
    return { items: vault?.items || [] }
  }

  async mine(user: AuthenticatedUser) {
    return this.prisma.guildMember.findMany({
      where: { accountId: user.id, removedAt: null },
      include: {
        guild: { select: { id: true, slug: true, name: true, tag: true, emblemUrl: true, guildLevel: true } },
        character: { select: { id: true, name: true } }
      }
    })
  }

  private async ownCharacter(characterId: string, user: AuthenticatedUser) {
    const character = await this.prisma.accountCharacter.findFirst({ where: { id: characterId, accountId: user.id } })
    if (!character) throw new BadRequestException('Personagem inválido ou não pertence à sua conta.')
    return character
  }

  // Any active membership this account holds in this specific guild --
  // normally exactly one, but membership is per-character (characterId is
  // globally unique on GuildMember), so never assume the whole account
  // belongs to one guild overall.
  private async actingMembership(guildId: string, user: AuthenticatedUser) {
    const membership = await this.prisma.guildMember.findFirst({
      where: { guildId, accountId: user.id, removedAt: null },
      orderBy: { joinedAt: 'asc' }
    })
    if (!membership) throw new ForbiddenException('Você não é membro desta guild.')
    return membership
  }

  private async assertRole(guildId: string, user: AuthenticatedUser, allowed: RoleKey[]) {
    const membership = await this.actingMembership(guildId, user)
    if (!allowed.includes(membership.roleKey as RoleKey)) {
      throw new ForbiddenException('Você não tem permissão para esta ação na guild.')
    }
    return membership
  }

  private requiredText(value: string | undefined, label: string, min = 2, max = 191) {
    const text = value?.trim()
    if (!text || text.length < min) throw new BadRequestException(`Informe ${label}.`)
    return text.slice(0, max)
  }

  // Shared by admin creation (GuildsAdminService.createGuild) and
  // self-service creation (createGuildSelfService below, Guild Step 5.5).
  // Gateway-agnostic by caller -- the eligibility/ownership rules that make
  // self-service safe (own character, no active membership, rate limiting)
  // live in the caller, not here, so admin creation keeps its own latitude
  // (e.g. an arbitrary leaderCharacterId) unchanged.
  async createGuild(payload: GuildCreatePayload, actingUser: AuthenticatedUser) {
    const name = this.requiredText(payload.name, 'o nome da guild', 3, 100)
    const tag = this.requiredText(payload.tag, 'a tag da guild', 2, 10).toUpperCase()
    // Name/tag uniqueness (Guild Step 5.5): neither was ever DB-unique --
    // only the derived slug is (@unique in schema.prisma) -- so two guilds
    // could already share a name/tag under different slugs before this
    // check existed. Scoped to ACTIVE guilds only: a DISBANDED guild's name
    // is invisible everywhere a user could see it (directory already
    // filters to status: 'ACTIVE'), so its name/tag are free to reuse. This
    // does NOT touch the slug uniqueness constraint itself, which stays
    // unconditional -- re-creating a disbanded "Dragons" still lands on
    // slug "dragons-2" even though "dragons" is now free by this rule. That
    // inconsistency is a real, open product question (see NAME_REUSE_POLICY
    // in the Guild Step 5.5 report), not something silently resolved here.
    const collision = await this.prisma.guild.findFirst({
      where: { status: 'ACTIVE', OR: [{ name: { equals: name } }, { tag: { equals: tag } }] },
      select: { name: true, tag: true }
    })
    if (collision) {
      throw new BadRequestException(
        collision.tag.toUpperCase() === tag ? 'Esta tag já está em uso por outra guild ativa.' : 'Este nome já está em uso por outra guild ativa.'
      )
    }
    const slugBase = slugify(name) || slugify(tag)
    if (!slugBase) throw new BadRequestException('Não foi possível gerar um identificador para a guild.')
    let slug = slugBase
    let attempt = 1
    while (await this.prisma.guild.findUnique({ where: { slug }, select: { id: true } })) {
      attempt += 1
      slug = `${slugBase}-${attempt}`
    }
    const focusTags = Array.isArray(payload.focusTags) ? [...new Set(payload.focusTags)] : []
    const foundedByAccountId = payload.foundedByAccountId || null

    let guild
    try {
      guild = await this.prisma.$transaction(async (tx) => {
        const created = await tx.guild.create({
          data: {
            slug,
            name,
            tag,
            description: payload.description?.trim().slice(0, 4000) || null,
            recruitment: payload.recruitment || 'APPROVAL_REQUIRED',
            foundedByAccountId,
            focusTags: focusTags.length ? { create: focusTags.map((focusTag) => ({ tag: focusTag })) } : undefined,
            treasury: { create: { balances: { create: TREASURY_SEED } } },
            vault: { create: {} }
          }
        })
        if (payload.leaderCharacterId) {
          const character = await tx.accountCharacter.findUnique({ where: { id: payload.leaderCharacterId } })
          if (character) {
            const member = await tx.guildMember.upsert({
              where: { characterId: character.id },
              create: { guildId: created.id, characterId: character.id, accountId: character.accountId, roleKey: 'LEADER' },
              update: {
                guildId: created.id, accountId: character.accountId, roleKey: 'LEADER',
                removedAt: null, removedBy: null, removedReason: null, joinedAt: new Date()
              }
            })
            await tx.guild.update({ where: { id: created.id }, data: { leaderMemberId: member.id } })
          }
        }
        return created
      })
    } catch (error) {
      // The name/tag collision check and the slug-collision loop above are
      // both plain reads before this write -- neither is a lock. Two
      // requests racing to create the same name/tag (Guild Step 5.5 point
      // 7) can both pass those checks and then collide here on slug's real
      // DB-unique constraint, which MySQL enforces regardless. That is the
      // actual safety net for this race (name/tag themselves have none --
      // see the comment above), same P2002-to-400 pattern already used in
      // acceptInvite. Surfaced as a clean 400, never an unhandled 500.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Uma guild com esse nome ou tag acabou de ser criada. Tente novamente.')
      }
      throw error
    }

    await this.observability.recordOperationalEvent({
      module: 'guilds', eventType: 'GUILD_CREATED', entityType: 'Guild', entityId: guild.id,
      actorUserId: actingUser.id, description: `Guild "${guild.name}" [${guild.tag}] criada.`,
      data: { slug: guild.slug, source: guild.source }
    })
    return this.guildBySlugOrThrow(guild.slug)
  }

  // Designated hook for future creation-eligibility policy (minimumLevel,
  // minimumReset, zenCost, itemRequirement, ...) -- Guild Step 5.5
  // deliberately does not invent values for any of these; today every
  // owned, unaffiliated character is eligible. Kept as one explicit
  // function (not a config table/admin UI) so a real policy has a single,
  // obvious place to land later without restructuring createGuildSelfService
  // itself -- building that config system now, before any value is decided,
  // would be the overengineering the spec explicitly warned against.
  private assertCreationEligibility(_character: { id: string, level: number, reset: number }) {
    // Permissive: no rule active yet.
  }

  // Player-facing counterpart to admin creation (GuildsAdminService.createGuild).
  // Reuses the same createGuild core -- same slug/treasury/leader-upsert/audit
  // logic -- but layers the eligibility rules a self-service caller actually
  // needs and an admin caller doesn't: the character must belong to the
  // caller's own account, and must not already hold an active membership
  // anywhere. foundedByAccountId and leaderCharacterId are never taken from
  // the client payload here -- forced to the verified caller/character so a
  // player can never claim founder credit for, or hand leadership to,
  // someone else's character.
  async createGuildSelfService(payload: GuildCreatePayload, user: AuthenticatedUser) {
    const characterId = this.requiredText(payload.leaderCharacterId, 'o personagem líder', 1, 191)
    const character = await this.ownCharacter(characterId, user)
    const existingMembership = await this.prisma.guildMember.findUnique({ where: { characterId: character.id } })
    if (existingMembership && !existingMembership.removedAt) {
      throw new BadRequestException('Este personagem já pertence a uma guild. Saia da guild atual antes de criar uma nova.')
    }
    this.assertCreationEligibility(character)
    return this.createGuild(
      {
        name: payload.name,
        tag: payload.tag,
        description: payload.description,
        recruitment: payload.recruitment,
        focusTags: payload.focusTags,
        leaderCharacterId: character.id,
        foundedByAccountId: user.id
      },
      user
    )
  }

  async updateGuild(slug: string, payload: GuildUpdatePayload, user: AuthenticatedUser) {
    const guild = await this.prisma.guild.findUnique({ where: { slug } })
    if (!guild) throw new NotFoundException('Guild não encontrada.')
    await this.assertRole(guild.id, user, ['LEADER', 'OFFICER'])
    const data: Prisma.GuildUpdateInput = {
      ...(payload.name !== undefined ? { name: this.requiredText(payload.name, 'o nome da guild', 3, 100) } : {}),
      ...(payload.tag !== undefined ? { tag: this.requiredText(payload.tag, 'a tag da guild', 2, 10).toUpperCase() } : {}),
      ...(payload.description !== undefined ? { description: payload.description?.trim().slice(0, 4000) || null } : {}),
      ...(payload.recruitment ? { recruitment: payload.recruitment } : {})
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.guild.update({ where: { id: guild.id }, data })
      if (payload.focusTags) {
        const focusTags = [...new Set(payload.focusTags)]
        await tx.guildFocusAssignment.deleteMany({ where: { guildId: guild.id } })
        if (focusTags.length) await tx.guildFocusAssignment.createMany({ data: focusTags.map((focusTag) => ({ guildId: guild.id, tag: focusTag })) })
      }
      return result
    })
    await this.observability.recordOperationalEvent({ module: 'guilds', eventType: 'GUILD_UPDATED', entityType: 'Guild', entityId: guild.id, actorUserId: user.id, description: 'Perfil da guild atualizado.' })
    return this.guildBySlugOrThrow(updated.slug)
  }

  // Leader-facing disband (Guild Step 5.5). LEADER-only -- assertRole below,
  // not just the controller's @RequireStepUp() -- and step-up itself is
  // enforced at the controller via StepUpGuard, not here, so this method's
  // own authority check is the backend-final one regardless of what guard
  // wiring looks like at the edge.
  //
  // Same non-destructive model the existing admin DISBAND action already
  // uses (GuildsAdminService.action): a GuildStatus flip, never a hard
  // delete. GuildMember/Treasury/Vault/Project rows are untouched -- history
  // is preserved by design (spec point 8), and directory()/bySlug() already
  // exclude non-ACTIVE guilds from anywhere a user could act on them.
  //
  // What IS actively touched: every PENDING GuildInvite and GuildJoinRequest
  // for this guild is mass-cancelled in the SAME transaction as the status
  // flip. This closes the ordinary (non-racing) case of "no pending
  // invite/request should stay usable after disband" outright, and combines
  // with write-time `status: 'PENDING'` guards already added to
  // accept/decline/cancel/approve/reject (see those methods) to close the
  // genuinely concurrent case too: whichever transaction's write lands
  // first wins, and the loser gets a clean rejection, never a silent
  // success against a guild that no longer exists.
  async disbandGuild(slug: string, payload: GuildDisbandPayload, user: AuthenticatedUser) {
    const guild = await this.prisma.guild.findUnique({ where: { slug } })
    if (!guild) throw new NotFoundException('Guild não encontrada.')
    await this.assertRole(guild.id, user, ['LEADER'])
    if (guild.status !== 'ACTIVE') throw new BadRequestException('Esta guild já não está ativa.')

    const confirmText = (payload.confirmText || '').trim()
    const matchesName = confirmText.length > 0 && confirmText.toUpperCase() === guild.name.toUpperCase()
    const matchesTag = confirmText.length > 0 && confirmText.toUpperCase() === guild.tag.toUpperCase()
    if (!matchesName && !matchesTag) {
      throw new BadRequestException(`Digite o nome ou a tag da guild ("${guild.name}" ou "${guild.tag}") para confirmar o encerramento.`)
    }

    const now = new Date()
    const [disbanded] = await this.retryOnWriteConflict(() => this.prisma.$transaction([
      this.prisma.guild.update({ where: { id: guild.id }, data: { status: 'DISBANDED' } }),
      this.prisma.guildInvite.updateMany({ where: { guildId: guild.id, status: 'PENDING' }, data: { status: 'CANCELLED', decidedAt: now } }),
      this.prisma.guildJoinRequest.updateMany({ where: { guildId: guild.id, status: 'PENDING' }, data: { status: 'CANCELLED', decidedBy: user.id, decidedAt: now, decisionNote: 'Guild encerrada pelo líder.' } })
    ]))

    await this.observability.recordOperationalEvent({
      module: 'guilds', eventType: 'GUILD_DISBANDED', entityType: 'Guild', entityId: guild.id,
      actorUserId: user.id, description: `Guild "${guild.name}" [${guild.tag}] encerrada pelo líder.`
    })
    return disbanded
  }

  async uploadEmblem(slug: string, file: Express.Multer.File, user: AuthenticatedUser) {
    const guild = await this.prisma.guild.findUnique({ where: { slug } })
    if (!guild) throw new NotFoundException('Guild não encontrada.')
    await this.assertRole(guild.id, user, ['LEADER', 'OFFICER'])
    return this.media.uploadEmblem(guild.id, file, user)
  }

  async uploadBanner(slug: string, file: Express.Multer.File, user: AuthenticatedUser) {
    const guild = await this.prisma.guild.findUnique({ where: { slug } })
    if (!guild) throw new NotFoundException('Guild não encontrada.')
    await this.assertRole(guild.id, user, ['LEADER', 'OFFICER'])
    return this.media.uploadBanner(guild.id, file, user)
  }

  async join(slug: string, payload: GuildJoinPayload, user: AuthenticatedUser) {
    const guild = await this.prisma.guild.findUnique({ where: { slug } })
    if (!guild) throw new NotFoundException('Guild não encontrada.')
    if (guild.status !== 'ACTIVE') throw new BadRequestException('Esta guild não está aceitando novos membros.')
    if (guild.recruitment === 'CLOSED') throw new BadRequestException('O recrutamento desta guild está fechado.')
    if (guild.recruitment === 'INVITE_ONLY') throw new ForbiddenException('Esta guild aceita apenas convites.')
    const character = await this.ownCharacter(this.requiredText(payload.characterId, 'o personagem', 1, 191), user)
    const existing = await this.prisma.guildMember.findUnique({ where: { characterId: character.id } })
    if (existing && !existing.removedAt) {
      throw new BadRequestException(existing.guildId === guild.id ? 'Este personagem já é membro desta guild.' : 'Este personagem já pertence a outra guild.')
    }
    if (guild.recruitment === 'OPEN') {
      // characterId is unique on GuildMember -- a character keeps exactly
      // one lifetime row across joins/leaves/rejoins, rather than a full
      // historical trail. Full history lives in the operational-event
      // stream regardless.
      //
      // Wrapped in a transaction that re-verifies guild.status immediately
      // before the write (Guild Step 5.5, "disband vs join"): the read at
      // the top of this method and this write are otherwise two separate
      // round-trips, wide enough for a concurrent disband to land in
      // between and leave a brand-new member in a guild that no longer
      // exists.
      try {
        const member = await this.prisma.$transaction(async (tx) => {
          const stillActive = await tx.guild.findFirst({ where: { id: guild.id, status: 'ACTIVE' }, select: { id: true } })
          if (!stillActive) throw new BadRequestException('Esta guild não está aceitando novos membros.')
          const memberFields = { guildId: guild.id, accountId: user.id, roleKey: 'MEMBER', joinedAt: new Date(), removedAt: null, removedBy: null, removedReason: null }
          // Same write-time re-verification as acceptInvite()/
          // approveJoinRequest() -- upsert() here would silently UPDATE into
          // a row a concurrent join/accept/approve for this same character
          // (e.g. another OPEN guild, or an invite accepted elsewhere) just
          // created or reclaimed, instead of erroring. See acceptInvite() for
          // the full rationale.
          if (existing) {
            const rejoin = await tx.guildMember.updateMany({ where: { characterId: character.id, removedAt: { not: null } }, data: memberFields })
            if (rejoin.count === 0) throw new BadRequestException('Este personagem já pertence a uma guild.')
            return tx.guildMember.findUniqueOrThrow({ where: { characterId: character.id } })
          }
          return tx.guildMember.create({ data: { characterId: character.id, ...memberFields } })
        })
        await this.observability.recordOperationalEvent({ module: 'guilds', eventType: 'GUILD_MEMBER_JOINED', entityType: 'GuildMember', entityId: member.id, actorUserId: user.id, description: `Personagem entrou na guild "${guild.name}".` })
        return { status: 'JOINED' as const, member }
      } catch (error) {
        // Genuine unique-constraint loss on the create() path above -- the
        // loser gets a clean 400 here instead of a 500.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new BadRequestException('Este personagem já pertence a uma guild.')
        }
        throw error
      }
    }
    // Not a compound-key upsert: the unique index only covers PENDING (see
    // schema.prisma) so a character can rejoin after leaving/being kicked
    // without colliding with its own earlier APPROVED/REJECTED rows.
    // Same write-time re-check as the OPEN branch above -- otherwise a
    // brand-new PENDING request could be created against a guild a
    // concurrent disband just cancelled everything else on, and nothing
    // would ever clean that one up afterward (disband only cancels
    // requests that already existed at the moment it ran).
    const request = await this.prisma.$transaction(async (tx) => {
      const stillActive = await tx.guild.findFirst({ where: { id: guild.id, status: 'ACTIVE' }, select: { id: true } })
      if (!stillActive) throw new BadRequestException('Esta guild não está aceitando novos membros.')
      const existingPending = await tx.guildJoinRequest.findFirst({ where: { guildId: guild.id, characterId: character.id, status: 'PENDING' } })
      return existingPending
        ? tx.guildJoinRequest.update({ where: { id: existingPending.id }, data: { message: payload.message?.trim().slice(0, 1000) || null } })
        : tx.guildJoinRequest.create({ data: { guildId: guild.id, characterId: character.id, accountId: user.id, message: payload.message?.trim().slice(0, 1000) || null } })
    })
    await this.observability.recordOperationalEvent({ module: 'guilds', eventType: 'GUILD_JOIN_REQUESTED', entityType: 'GuildJoinRequest', entityId: request.id, actorUserId: user.id, description: `Solicitação de entrada enviada para "${guild.name}".` })
    return { status: 'REQUESTED' as const, request }
  }

  private async guildAndJoinRequest(slug: string, requestId: string) {
    const guild = await this.prisma.guild.findUnique({ where: { slug } })
    if (!guild) throw new NotFoundException('Guild não encontrada.')
    const request = await this.prisma.guildJoinRequest.findFirst({ where: { id: requestId, guildId: guild.id } })
    if (!request) throw new NotFoundException('Solicitação não encontrada.')
    return { guild, request }
  }

  async approveJoinRequest(slug: string, requestId: string, payload: GuildJoinDecisionPayload, user: AuthenticatedUser) {
    const { guild, request } = await this.guildAndJoinRequest(slug, requestId)
    await this.assertRole(guild.id, user, ['LEADER', 'OFFICER'])
    if (request.status !== 'PENDING') throw new BadRequestException('Esta solicitação já foi decidida.')
    const existing = await this.prisma.guildMember.findUnique({ where: { characterId: request.characterId } })
    if (existing && !existing.removedAt) throw new BadRequestException('Este personagem já pertence a uma guild.')
    // updateMany + a fresh status: 'PENDING' filter, not the array-form
    // $transaction this used before: the write itself is now the race
    // check (Guild Step 5.5), not just the read above. A concurrent
    // disband's mass-cancel (disbandGuild) flips this same status field
    // away from PENDING, so this guard catches "disband vs invite accept"'s
    // sibling case -- approving a request -- with no separate guild.status
    // check needed: the request row's own status already carries that
    // information by the time disband has run.
    try {
      const member = await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.guildJoinRequest.updateMany({
          where: { id: request.id, status: 'PENDING' },
          data: { status: 'APPROVED', decidedBy: user.id, decidedAt: new Date(), decisionNote: payload.note?.trim().slice(0, 500) || null }
        })
        if (count === 0) throw new BadRequestException('Esta solicitação já foi decidida.')
        const memberFields = { guildId: guild.id, accountId: request.accountId, roleKey: 'MEMBER', invitedBy: user.id, joinedAt: new Date(), removedAt: null, removedBy: null, removedReason: null }
        // Same write-time re-verification as acceptInvite() -- upsert() here
        // would silently UPDATE into a row a concurrent accept/approve for
        // this same character already just created or reclaimed, instead of
        // erroring. See acceptInvite() for the full rationale.
        if (existing) {
          const rejoin = await tx.guildMember.updateMany({ where: { characterId: request.characterId, removedAt: { not: null } }, data: memberFields })
          if (rejoin.count === 0) throw new BadRequestException('Este personagem já pertence a uma guild.')
          return tx.guildMember.findUniqueOrThrow({ where: { characterId: request.characterId } })
        }
        return tx.guildMember.create({ data: { characterId: request.characterId, ...memberFields } })
      })
      await this.observability.recordOperationalEvent({ module: 'guilds', eventType: 'GUILD_JOIN_APPROVED', entityType: 'GuildJoinRequest', entityId: request.id, actorUserId: user.id, targetUserId: request.accountId, description: `Solicitação aprovada por ${user.username}.` })
      return member
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Este personagem já pertence a uma guild.')
      }
      throw error
    }
  }

  async rejectJoinRequest(slug: string, requestId: string, payload: GuildJoinDecisionPayload, user: AuthenticatedUser) {
    const { guild, request } = await this.guildAndJoinRequest(slug, requestId)
    await this.assertRole(guild.id, user, ['LEADER', 'OFFICER'])
    if (request.status !== 'PENDING') throw new BadRequestException('Esta solicitação já foi decidida.')
    const { count } = await this.prisma.guildJoinRequest.updateMany({
      where: { id: request.id, status: 'PENDING' },
      data: { status: 'REJECTED', decidedBy: user.id, decidedAt: new Date(), decisionNote: payload.note?.trim().slice(0, 500) || null }
    })
    if (count === 0) throw new BadRequestException('Esta solicitação já foi decidida.')
    const updated = await this.prisma.guildJoinRequest.findUniqueOrThrow({ where: { id: request.id } })
    await this.observability.recordOperationalEvent({ module: 'guilds', eventType: 'GUILD_JOIN_REJECTED', entityType: 'GuildJoinRequest', entityId: request.id, actorUserId: user.id, targetUserId: request.accountId, description: `Solicitação rejeitada por ${user.username}.` })
    return updated
  }

  async leave(slug: string, user: AuthenticatedUser) {
    const guild = await this.prisma.guild.findUnique({ where: { slug } })
    if (!guild) throw new NotFoundException('Guild não encontrada.')
    const membership = await this.actingMembership(guild.id, user)
    if (membership.roleKey === 'LEADER') {
      const others = await this.prisma.guildMember.count({ where: { guildId: guild.id, removedAt: null, id: { not: membership.id } } })
      if (others > 0) throw new BadRequestException('Transfira a liderança antes de sair da guild.')
    }
    const updated = await this.prisma.guildMember.update({ where: { id: membership.id }, data: { removedAt: new Date(), removedReason: 'Saída voluntária.' } })
    await this.observability.recordOperationalEvent({ module: 'guilds', eventType: 'GUILD_MEMBER_LEFT', entityType: 'GuildMember', entityId: membership.id, actorUserId: user.id, description: `Membro saiu da guild "${guild.name}".` })
    return updated
  }

  // ── Invites: guild-initiated counterpart to join()/GuildJoinRequest ──────
  // join() already covers OPEN (instant) and APPROVAL_REQUIRED (player asks,
  // guild decides). INVITE_ONLY guilds have no self-service path by design
  // (join() rejects them with 403) -- these five methods are the only way
  // in for that mode. Invite creation itself is allowed for OPEN and
  // APPROVAL_REQUIRED too: a LEADER/OFFICER reaching out to a specific
  // player directly is a reasonable action regardless of the guild's
  // self-service posture, and gating it out would be an arbitrary asymmetry
  // with no real protection behind it. CLOSED still blocks every path,
  // invites included -- "closed" means closed.

  // LEADER/OFFICER-only search for invite targets. Deliberately narrower
  // than GET /characters (characters.service.ts's list(), which is scoped to
  // the caller's own account unless GM+): that endpoint's cross-account
  // search is an intentionally privileged capability, not something to
  // widen for every guild officer. This returns only the minimal fields
  // needed to pick an invite target, and only characters actually eligible
  // (no active guild membership).
  async inviteCandidates(slug: string, query: GuildInviteCandidateQuery, user: AuthenticatedUser) {
    const guild = await this.guildIdBySlug(slug)
    await this.assertRole(guild.id, user, ['LEADER', 'OFFICER'])
    const search = (query.search || '').trim()
    if (search.length < 2) return []
    const characters = await this.prisma.accountCharacter.findMany({
      where: {
        name: { contains: search },
        OR: [
          { guildMembership: null },
          { guildMembership: { removedAt: { not: null } } }
        ]
      },
      select: { id: true, name: true, className: true, level: true, account: { select: { id: true, username: true } } },
      take: 20,
      orderBy: { name: 'asc' }
    })
    // A character already holding a PENDING invite from THIS guild is still
    // a valid search result (the UI shows its pending state rather than
    // hiding it), so no additional filter here -- inviteToGuild() is what
    // enforces "at most one live PENDING invite per character per guild".
    return characters
  }

  async inviteToGuild(slug: string, payload: GuildInvitePayload, user: AuthenticatedUser) {
    const guild = await this.guildIdBySlug(slug)
    await this.assertRole(guild.id, user, ['LEADER', 'OFFICER'])
    if (guild.status !== 'ACTIVE') throw new BadRequestException('Esta guild não está aceitando novos membros.')
    if (guild.recruitment === 'CLOSED') throw new BadRequestException('O recrutamento desta guild está fechado.')
    const characterId = this.requiredText(payload.characterId, 'o personagem', 1, 191)
    const character = await this.prisma.accountCharacter.findUnique({ where: { id: characterId } })
    if (!character) throw new BadRequestException('Personagem inválido.')
    const existingMembership = await this.prisma.guildMember.findUnique({ where: { characterId } })
    if (existingMembership && !existingMembership.removedAt) {
      throw new BadRequestException(existingMembership.guildId === guild.id ? 'Este personagem já é membro desta guild.' : 'Este personagem já pertence a outra guild.')
    }
    // Idempotent, not error-on-duplicate: a second invite attempt while one
    // is already PENDING just refreshes the message on the existing row,
    // same "existingPending" pattern join() uses for GuildJoinRequest.
    // Not a compound-key unique index -- same reasoning as GuildJoinRequest
    // (schema.prisma): a character can be re-invited after a prior
    // invite was declined/cancelled, which would collide with that earlier
    // decided row under a DB-level unique constraint. Enforced here instead.
    const existingPending = await this.prisma.guildInvite.findFirst({ where: { guildId: guild.id, characterId, status: 'PENDING' } })
    const invite = existingPending
      ? await this.prisma.guildInvite.update({ where: { id: existingPending.id }, data: { message: payload.message?.trim().slice(0, 1000) || null } })
      : await this.prisma.guildInvite.create({ data: { guildId: guild.id, characterId, accountId: character.accountId, invitedBy: user.id, message: payload.message?.trim().slice(0, 1000) || null } })
    await this.observability.recordOperationalEvent({ module: 'guilds', eventType: 'GUILD_INVITE_CREATED', entityType: 'GuildInvite', entityId: invite.id, actorUserId: user.id, targetUserId: character.accountId, description: `Convite enviado para "${guild.name}".` })
    return invite
  }

  // LEADER/OFFICER-only listing of this guild's pending invites, for the
  // cancel UI. Mirrors joinRequests() exactly (same batched-lookup shape,
  // since GuildInvite.characterId/accountId are plain scalars too).
  async guildInvites(slug: string, user: AuthenticatedUser) {
    const guild = await this.guildIdBySlug(slug)
    await this.assertRole(guild.id, user, ['LEADER', 'OFFICER'])
    const invites = await this.prisma.guildInvite.findMany({
      where: { guildId: guild.id, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: 100
    })
    if (!invites.length) return []
    const characters = await this.prisma.accountCharacter.findMany({ where: { id: { in: invites.map((invite) => invite.characterId) } }, select: { id: true, name: true, className: true, level: true } })
    return invites.map((invite) => ({ ...invite, character: characters.find((character) => character.id === invite.characterId) || null }))
  }

  // Player-facing: every PENDING invite across every guild for this account.
  // Includes guild.slug so the accept/decline UI can call the :slug-scoped
  // endpoints below without a separate lookup.
  async myInvites(user: AuthenticatedUser) {
    const invites = await this.prisma.guildInvite.findMany({
      where: { accountId: user.id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { guild: { select: { id: true, slug: true, name: true, tag: true, emblemUrl: true } } }
    })
    if (!invites.length) return []
    const characters = await this.prisma.accountCharacter.findMany({ where: { id: { in: invites.map((invite) => invite.characterId) } }, select: { id: true, name: true } })
    return invites.map((invite) => ({ ...invite, character: characters.find((character) => character.id === invite.characterId) || null }))
  }

  private async guildAndInvite(slug: string, inviteId: string) {
    const guild = await this.prisma.guild.findUnique({ where: { slug } })
    if (!guild) throw new NotFoundException('Guild não encontrada.')
    const invite = await this.prisma.guildInvite.findFirst({ where: { id: inviteId, guildId: guild.id } })
    if (!invite) throw new NotFoundException('Convite não encontrado.')
    return { guild, invite }
  }

  async acceptInvite(slug: string, inviteId: string, user: AuthenticatedUser) {
    const { guild, invite } = await this.guildAndInvite(slug, inviteId)
    // Authorization: only the invited ACCOUNT may accept -- not membership
    // in the guild, not any role check. This is the direct answer to "a
    // player tries to accept another user's invite" (point 18): the invite
    // names a specific accountId at creation time and that never changes.
    if (invite.accountId !== user.id) throw new ForbiddenException('Este convite não pertence à sua conta.')
    if (invite.status !== 'PENDING') throw new BadRequestException('Este convite já foi decidido.')
    const existingMembership = await this.prisma.guildMember.findUnique({ where: { characterId: invite.characterId } })
    if (existingMembership && !existingMembership.removedAt) throw new BadRequestException('Este personagem já pertence a uma guild.')
    try {
      const member = await this.prisma.$transaction(async (tx) => {
        // Same write-time guard class as approveJoinRequest -- a concurrent
        // disband's mass-cancel (disbandGuild) flips this invite's status
        // away from PENDING, so this catches "disband vs invite accept"
        // with no separate guild.status check needed.
        const { count } = await tx.guildInvite.updateMany({ where: { id: invite.id, status: 'PENDING' }, data: { status: 'ACCEPTED', decidedAt: new Date() } })
        if (count === 0) throw new BadRequestException('Este convite já foi decidido.')
        const memberFields = { guildId: guild.id, accountId: invite.accountId, roleKey: 'MEMBER', invitedBy: invite.invitedBy, joinedAt: new Date(), removedAt: null, removedBy: null, removedReason: null }
        // The pre-check above is best-effort, not a lock, so the two branches
        // below each re-verify at write time instead of trusting it:
        // - No prior row: plain create() -- MySQL's unique index on
        //   characterId genuinely rejects a second concurrent insert (unlike
        //   upsert(), which silently UPDATEs into an existing row instead of
        //   erroring, letting two racing accepts for the same character both
        //   report success).
        // - Prior row soft-removed: a conditional updateMany() that only
        //   matches while removedAt is still set, so a second accept racing
        //   to rejoin the very same removed row can't silently steal it back
        //   after the first one already claimed it.
        if (existingMembership) {
          const rejoin = await tx.guildMember.updateMany({ where: { characterId: invite.characterId, removedAt: { not: null } }, data: memberFields })
          if (rejoin.count === 0) throw new BadRequestException('Este personagem já pertence a uma guild.')
          return tx.guildMember.findUniqueOrThrow({ where: { characterId: invite.characterId } })
        }
        return tx.guildMember.create({ data: { characterId: invite.characterId, ...memberFields } })
      })
      await this.observability.recordOperationalEvent({ module: 'guilds', eventType: 'GUILD_INVITE_ACCEPTED', entityType: 'GuildInvite', entityId: invite.id, actorUserId: user.id, description: `Convite aceito para "${guild.name}".` })
      return member
    } catch (error) {
      // Genuine unique-constraint loss on the create() path above -- the
      // loser gets a clean 400 here instead of a 500.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Este personagem já pertence a uma guild.')
      }
      throw error
    }
  }

  async declineInvite(slug: string, inviteId: string, user: AuthenticatedUser) {
    const { guild, invite } = await this.guildAndInvite(slug, inviteId)
    if (invite.accountId !== user.id) throw new ForbiddenException('Este convite não pertence à sua conta.')
    if (invite.status !== 'PENDING') throw new BadRequestException('Este convite já foi decidido.')
    const { count } = await this.prisma.guildInvite.updateMany({ where: { id: invite.id, status: 'PENDING' }, data: { status: 'DECLINED', decidedAt: new Date() } })
    if (count === 0) throw new BadRequestException('Este convite já foi decidido.')
    const updated = await this.prisma.guildInvite.findUniqueOrThrow({ where: { id: invite.id } })
    await this.observability.recordOperationalEvent({ module: 'guilds', eventType: 'GUILD_INVITE_DECLINED', entityType: 'GuildInvite', entityId: invite.id, actorUserId: user.id, description: `Convite recusado para "${guild.name}".` })
    return updated
  }

  async cancelInvite(slug: string, inviteId: string, user: AuthenticatedUser) {
    const { guild, invite } = await this.guildAndInvite(slug, inviteId)
    await this.assertRole(guild.id, user, ['LEADER', 'OFFICER'])
    if (invite.status !== 'PENDING') throw new BadRequestException('Este convite já foi decidido.')
    const { count } = await this.prisma.guildInvite.updateMany({ where: { id: invite.id, status: 'PENDING' }, data: { status: 'CANCELLED', decidedAt: new Date() } })
    if (count === 0) throw new BadRequestException('Este convite já foi decidido.')
    const updated = await this.prisma.guildInvite.findUniqueOrThrow({ where: { id: invite.id } })
    await this.observability.recordOperationalEvent({ module: 'guilds', eventType: 'GUILD_INVITE_CANCELLED', entityType: 'GuildInvite', entityId: invite.id, actorUserId: user.id, targetUserId: invite.accountId, description: `Convite cancelado para "${guild.name}".` })
    return updated
  }

  private async guildAndMember(slug: string, memberId: string) {
    const guild = await this.prisma.guild.findUnique({ where: { slug } })
    if (!guild) throw new NotFoundException('Guild não encontrada.')
    const member = await this.prisma.guildMember.findFirst({ where: { id: memberId, guildId: guild.id, removedAt: null } })
    if (!member) throw new NotFoundException('Membro não encontrado.')
    return { guild, member }
  }

  // disbandGuild's transaction and updateMemberRole's LEADER-transfer
  // transaction both write the same Guild row (and can touch overlapping
  // GuildMember rows) -- under true concurrent execution, MySQL/InnoDB can
  // pick either transaction as the deadlock victim and roll it back, which
  // Prisma surfaces as PrismaClientKnownRequestError code P2034 ("Transaction
  // failed due to a write conflict or a deadlock. Please retry your
  // transaction"). Prisma does not retry this itself (see Prisma docs on
  // interactive transactions) -- left uncaught, it would propagate as an
  // unhandled 500, violating the "concurrent legitimate operations never
  // return 500" invariant these two methods are held to. A short, bounded
  // retry is the standard, documented mitigation for this exact error code.
  // Only P2034 is retried -- any other error (including the deliberate
  // NotFoundException/BadRequestException rejections both transactions can
  // throw) propagates immediately on the first attempt.
  private async retryOnWriteConflict<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        const isWriteConflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034'
        if (!isWriteConflict || attempt === attempts) throw error
      }
    }
    throw new Error('unreachable')
  }

  async updateMemberRole(slug: string, memberId: string, payload: GuildMemberRolePayload, user: AuthenticatedUser) {
    const { guild, member } = await this.guildAndMember(slug, memberId)
    await this.assertRole(guild.id, user, ['LEADER'])
    if (guild.status !== 'ACTIVE') throw new BadRequestException('Esta guild foi encerrada.')
    const roleKey = (payload.roleKey || '').toUpperCase()
    if (!ROLE_VOCABULARY.includes(roleKey as RoleKey)) throw new BadRequestException('Papel inválido.')

    if (roleKey === 'LEADER') {
      // A guild must have exactly one active LEADER. Setting roleKey='LEADER'
      // via this generic endpoint is therefore treated internally as a
      // leadership transfer, not an ordinary role change: any other member
      // currently holding 'LEADER' (normally just the previous leader, but
      // updateMany also self-heals any pre-existing duplicate from before
      // this fix) is demoted to 'OFFICER' -- the next tier down, no new role
      // invented -- in the SAME transaction as the promotion, so there is
      // never a window with zero or two LEADER members. assertRole() checks
      // roleKey directly, so leaving a stale second 'LEADER' around would
      // have granted that ex-leader ongoing LEADER-only authority, not just
      // a cosmetic data inconsistency.
      if (member.roleKey === 'LEADER') return member
      const promoted = await this.retryOnWriteConflict(() => this.prisma.$transaction(async (tx) => {
        await tx.guildMember.updateMany({
          where: { guildId: guild.id, roleKey: 'LEADER', id: { not: member.id } },
          data: { roleKey: 'OFFICER' }
        })
        // guildAndMember() read the target before this transaction started --
        // if a concurrent kick removed them in between, a plain update-by-id
        // would still succeed here, promoting a removed member to LEADER
        // while leaving the guild with zero active LEADER rows (the target's
        // removedAt stays set; nothing else holds roleKey='LEADER' anymore).
        // updateMany + a fresh removedAt filter makes the write itself the
        // race check. Throwing inside an interactive $transaction rolls back
        // the whole thing, including the demotion above, so a rejected
        // transfer never leaves the guild leaderless.
        const { count } = await tx.guildMember.updateMany({ where: { id: member.id, removedAt: null, guild: { status: 'ACTIVE' } }, data: { roleKey: 'LEADER' } })
        if (count === 0) throw new NotFoundException('Membro não encontrado ou não está mais ativo na guild.')
        const next = await tx.guildMember.findUniqueOrThrow({ where: { id: member.id } })
        await tx.guild.update({ where: { id: guild.id }, data: { leaderMemberId: member.id } })
        return next
      }))
      await this.observability.recordOperationalEvent({ module: 'guilds', eventType: 'GUILD_LEADERSHIP_TRANSFERRED', entityType: 'GuildMember', entityId: member.id, actorUserId: user.id, targetUserId: member.accountId, description: `Liderança transferida para ${member.accountId}; líder anterior rebaixado a OFFICER.` })
      return promoted
    }

    // The mirror image of the dual-leader bug fixed for the promotion branch
    // above: nothing else in this generic endpoint stops the acting LEADER
    // from demoting THEMSELVES away from 'LEADER' (the only way this branch
    // is reached with member.roleKey === 'LEADER', since assertRole above
    // already requires the caller to BE the current LEADER). That would
    // leave Guild.leaderMemberId pointing at a member who no longer holds
    // roleKey='LEADER', and zero members holding it -- an orphaned guild,
    // not just a cosmetic inconsistency. Changing the current leader's own
    // role is a leadership-transfer action in disguise; it belongs to the
    // dedicated transfer flow (Guild Step 4), not this generic endpoint.
    if (member.roleKey === 'LEADER') {
      throw new BadRequestException('Use a transferência de liderança para alterar o papel do líder atual.')
    }

    // Guard against a role change landing on a member a concurrent kick just
    // removed: guildAndMember() read the row before either write happened,
    // so a plain update-by-id would silently apply a role to an already-
    // removed member. updateMany + a fresh removedAt filter makes the write
    // itself the race check, not just the earlier read.
    const { count } = await this.prisma.guildMember.updateMany({ where: { id: member.id, removedAt: null, guild: { status: 'ACTIVE' } }, data: { roleKey } })
    if (count === 0) throw new NotFoundException('Membro não encontrado.')
    const updated = await this.prisma.guildMember.findUniqueOrThrow({ where: { id: member.id } })
    await this.observability.recordOperationalEvent({ module: 'guilds', eventType: 'GUILD_MEMBER_ROLE_CHANGED', entityType: 'GuildMember', entityId: member.id, actorUserId: user.id, targetUserId: member.accountId, description: `Papel alterado para ${roleKey}.` })
    return updated
  }

  async kickMember(slug: string, memberId: string, payload: GuildMemberKickPayload, user: AuthenticatedUser) {
    const { guild, member } = await this.guildAndMember(slug, memberId)
    await this.assertRole(guild.id, user, ['LEADER', 'OFFICER'])
    if (member.roleKey === 'LEADER') throw new BadRequestException('O líder não pode ser removido diretamente.')
    const reason = this.requiredText(payload.reason, 'o motivo da remoção', 3, 500)
    // The roleKey === 'LEADER' check above reads the row BEFORE this write,
    // same seam as updateMemberRole. Without a write-time re-check, a kick
    // racing a concurrent leadership transfer could land after the target
    // was promoted, silently setting removedAt on the guild's new LEADER --
    // worse than a rejected kick, since nothing else would ever demote or
    // reassign leadership afterward. updateMany + a fresh roleKey/removedAt
    // filter makes the write itself the race check (Guild Step 4). The
    // guild:{status:'ACTIVE'} relation filter is Guild Step 5.5's addition,
    // closing "disband vs member role change"'s kick counterpart the same
    // way -- kicking someone is itself a role change away from active
    // membership, and a disbanded guild has no legitimate kicks left to make.
    const { count } = await this.prisma.guildMember.updateMany({
      where: { id: member.id, roleKey: { not: 'LEADER' }, removedAt: null, guild: { status: 'ACTIVE' } },
      data: { removedAt: new Date(), removedBy: user.id, removedReason: reason }
    })
    if (count === 0) throw new BadRequestException('Este membro não pode mais ser removido (papel ou estado mudou).')
    const updated = await this.prisma.guildMember.findUniqueOrThrow({ where: { id: member.id } })
    await this.observability.recordOperationalEvent({ module: 'guilds', eventType: 'GUILD_MEMBER_KICKED', entityType: 'GuildMember', entityId: member.id, actorUserId: user.id, targetUserId: member.accountId, description: reason })
    return updated
  }

  async createRequest(slug: string, payload: GuildRequestPayload, user: AuthenticatedUser) {
    const guild = await this.guildIdBySlug(slug)
    await this.actingMembership(guild.id, user)
    const type = payload.type
    if (!type) throw new BadRequestException('Informe o tipo da solicitação.')
    const title = this.requiredText(payload.title, 'um título', 3, 191)
    return this.prisma.guildRequest.create({
      data: {
        guildId: guild.id,
        createdByAccountId: user.id,
        createdByCharacterId: payload.characterId || null,
        type,
        title,
        description: payload.description?.trim().slice(0, 2000) || null,
        quantity: payload.quantity ? Math.max(1, Math.floor(payload.quantity)) : null,
        status: 'DRAFT',
        // Server-populated, never client-supplied.
        disclaimer: type === 'LOOKING_FOR_ITEM' ? 'Blood Moon não garante devolução de empréstimos entre players.' : null
      }
    })
  }

  private async guildAndOwnRequest(slug: string, requestId: string, user: AuthenticatedUser) {
    const guild = await this.guildIdBySlug(slug)
    const request = await this.prisma.guildRequest.findFirst({ where: { id: requestId, guildId: guild.id } })
    if (!request) throw new NotFoundException('Solicitação não encontrada.')
    const membership = await this.actingMembership(guild.id, user)
    if (request.createdByAccountId !== user.id && !['LEADER', 'OFFICER'].includes(membership.roleKey)) {
      throw new ForbiddenException('Você não pode alterar esta solicitação.')
    }
    return { guild, request }
  }

  async updateRequest(slug: string, requestId: string, payload: GuildRequestUpdatePayload, user: AuthenticatedUser) {
    const { request } = await this.guildAndOwnRequest(slug, requestId, user)
    if (['FULFILLED', 'CANCELLED', 'EXPIRED'].includes(request.status)) throw new BadRequestException('Esta solicitação não pode mais ser editada.')
    return this.prisma.guildRequest.update({
      where: { id: request.id },
      data: {
        ...(payload.title !== undefined ? { title: this.requiredText(payload.title, 'um título', 3, 191) } : {}),
        ...(payload.description !== undefined ? { description: payload.description?.trim().slice(0, 2000) || null } : {}),
        ...(payload.quantity !== undefined ? { quantity: payload.quantity ? Math.max(1, Math.floor(payload.quantity)) : null } : {}),
        ...(payload.status ? { status: payload.status } : {})
      }
    })
  }

  async cancelRequest(slug: string, requestId: string, user: AuthenticatedUser) {
    const { request } = await this.guildAndOwnRequest(slug, requestId, user)
    return this.prisma.guildRequest.update({ where: { id: request.id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: user.id } })
  }

  async createProject(slug: string, payload: GuildProjectPayload, user: AuthenticatedUser) {
    const guild = await this.guildIdBySlug(slug)
    await this.assertRole(guild.id, user, ['LEADER', 'OFFICER', 'TREASURER'])
    const title = this.requiredText(payload.title, 'um título', 3, 191)
    return this.prisma.guildProject.create({
      data: {
        guildId: guild.id,
        title,
        description: payload.description?.trim().slice(0, 2000) || null,
        goal: payload.goal?.trim().slice(0, 2000) || null,
        ownerAccountId: user.id,
        requiredResources: payload.requiredResources !== undefined ? json(payload.requiredResources) : undefined,
        deadline: payload.deadline ? new Date(payload.deadline) : null,
        impact: payload.impact?.trim().slice(0, 2000) || null
      }
    })
  }

  private async guildAndOwnProject(slug: string, projectId: string, user: AuthenticatedUser) {
    const guild = await this.guildIdBySlug(slug)
    const project = await this.prisma.guildProject.findFirst({ where: { id: projectId, guildId: guild.id } })
    if (!project) throw new NotFoundException('Projeto não encontrado.')
    const membership = await this.actingMembership(guild.id, user)
    if (project.ownerAccountId !== user.id && !['LEADER', 'OFFICER', 'TREASURER'].includes(membership.roleKey)) {
      throw new ForbiddenException('Você não pode alterar este projeto.')
    }
    return { guild, project }
  }

  async updateProject(slug: string, projectId: string, payload: GuildProjectUpdatePayload, user: AuthenticatedUser) {
    const { project } = await this.guildAndOwnProject(slug, projectId, user)
    if (['COMPLETED', 'CANCELLED'].includes(project.status)) throw new BadRequestException('Este projeto não pode mais ser editado.')
    return this.prisma.guildProject.update({
      where: { id: project.id },
      data: {
        ...(payload.title !== undefined ? { title: this.requiredText(payload.title, 'um título', 3, 191) } : {}),
        ...(payload.description !== undefined ? { description: payload.description?.trim().slice(0, 2000) || null } : {}),
        ...(payload.goal !== undefined ? { goal: payload.goal?.trim().slice(0, 2000) || null } : {}),
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.requiredResources !== undefined ? { requiredResources: json(payload.requiredResources) } : {}),
        ...(payload.availableResources !== undefined ? { availableResources: json(payload.availableResources) } : {}),
        ...(payload.contributors !== undefined ? { contributors: json(payload.contributors) } : {}),
        ...(payload.relatedPlayers !== undefined ? { relatedPlayers: json(payload.relatedPlayers) } : {}),
        ...(payload.deadline !== undefined ? { deadline: payload.deadline ? new Date(payload.deadline) : null } : {}),
        ...(payload.impact !== undefined ? { impact: payload.impact?.trim().slice(0, 2000) || null } : {})
      }
    })
  }

  async cancelProject(slug: string, projectId: string, user: AuthenticatedUser) {
    const { project } = await this.guildAndOwnProject(slug, projectId, user)
    return this.prisma.guildProject.update({ where: { id: project.id }, data: { status: 'CANCELLED' } })
  }
}
