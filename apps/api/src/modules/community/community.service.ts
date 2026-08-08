import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { CommunityPostType, CommunityPostVisibility, Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ObservabilityService } from '../observability/observability.service'
import { MediaService } from '../media/media.service'
import type {
  CommunityCommentPayload,
  CommunityPostPayload,
  CommunityProfilePayload,
  CommunityQuery,
  CommunityReactionPayload,
  CommunityReportPayload
} from './community.contract'

const reactionTypes = ['LIKE', 'HONOR', 'POWER', 'RARE', 'VICTORY'] as const

const pageValues = (query: CommunityQuery) => {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 20))
  return { page, pageSize, skip: (page - 1) * pageSize }
}

const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value ?? [])) as Prisma.InputJsonValue

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly observability: ObservabilityService,
    private readonly mediaService: MediaService
  ) {}

  private async profile(accountId: string, fallbackName: string) {
    return this.prisma.communityProfile.upsert({
      where: { accountId },
      create: { accountId, displayName: fallbackName },
      update: {}
    })
  }

  private async assertSocialAccess(user: AuthenticatedUser, action: 'post' | 'comment') {
    const profile = await this.profile(user.id, user.name || user.username)
    const now = new Date()
    if (profile.socialSuspendedUntil && profile.socialSuspendedUntil > now) {
      throw new ForbiddenException('Seu acesso à comunidade está temporariamente suspenso.')
    }
    const blockedUntil = action === 'post' ? profile.postBlockedUntil : profile.commentBlockedUntil
    if (blockedUntil && blockedUntil > now) {
      throw new ForbiddenException(`Você está temporariamente impedido de ${action === 'post' ? 'publicar' : 'comentar'}.`)
    }
    return profile
  }

  private async accessiblePost(postId: string, user: AuthenticatedUser) {
    const post = await this.prisma.communityPost.findFirst({
      where: { id: postId, status: 'PUBLISHED' },
      select: { id: true, authorId: true, visibility: true, author: { select: { communityProfile: { select: { isPublic: true } } } } }
    })
    if (!post) throw new NotFoundException('Publicação não encontrada.')
    if (post.authorId === user.id) return post
    const [blocked, follows] = await Promise.all([
      this.prisma.communitySocialRelation.findFirst({
        where: { type: 'BLOCK', OR: [{ actorId: user.id, targetId: post.authorId }, { actorId: post.authorId, targetId: user.id }] },
        select: { id: true }
      }),
      post.visibility === 'FOLLOWERS'
        ? this.prisma.communityFollow.findUnique({ where: { followerId_followingId: { followerId: user.id, followingId: post.authorId } }, select: { followerId: true } })
        : Promise.resolve(null)
    ])
    if (blocked || post.author.communityProfile?.isPublic === false || post.visibility === 'PRIVATE' || (post.visibility === 'FOLLOWERS' && !follows)) {
      throw new NotFoundException('Publicação não encontrada.')
    }
    return post
  }

  private domains(value: unknown) {
    return Array.isArray(value)
      ? value.map((item) => String(item).trim().toLowerCase()).filter(Boolean)
      : []
  }

  private extractDomains(value: string) {
    return [...value.matchAll(/https?:\/\/[^\s<>"']+/gi)].map((match) => {
      try { return new URL(match[0]).hostname.toLowerCase().replace(/^www\./, '') }
      catch { return '' }
    }).filter(Boolean)
  }

  private domainMatches(domain: string, rule: string) {
    const normalized = rule.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
    return domain === normalized || domain.endsWith(`.${normalized}`)
  }

  private postType(value?: CommunityPostType): CommunityPostType {
    const implemented: CommunityPostType[] = ['TEXT', 'IMAGE', 'GALLERY', 'GIF', 'ARTICLE']
    const type = value || 'TEXT'
    if (!implemented.includes(type)) throw new BadRequestException('Este tipo de publicacao esta preparado, mas ainda nao foi liberado.')
    return type
  }

  private visibility(value?: CommunityPostVisibility): CommunityPostVisibility {
    const allowed: CommunityPostVisibility[] = ['PUBLIC', 'FOLLOWERS', 'PRIVATE']
    if (value && !allowed.includes(value)) throw new BadRequestException('Visibilidade invalida.')
    return value || 'PUBLIC'
  }

  private metadata(content: string) {
    const tags = [...new Set([...content.matchAll(/#([\p{L}\p{N}_-]{2,50})/gu)].map((match) => match[1].toLowerCase()))]
    const mentions = [...new Set([...content.matchAll(/@([a-z0-9._-]{3,24})/gi)].map((match) => match[1].toLowerCase()))]
    return { tags: json(tags), mentions: json(mentions) }
  }

  private async validateText(text: string, action: 'post' | 'comment', accountId: string, enforceRateLimit = true) {
    const value = text.trim()
    if (value.length < 2 || value.length > (action === 'post' ? 10000 : 2000)) {
      throw new BadRequestException('O conteúdo possui tamanho inválido.')
    }
    const policy = await this.prisma.communityPolicy.findUnique({ where: { id: 'default' } })
    const blockedWords = Array.isArray(policy?.blockedWords) ? policy.blockedWords as string[] : []
    if (blockedWords.some((word) => word && value.toLowerCase().includes(word.toLowerCase()))) {
      await this.observability.recordOperationalEvent({
        module: 'community',
        eventType: 'COMMUNITY_SPAM_BLOCKED_WORD',
        severity: 'WARNING',
        actorUserId: accountId,
        description: 'Conteúdo bloqueado pelas regras de moderação automática.'
      })
      throw new BadRequestException('O conteúdo contém termo não permitido.')
    }
    const allowedDomains = this.domains(policy?.allowedDomains)
    const blockedDomains = this.domains(policy?.blockedDomains)
    const contentDomains = this.extractDomains(value)
    if (contentDomains.some((domain) => blockedDomains.some((rule) => this.domainMatches(domain, rule))) ||
        (allowedDomains.length && contentDomains.some((domain) => !allowedDomains.some((rule) => this.domainMatches(domain, rule))))) {
      await this.observability.recordOperationalEvent({
        module: 'community',
        eventType: 'COMMUNITY_SPAM_BLOCKED_LINK',
        severity: 'WARNING',
        actorUserId: accountId,
        description: 'Link bloqueado pelas regras de domínio da comunidade.'
      })
      throw new BadRequestException('O conteúdo possui um link não permitido.')
    }
    if (!enforceRateLimit) return value
    const since = new Date(Date.now() - 60 * 60 * 1000)
    const count = action === 'post'
      ? await this.prisma.communityPost.count({ where: { authorId: accountId, createdAt: { gte: since } } })
      : await this.prisma.communityComment.count({ where: { authorId: accountId, createdAt: { gte: since } } })
    const hourlyLimit = action === 'post' ? policy?.maxPostsPerHour ?? 10 : policy?.maxCommentsPerHour ?? 40
    if (count >= hourlyLimit) {
      await this.observability.recordOperationalEvent({
        module: 'community',
        eventType: 'COMMUNITY_SPAM_RATE_LIMIT',
        severity: 'WARNING',
        actorUserId: accountId,
        description: 'Limite horário da comunidade atingido.',
        data: { action, hourlyLimit }
      })
      throw new BadRequestException(`Limite de ${hourlyLimit} ${action === 'post' ? 'publicações' : 'comentários'} por hora atingido.`)
    }
    const latest = action === 'post'
      ? await this.prisma.communityPost.findFirst({ where: { authorId: accountId }, orderBy: { createdAt: 'desc' } })
      : await this.prisma.communityComment.findFirst({ where: { authorId: accountId }, orderBy: { createdAt: 'desc' } })
    const cooldown = action === 'post'
      ? policy?.postCooldownSeconds ?? 30
      : policy?.commentCooldownSeconds ?? 10
    if (latest && Date.now() - latest.createdAt.getTime() < cooldown * 1000) {
      throw new BadRequestException(`Aguarde ${cooldown} segundos antes de tentar novamente.`)
    }
    return value
  }

  async feed(query: CommunityQuery, user?: AuthenticatedUser) {
    const { page, pageSize, skip } = pageValues(query)
    const search = query.search?.trim()
    const feed = query.feed || (query.sort === 'recent' ? 'recent' : 'for-you')
    const [following, blocked, blockedBy, saved] = user ? await Promise.all([
      this.prisma.communityFollow.findMany({ where: { followerId: user.id }, select: { followingId: true } }),
      this.prisma.communitySocialRelation.findMany({ where: { actorId: user.id, type: 'BLOCK' }, select: { targetId: true } }),
      this.prisma.communitySocialRelation.findMany({ where: { targetId: user.id, type: 'BLOCK' }, select: { actorId: true } }),
      feed === 'saved' ? this.prisma.communityPostSave.findMany({ where: { accountId: user.id }, select: { postId: true } }) : Promise.resolve([])
    ]) : [[], [], [], []]
    const followedIds = following.map((item) => item.followingId)
    const excludedAuthorIds = [...new Set([...blocked.map((item) => item.targetId), ...blockedBy.map((item) => item.actorId)])]
    if ((feed === 'following' || feed === 'saved') && !user) throw new ForbiddenException('Entre na sua conta para acessar este feed.')
    const authorFilters: Prisma.StringFilter[] = []
    if (excludedAuthorIds.length) authorFilters.push({ notIn: excludedAuthorIds })
    if (feed === 'following') authorFilters.push({ in: followedIds })
    const where: Prisma.CommunityPostWhereInput = {
      status: 'PUBLISHED',
      ...(user ? {
        OR: [
          { visibility: 'PUBLIC' },
          { authorId: user.id },
          ...(followedIds.length ? [{ visibility: 'FOLLOWERS' as const, authorId: { in: followedIds } }] : [])
        ]
      } : { visibility: 'PUBLIC' }),
      author: { communityProfile: { isPublic: true } },
      ...(authorFilters.length ? { AND: authorFilters.map((authorId) => ({ authorId })) } : {}),
      ...(feed === 'saved' ? { id: { in: saved.map((item) => item.postId) } } : {}),
      ...(search ? { AND: [{ OR: [{ title: { contains: search } }, { content: { contains: search } }] }] } : {})
    }
    const [data, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        include: {
          author: { select: { id: true, username: true, name: true, communityProfile: true } },
          comments: {
            where: { status: 'PUBLISHED', parentId: null }, orderBy: { createdAt: 'asc' }, take: 5,
            include: {
              author: { select: { id: true, username: true, name: true, communityProfile: true } },
              reactions: { select: { type: true, accountId: true } },
              replies: {
                where: { status: 'PUBLISHED' }, orderBy: { createdAt: 'asc' }, take: 5,
                include: { author: { select: { id: true, username: true, name: true, communityProfile: true } }, reactions: { select: { type: true, accountId: true } } }
              }
            }
          },
          reactions: { select: { type: true, accountId: true } },
          saves: user ? { where: { accountId: user.id }, select: { id: true } } : false,
          reposts: user ? { where: { accountId: user.id }, select: { id: true } } : false,
          _count: { select: { comments: true, reactions: true, saves: true, reposts: true } }
        },
        orderBy: feed === 'recent' || feed === 'following' || feed === 'saved'
          ? [{ createdAt: 'desc' }]
          : [{ isPinned: 'desc' }, { isFeatured: 'desc' }, { official: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize
      }),
      this.prisma.communityPost.count({ where })
    ])
    const withContext = data.map((post) => ({
      ...post,
      viewer: {
        saved: Boolean(user && post.saves?.length),
        reposted: Boolean(user && post.reposts?.length),
        reactions: user ? post.reactions.filter((reaction) => reaction.accountId === user.id).map((reaction) => reaction.type) : []
      },
      labels: [
        ...(followedIds.includes(post.authorId) ? ['FOLLOWING'] : []),
        ...(post.isFeatured ? ['TRENDING'] : []),
        ...(post.sponsored ? ['SPONSORED'] : []),
        ...(post.official ? ['OFFICIAL'] : []),
        ...(['ACHIEVEMENT', 'MARKETPLACE', 'EVENT', 'GUIDE'].includes(post.sourceType || '') ? [post.sourceType] : [])
      ]
    }))
    return { data: withContext, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async publicProfile(username: string) {
    const account = await this.prisma.account.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
        communityProfile: true,
        achievementGrants: {
          where: { revokedAt: null, achievement: { isActive: true } },
          include: { achievement: true }
        },
        badgeGrants: {
          where: { removedAt: null },
          include: { badge: true }
        },
        communityPosts: {
          where: { status: 'PUBLISHED', visibility: 'PUBLIC' },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { _count: { select: { comments: true, reactions: true } } }
        }
      }
    })
    if (!account || account.communityProfile?.isPublic === false) {
      throw new NotFoundException('Perfil social não encontrado.')
    }
    const [followers, following, posts] = await Promise.all([
      this.prisma.communityFollow.count({ where: { followingId: account.id } }),
      this.prisma.communityFollow.count({ where: { followerId: account.id } }),
      this.prisma.communityPost.count({ where: { authorId: account.id, status: 'PUBLISHED', visibility: 'PUBLIC' } })
    ])
    return { ...account, stats: { followers, following, posts } }
  }

  async relationship(username: string, user: AuthenticatedUser) {
    const target = await this.prisma.account.findUnique({ where: { username }, select: { id: true } })
    if (!target) throw new NotFoundException('Perfil social nao encontrado.')
    if (target.id === user.id) return { ownProfile: true, following: false, blocked: false, blockedBy: false }
    const [following, blocked, blockedBy] = await Promise.all([
      this.prisma.communityFollow.findUnique({ where: { followerId_followingId: { followerId: user.id, followingId: target.id } }, select: { followerId: true } }),
      this.prisma.communitySocialRelation.findUnique({ where: { actorId_targetId_type: { actorId: user.id, targetId: target.id, type: 'BLOCK' } }, select: { id: true } }),
      this.prisma.communitySocialRelation.findUnique({ where: { actorId_targetId_type: { actorId: target.id, targetId: user.id, type: 'BLOCK' } }, select: { id: true } })
    ])
    return { ownProfile: false, following: Boolean(following), blocked: Boolean(blocked), blockedBy: Boolean(blockedBy) }
  }

  async myProfile(user: AuthenticatedUser) {
    await this.profile(user.id, user.name || user.username)
    return this.prisma.account.findUnique({
      where: { id: user.id },
      select: { id: true, username: true, name: true, communityProfile: true }
    })
  }

  private optionalText(value: unknown, label: string, maxLength: number): string | undefined {
    if (value === undefined) return undefined
    if (typeof value !== 'string') throw new BadRequestException(`${label} deve ser um texto.`)
    return value.trim().slice(0, maxLength)
  }

  private enumField<T extends string>(value: unknown, allowed: readonly T[], label: string): T | undefined {
    if (value === undefined) return undefined
    if (typeof value !== 'string' || !allowed.includes(value as T)) {
      throw new BadRequestException(`${label} inválido.`)
    }
    return value as T
  }

  private optionalUrl(value: unknown, label: string, maxLength: number): string | undefined {
    const text = this.optionalText(value, label, maxLength)
    if (!text) return text
    // Accepts either an absolute http(s) URL, or a same-origin relative path
    // (`/...`) -- MediaService.publicUrl() returns the latter, e.g.
    // `/api/media/community/<uuid>.webp`, which is exactly what the real
    // avatar/cover upload pipeline sends back. Rejecting relative paths here
    // would reject our own upload endpoint's response.
    if (text.startsWith('/')) return text
    try {
      const url = new URL(text)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('protocol')
    } catch {
      throw new BadRequestException(`${label} deve ser uma URL http(s) válida ou um caminho relativo iniciado por "/".`)
    }
    return text
  }

  async updateProfile(payload: CommunityProfilePayload, user: AuthenticatedUser) {
    await this.profile(user.id, user.name || user.username)
    const displayName = this.optionalText(payload.displayName, 'Nome público', 100)
    const bio = this.optionalText(payload.bio, 'Bio', 2000)
    const avatarUrl = this.optionalUrl(payload.avatarUrl, 'URL do avatar', 512)
    const coverUrl = this.optionalUrl(payload.coverUrl, 'URL da capa', 512)
    const mainCharacterName = this.optionalText(payload.mainCharacterName, 'Personagem principal', 100)
    const mainCharacterClass = this.optionalText(payload.mainCharacterClass, 'Classe', 100)
    const guildName = this.optionalText(payload.guildName, 'Guild', 100)
    const profileVisibility = this.enumField(payload.profileVisibility, ['PUBLIC', 'FOLLOWERS', 'PRIVATE'] as const, 'Visibilidade do perfil')
    const charactersVisibility = this.enumField(payload.charactersVisibility, ['ALL', 'MAIN_ONLY', 'HIDDEN'] as const, 'Visibilidade dos personagens')
    const equipmentVisibility = this.enumField(payload.equipmentVisibility, ['VISIBLE', 'HIDDEN'] as const, 'Visibilidade dos equipamentos')
    const statisticsVisibility = this.enumField(payload.statisticsVisibility, ['PRIVATE', 'SELECTIVE', 'PUBLIC'] as const, 'Visibilidade das estatísticas')
    const guildVisibility = this.enumField(payload.guildVisibility, ['VISIBLE', 'HIDDEN'] as const, 'Visibilidade da guild')
    const activityVisibility = this.enumField(payload.activityVisibility, ['VISIBLE', 'HIDDEN'] as const, 'Visibilidade da atividade')
    if (payload.featuredAchievementIds !== undefined && !Array.isArray(payload.featuredAchievementIds)) {
      throw new BadRequestException('Conquistas em destaque devem ser uma lista.')
    }

    return this.prisma.communityProfile.update({
      where: { accountId: user.id },
      data: {
        ...(displayName ? { displayName } : {}),
        ...(bio !== undefined ? { bio: bio || null } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
        ...(coverUrl !== undefined ? { coverUrl: coverUrl || null } : {}),
        ...(mainCharacterName !== undefined ? { mainCharacterName: mainCharacterName || null } : {}),
        ...(mainCharacterClass !== undefined ? { mainCharacterClass: mainCharacterClass || null } : {}),
        ...(guildName !== undefined ? { guildName: guildName || null } : {}),
        ...(payload.featuredAchievementIds !== undefined ? { featuredAchievementIds: json(payload.featuredAchievementIds.slice(0, 5)) } : {}),
        ...(profileVisibility ? { profileVisibility, isPublic: profileVisibility !== 'PRIVATE' } : {}),
        ...(charactersVisibility ? { charactersVisibility } : {}),
        ...(equipmentVisibility ? { equipmentVisibility } : {}),
        ...(statisticsVisibility ? { statisticsVisibility } : {}),
        ...(guildVisibility ? { guildVisibility } : {}),
        ...(activityVisibility ? { activityVisibility } : {})
      }
    })
  }

  async follow(username: string, user: AuthenticatedUser) {
    const target = await this.prisma.account.findUnique({ where: { username }, select: { id: true } })
    if (!target) throw new NotFoundException('Perfil social não encontrado.')
    if (target.id === user.id) throw new BadRequestException('Você não pode seguir o próprio perfil.')
    const block = await this.prisma.communitySocialRelation.findFirst({
      where: { type: 'BLOCK', OR: [{ actorId: user.id, targetId: target.id }, { actorId: target.id, targetId: user.id }] }
    })
    if (block) throw new ForbiddenException('Esta conexao social esta bloqueada.')
    await this.prisma.communityFollow.upsert({
      where: { followerId_followingId: { followerId: user.id, followingId: target.id } },
      create: { followerId: user.id, followingId: target.id }, update: {}
    })
    return { following: true }
  }

  async unfollow(username: string, user: AuthenticatedUser) {
    const target = await this.prisma.account.findUnique({ where: { username }, select: { id: true } })
    if (!target) throw new NotFoundException('Perfil social não encontrado.')
    await this.prisma.communityFollow.deleteMany({ where: { followerId: user.id, followingId: target.id } })
    return { following: false }
  }

  async block(username: string, user: AuthenticatedUser) {
    const target = await this.prisma.account.findUnique({ where: { username }, select: { id: true } })
    if (!target) throw new NotFoundException('Perfil social nao encontrado.')
    if (target.id === user.id) throw new BadRequestException('Voce nao pode bloquear o proprio perfil.')
    await this.prisma.$transaction([
      this.prisma.communityFollow.deleteMany({ where: { OR: [{ followerId: user.id, followingId: target.id }, { followerId: target.id, followingId: user.id }] } }),
      this.prisma.communitySocialRelation.upsert({
        where: { actorId_targetId_type: { actorId: user.id, targetId: target.id, type: 'BLOCK' } },
        create: { actorId: user.id, targetId: target.id, type: 'BLOCK' }, update: {}
      })
    ])
    return { blocked: true }
  }

  async unblock(username: string, user: AuthenticatedUser) {
    const target = await this.prisma.account.findUnique({ where: { username }, select: { id: true } })
    if (!target) throw new NotFoundException('Perfil social nao encontrado.')
    await this.prisma.communitySocialRelation.deleteMany({ where: { actorId: user.id, targetId: target.id, type: 'BLOCK' } })
    return { blocked: false }
  }

  async createPost(payload: CommunityPostPayload, user: AuthenticatedUser) {
    await this.assertSocialAccess(user, 'post')
    const type = this.postType(payload.type)
    const visibility = this.visibility(payload.visibility)
    const assets = await this.mediaService.resolveForPost(payload.mediaIds, user.id, type)
    const rawContent = (payload.content || '').trim()
    if (!rawContent && !assets.length) throw new BadRequestException('Escreva algo ou selecione uma midia.')
    const content = rawContent ? await this.validateText(rawContent, 'post', user.id) : ''
    const title = payload.title?.trim().slice(0, 191) || null
    if (type === 'ARTICLE' && (!title || title.length < 3)) throw new BadRequestException('Informe um titulo para o artigo.')
    const status = payload.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED'
    const post = await this.prisma.$transaction(async (tx) => {
      const created = await tx.communityPost.create({
        data: {
          authorId: user.id, title, content, type, visibility, status,
          media: this.mediaService.snapshot(assets), ...this.metadata(content),
          publishedAt: status === 'PUBLISHED' ? new Date() : null
        }
      })
      if (assets.length) await tx.communityMedia.updateMany({ where: { id: { in: assets.map((asset) => asset.id) } }, data: { postId: created.id, status: 'ATTACHED' } })
      return created
    })
    await this.observability.recordOperationalEvent({ module: 'community', eventType: 'COMMUNITY_POST_CREATED', entityType: 'CommunityPost', entityId: post.id, actorUserId: user.id, description: 'Publicacao criada na comunidade.', data: { type, visibility, status } })
    return post
  }

  async updateOwnPost(id: string, payload: CommunityPostPayload, user: AuthenticatedUser) {
    const post = await this.prisma.communityPost.findUnique({ where: { id } })
    if (!post || post.authorId !== user.id) throw new NotFoundException('Publicação não encontrada.')
    if (!['DRAFT', 'PUBLISHED'].includes(post.status)) throw new BadRequestException('Esta publicação não pode ser editada.')
    const type = this.postType(payload.type || post.type)
    const visibility = this.visibility(payload.visibility || post.visibility)
    const status = payload.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED'
    const content = payload.content !== undefined ? (payload.content.trim() ? await this.validateText(payload.content, 'post', user.id, false) : '') : post.content
    const assets = payload.mediaIds !== undefined ? await this.mediaService.resolveForPost(payload.mediaIds, user.id, type) : null
    if (!content && !(assets?.length || (Array.isArray(post.media) && post.media.length))) throw new BadRequestException('Escreva algo ou selecione uma midia.')
    return this.prisma.$transaction(async (tx) => {
      await tx.communityPostRevision.create({
        data: {
          postId: id, title: post.title, content: post.content, type: post.type, visibility: post.visibility,
          media: post.media || undefined, tags: post.tags || undefined, mentions: post.mentions || undefined,
          editedBy: user.id, editorRole: user.role,
          reason: 'Edição realizada pelo autor.'
        }
      })
      if (assets) {
        await tx.communityMedia.updateMany({ where: { postId: id }, data: { postId: null, status: 'REMOVED', removedAt: new Date() } })
        if (assets.length) await tx.communityMedia.updateMany({ where: { id: { in: assets.map((asset) => asset.id) } }, data: { postId: id, status: 'ATTACHED', removedAt: null } })
      }
      return tx.communityPost.update({
        where: { id },
        data: {
          title: payload.title?.trim().slice(0, 191) ?? post.title,
          content, type, visibility, status, edited: true, editedAt: new Date(), ...this.metadata(content),
          publishedAt: status === 'PUBLISHED' ? (post.publishedAt || new Date()) : null,
          ...(assets ? { media: this.mediaService.snapshot(assets) } : {})
        }
      })
    })
  }

  async removeOwnPost(id: string, user: AuthenticatedUser) {
    const post = await this.prisma.communityPost.findUnique({ where: { id } })
    if (!post || post.authorId !== user.id) throw new NotFoundException('Publicação não encontrada.')
    const [removed] = await this.prisma.$transaction([
      this.prisma.communityPost.update({
        where: { id },
        data: { status: 'REMOVED', removedBy: user.id, removedAt: new Date(), deletionReason: 'Removida pelo autor.' }
      }),
      // Same detach-on-removal the media gets on an edit that drops it
      // (updateOwnPost, above) -- otherwise CommunityMedia rows stay
      // ATTACHED to a post that no longer exists in the feed, forever.
      this.prisma.communityMedia.updateMany({
        where: { postId: id },
        data: { postId: null, status: 'REMOVED', removedAt: new Date() }
      })
    ])
    await this.observability.recordOperationalEvent({ module: 'community', eventType: 'COMMUNITY_POST_REMOVED_BY_AUTHOR', entityType: 'CommunityPost', entityId: id, actorUserId: user.id, description: 'Publicacao removida pelo autor.' })
    return removed
  }

  async createComment(postId: string, payload: CommunityCommentPayload, user: AuthenticatedUser) {
    await this.assertSocialAccess(user, 'comment')
    await this.accessiblePost(postId, user)
    const content = await this.validateText(payload.content || '', 'comment', user.id)
    if (payload.parentId) {
      const parent = await this.prisma.communityComment.findFirst({ where: { id: payload.parentId, postId } })
      if (!parent) throw new BadRequestException('Comentário pai inválido.')
      if (parent.parentId) throw new BadRequestException('Respostas podem ter apenas um nível.')
    }
    return this.prisma.communityComment.create({
      data: { postId, authorId: user.id, parentId: payload.parentId || null, content }
    })
  }

  async updateOwnComment(id: string, payload: CommunityCommentPayload, user: AuthenticatedUser) {
    const comment = await this.prisma.communityComment.findUnique({ where: { id } })
    if (!comment || comment.authorId !== user.id || comment.status !== 'PUBLISHED') throw new NotFoundException('Comentário não encontrado.')
    const content = await this.validateText(payload.content || '', 'comment', user.id, false)
    return this.prisma.$transaction(async (tx) => {
      await tx.communityCommentRevision.create({
        data: { commentId: id, content: comment.content, editedBy: user.id, editorRole: user.role, reason: 'Edição realizada pelo autor.' }
      })
      return tx.communityComment.update({ where: { id }, data: { content, edited: true, editedAt: new Date() } })
    })
  }

  async removeOwnComment(id: string, user: AuthenticatedUser) {
    const comment = await this.prisma.communityComment.findUnique({ where: { id } })
    if (!comment || comment.authorId !== user.id) throw new NotFoundException('Comentário não encontrado.')
    return this.prisma.communityComment.update({
      where: { id },
      data: { status: 'REMOVED', removedBy: user.id, removedAt: new Date(), reason: 'Removido pelo autor.' }
    })
  }

  async toggleReaction(payload: CommunityReactionPayload, user: AuthenticatedUser) {
    if (Boolean(payload.postId) === Boolean(payload.commentId)) {
      throw new BadRequestException('Informe uma publicação ou comentário.')
    }
    const type = (payload.type || 'LIKE').toUpperCase()
    if (!reactionTypes.includes(type as typeof reactionTypes[number])) throw new BadRequestException('Reação inválida.')
    const postId = payload.postId || (await this.prisma.communityComment.findUnique({ where: { id: payload.commentId as string }, select: { postId: true } }))?.postId
    if (!postId) throw new NotFoundException('Conteúdo não encontrado.')
    await this.accessiblePost(postId, user)
    const where = payload.postId
      ? { accountId_postId_type: { accountId: user.id, postId: payload.postId, type } }
      : { accountId_commentId_type: { accountId: user.id, commentId: payload.commentId as string, type } }
    const existing = await this.prisma.communityReaction.findUnique({ where })
    if (existing) {
      await this.prisma.communityReaction.delete({ where: { id: existing.id } })
      return { active: false }
    }
    await this.prisma.communityReaction.create({
      data: { accountId: user.id, postId: payload.postId || null, commentId: payload.commentId || null, type }
    })
    return { active: true }
  }

  async toggleSave(postId: string, user: AuthenticatedUser) {
    await this.accessiblePost(postId, user)
    const existing = await this.prisma.communityPostSave.findUnique({ where: { accountId_postId: { accountId: user.id, postId } } })
    if (existing) {
      await this.prisma.communityPostSave.delete({ where: { id: existing.id } })
      return { saved: false }
    }
    await this.prisma.communityPostSave.create({ data: { accountId: user.id, postId } })
    return { saved: true }
  }

  async toggleRepost(postId: string, user: AuthenticatedUser) {
    const post = await this.accessiblePost(postId, user)
    if (post.visibility !== 'PUBLIC') throw new BadRequestException('Somente publicações públicas podem ser repostadas.')
    if (post.authorId === user.id) throw new BadRequestException('Não é necessário repostar sua própria publicação.')
    const existing = await this.prisma.communityRepost.findUnique({ where: { accountId_postId: { accountId: user.id, postId } } })
    if (existing) {
      await this.prisma.communityRepost.delete({ where: { id: existing.id } })
      return { reposted: false }
    }
    await this.prisma.communityRepost.create({ data: { accountId: user.id, postId } })
    await this.observability.recordOperationalEvent({ module: 'community', eventType: 'COMMUNITY_POST_REPOSTED', entityType: 'CommunityPost', entityId: postId, actorUserId: user.id, targetUserId: post.authorId, description: 'Publicação compartilhada internamente.' })
    return { reposted: true }
  }

  async report(payload: CommunityReportPayload, user: AuthenticatedUser) {
    if (Boolean(payload.postId) === Boolean(payload.commentId)) {
      throw new BadRequestException('Informe exatamente uma publicação ou comentário.')
    }
    const target = payload.postId
      ? await this.prisma.communityPost.findUnique({ where: { id: payload.postId } })
      : await this.prisma.communityComment.findUnique({ where: { id: payload.commentId } })
    if (!target) throw new NotFoundException('Conteúdo não encontrado.')
    if (target.authorId === user.id) throw new BadRequestException('Você não pode denunciar seu próprio conteúdo.')
    const reason = payload.reason?.trim()
    if (!reason || reason.length < 3) throw new BadRequestException('Informe o motivo da denúncia.')
    const duplicate = await this.prisma.communityReport.findFirst({
      where: {
        reporterId: user.id,
        postId: payload.postId || null,
        commentId: payload.commentId || null,
        status: { in: ['NEW', 'ASSIGNED', 'INVESTIGATING', 'WAITING_FOR_USER', 'ESCALATED', 'REOPENED'] }
      }
    })
    if (duplicate) throw new BadRequestException('Você já possui uma denúncia aberta para este conteúdo.')
    const report = await this.prisma.communityReport.create({
      data: {
        reporterId: user.id,
        reportedUserId: target.authorId,
        postId: payload.postId || null,
        commentId: payload.commentId || null,
        reason,
        description: payload.description?.trim() || null,
        evidence: json(payload.evidence)
      }
    })
    await this.observability.recordOperationalEvent({
      module: 'community',
      eventType: 'COMMUNITY_CONTENT_REPORTED',
      entityType: 'CommunityReport',
      entityId: report.id,
      actorUserId: user.id,
      targetUserId: target.authorId,
      description: 'Conteúdo da comunidade denunciado.'
    })
    return report
  }

  async quests(user?: AuthenticatedUser) {
    const now = new Date()
    return this.prisma.communityQuest.findMany({
      where: { status: 'ACTIVE', AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
      include: user ? { participants: { where: { accountId: user.id } } } : undefined,
      orderBy: { startsAt: 'desc' }
    })
  }

  async joinQuest(id: string, user: AuthenticatedUser) {
    const quest = await this.prisma.communityQuest.findFirst({ where: { id, status: 'ACTIVE' }, include: { _count: { select: { participants: true } } } })
    if (!quest) throw new NotFoundException('Quest não encontrada.')
    if (quest.participantLimit && quest._count.participants >= quest.participantLimit) {
      throw new BadRequestException('A quest atingiu o limite de participantes.')
    }
    return this.prisma.communityQuestParticipant.upsert({
      where: { questId_accountId: { questId: id, accountId: user.id } },
      create: { questId: id, accountId: user.id },
      update: {}
    })
  }
}
