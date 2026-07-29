import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ObservabilityService } from '../observability/observability.service'
import type {
  CommunityCommentPayload,
  CommunityPostPayload,
  CommunityQuery,
  CommunityReportPayload
} from './community.contract'

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
    private readonly observability: ObservabilityService
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

  private async validateMedia(media: unknown, accountId: string) {
    if (media === undefined) return undefined
    if (!Array.isArray(media) || media.length > 6) {
      await this.observability.recordSystemError({
        module: 'community',
        severity: 'WARNING',
        errorCode: 'COMMUNITY_MEDIA_INVALID',
        publicMessage: 'A mídia enviada é inválida.',
        internalMessage: 'Community media must be an array with at most six entries.',
        userId: accountId
      })
      throw new BadRequestException('Envie no máximo seis mídias válidas.')
    }
    const policy = await this.prisma.communityPolicy.findUnique({ where: { id: 'default' } })
    const allowed = this.domains(policy?.allowedDomains)
    const blocked = this.domains(policy?.blockedDomains)
    for (const item of media) {
      const url = typeof item === 'string'
        ? item
        : item && typeof item === 'object' && 'url' in item ? String((item as { url?: unknown }).url || '') : ''
      let domain = ''
      try {
        const parsed = new URL(url)
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol')
        domain = parsed.hostname.toLowerCase().replace(/^www\./, '')
      } catch {
        await this.observability.recordSystemError({
          module: 'community',
          severity: 'WARNING',
          errorCode: 'COMMUNITY_MEDIA_URL_INVALID',
          publicMessage: 'A URL da mídia é inválida.',
          internalMessage: 'Community media URL validation failed.',
          userId: accountId
        })
        throw new BadRequestException('Uma das mídias possui URL inválida.')
      }
      if (blocked.some((rule) => this.domainMatches(domain, rule)) ||
          (allowed.length && !allowed.some((rule) => this.domainMatches(domain, rule)))) {
        throw new BadRequestException('O domínio de uma das mídias não é permitido.')
      }
    }
    return json(media)
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

  async feed(query: CommunityQuery) {
    const { page, pageSize, skip } = pageValues(query)
    const search = query.search?.trim()
    const where: Prisma.CommunityPostWhereInput = {
      status: 'PUBLISHED',
      author: { communityProfile: { isPublic: true } },
      ...(search ? { OR: [{ title: { contains: search } }, { content: { contains: search } }] } : {})
    }
    const [data, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        include: {
          author: { select: { id: true, username: true, name: true, communityProfile: true } },
          comments: {
            where: { status: 'PUBLISHED' },
            orderBy: { createdAt: 'asc' },
            take: 5,
            include: { author: { select: { username: true, name: true, communityProfile: true } } }
          },
          reactions: { select: { type: true, accountId: true } },
          _count: { select: { comments: true, reactions: true } }
        },
        orderBy: [{ isPinned: 'desc' }, { isFeatured: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize
      }),
      this.prisma.communityPost.count({ where })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
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
          where: { status: 'PUBLISHED' },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { _count: { select: { comments: true, reactions: true } } }
        }
      }
    })
    if (!account || account.communityProfile?.isPublic === false) {
      throw new NotFoundException('Perfil social não encontrado.')
    }
    return account
  }

  async myProfile(user: AuthenticatedUser) {
    await this.profile(user.id, user.name || user.username)
    return this.prisma.account.findUnique({
      where: { id: user.id },
      select: { id: true, username: true, name: true, communityProfile: true }
    })
  }

  async updateProfile(payload: { displayName?: string, bio?: string, avatarUrl?: string, coverUrl?: string, isPublic?: boolean }, user: AuthenticatedUser) {
    await this.profile(user.id, user.name || user.username)
    return this.prisma.communityProfile.update({
      where: { accountId: user.id },
      data: {
        ...(payload.displayName ? { displayName: payload.displayName.trim().slice(0, 100) } : {}),
        ...(payload.bio !== undefined ? { bio: payload.bio.trim().slice(0, 2000) || null } : {}),
        ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl.trim().slice(0, 512) || null } : {}),
        ...(payload.coverUrl !== undefined ? { coverUrl: payload.coverUrl.trim().slice(0, 512) || null } : {}),
        ...(payload.isPublic !== undefined ? { isPublic: payload.isPublic } : {})
      }
    })
  }

  async createPost(payload: CommunityPostPayload, user: AuthenticatedUser) {
    await this.assertSocialAccess(user, 'post')
    const content = await this.validateText(payload.content || '', 'post', user.id)
    const media = await this.validateMedia(payload.media, user.id)
    return this.prisma.communityPost.create({
      data: {
        authorId: user.id,
        title: payload.title?.trim().slice(0, 191) || null,
        content,
        media,
        publishedAt: new Date()
      }
    })
  }

  async updateOwnPost(id: string, payload: CommunityPostPayload, user: AuthenticatedUser) {
    const post = await this.prisma.communityPost.findUnique({ where: { id } })
    if (!post || post.authorId !== user.id) throw new NotFoundException('Publicação não encontrada.')
    if (post.status !== 'PUBLISHED') throw new BadRequestException('Esta publicação não pode ser editada.')
    const content = payload.content ? await this.validateText(payload.content, 'post', user.id, false) : post.content
    const media = await this.validateMedia(payload.media, user.id)
    return this.prisma.$transaction(async (tx) => {
      await tx.communityPostRevision.create({
        data: {
          postId: id,
          title: post.title,
          content: post.content,
          media: post.media || undefined,
          editedBy: user.id,
          editorRole: user.role,
          reason: 'Edição realizada pelo autor.'
        }
      })
      return tx.communityPost.update({
        where: { id },
        data: {
          title: payload.title?.trim().slice(0, 191) ?? post.title,
          content,
          ...(media !== undefined ? { media } : {})
        }
      })
    })
  }

  async removeOwnPost(id: string, user: AuthenticatedUser) {
    const post = await this.prisma.communityPost.findUnique({ where: { id } })
    if (!post || post.authorId !== user.id) throw new NotFoundException('Publicação não encontrada.')
    return this.prisma.communityPost.update({
      where: { id },
      data: { status: 'REMOVED', removedBy: user.id, removedAt: new Date(), deletionReason: 'Removida pelo autor.' }
    })
  }

  async createComment(postId: string, payload: CommunityCommentPayload, user: AuthenticatedUser) {
    await this.assertSocialAccess(user, 'comment')
    const post = await this.prisma.communityPost.findFirst({ where: { id: postId, status: 'PUBLISHED' } })
    if (!post) throw new NotFoundException('Publicação não encontrada.')
    const content = await this.validateText(payload.content || '', 'comment', user.id)
    if (payload.parentId) {
      const parent = await this.prisma.communityComment.findFirst({ where: { id: payload.parentId, postId } })
      if (!parent) throw new BadRequestException('Comentário pai inválido.')
    }
    return this.prisma.communityComment.create({
      data: { postId, authorId: user.id, parentId: payload.parentId || null, content }
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

  async toggleReaction(payload: { postId?: string, commentId?: string, type?: string }, user: AuthenticatedUser) {
    if (Boolean(payload.postId) === Boolean(payload.commentId)) {
      throw new BadRequestException('Informe uma publicação ou comentário.')
    }
    const type = (payload.type || 'LIKE').toUpperCase().slice(0, 40)
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
