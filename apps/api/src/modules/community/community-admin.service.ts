import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type {
  CommunityModerationType,
  CommunityPostStatus,
  CommunityQuestStatus,
  CommunityReportStatus,
  Prisma
} from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ObservabilityService } from '../observability/observability.service'
import type {
  CommunityAchievementPayload,
  CommunityAdminActionPayload,
  CommunityBadgePayload,
  CommunityGrantPayload,
  CommunityModerationPayload,
  CommunityPolicyPayload,
  CommunityQuestProgressPayload,
  CommunityQuery,
  CommunityQuestPayload,
  CommunityTaskPayload
} from './community.contract'

const pageValues = (query: CommunityQuery) => {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25))
  return { page, pageSize, skip: (page - 1) * pageSize }
}

const required = (value: string | undefined, label: string, minimum = 3) => {
  const clean = value?.trim()
  if (!clean || clean.length < minimum) throw new BadRequestException(`Informe ${label}.`)
  return clean
}

const slug = (value: string) => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 191)

const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue

@Injectable()
export class CommunityAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly observability: ObservabilityService
  ) {}

  private async audited(
    user: AuthenticatedUser,
    action: string,
    entityType: string,
    entityId: string,
    reason: string,
    beforeData: unknown,
    afterData: unknown,
    targetUserId?: string | null,
    evidence?: unknown
  ) {
    await this.audit.record({
      module: 'community',
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action,
      targetType: entityType,
      targetId: entityId,
      targetUserId,
      reason,
      beforeData: beforeData as Record<string, unknown>,
      afterData: afterData as Record<string, unknown>,
      workDescription: `${user.username} executou ${action} em ${entityType} ${entityId}.`,
      workEvidence: evidence
    })
  }

  async dashboard(user: AuthenticatedUser) {
    const day = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [
      activeUsers, newPosts, comments, reports, hiddenContent, suspendedUsers,
      achievementsGranted, activeQuests, spamDetected, tasks, errors
    ] = await Promise.all([
      this.prisma.communityProfile.count({ where: { updatedAt: { gte: day } } }),
      this.prisma.communityPost.count({ where: { createdAt: { gte: day } } }),
      this.prisma.communityComment.count({ where: { createdAt: { gte: day } } }),
      this.prisma.communityReport.count({ where: { status: { in: ['NEW', 'ASSIGNED', 'INVESTIGATING', 'ESCALATED', 'REOPENED'] } } }),
      this.prisma.communityPost.count({ where: { status: 'HIDDEN' } }),
      this.prisma.communityProfile.count({ where: { socialSuspendedUntil: { gt: new Date() } } }),
      this.prisma.communityAchievementGrant.count({ where: { grantedAt: { gte: day }, revokedAt: null } }),
      this.prisma.communityQuest.count({ where: { status: 'ACTIVE' } }),
      this.prisma.operationalEvent.count({ where: { module: 'community', eventType: { contains: 'SPAM' }, occurredAt: { gte: day } } }),
      this.prisma.communityTask.count({ where: { assigneeId: user.id, status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] } } }),
      this.prisma.systemError.count({ where: { module: 'community', status: { notIn: ['RESOLVED', 'IGNORED'] } } })
    ])
    return { activeUsers, newPosts, comments, reports, hiddenContent, suspendedUsers, achievementsGranted, activeQuests, spamDetected, tasks, errors }
  }

  async posts(query: CommunityQuery) {
    const { page, pageSize, skip } = pageValues(query)
    const search = query.search?.trim()
    const status = ['DRAFT', 'PUBLISHED', 'HIDDEN', 'REMOVED', 'ARCHIVED'].includes(query.status || '')
      ? query.status as CommunityPostStatus : undefined
    const where: Prisma.CommunityPostWhereInput = {
      ...(status ? { status } : {}),
      ...(query.authorId ? { authorId: query.authorId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.visibility ? { visibility: query.visibility } : {}),
      ...(search ? { OR: [{ title: { contains: search } }, { content: { contains: search } }, { author: { username: { contains: search } } }] } : {})
    }
    const [data, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        include: {
          author: { select: { id: true, username: true, name: true, communityProfile: true } },
          _count: { select: { comments: true, reactions: true, reports: true, revisions: true } }
        },
        orderBy: { createdAt: 'desc' }, skip, take: pageSize
      }),
      this.prisma.communityPost.count({ where })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async postHistory(id: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id },
      include: { revisions: { orderBy: { createdAt: 'desc' } }, reports: { orderBy: { createdAt: 'desc' } } }
    })
    if (!post) throw new NotFoundException('Publicação não encontrada.')
    return post
  }

  async postAction(id: string, payload: CommunityAdminActionPayload, user: AuthenticatedUser) {
    const reason = required(payload.reason, 'uma justificativa com pelo menos 4 caracteres', 4)
    const before = await this.prisma.communityPost.findUnique({ where: { id } })
    if (!before) throw new NotFoundException('Publicação não encontrada.')
    const statusByAction: Record<string, CommunityPostStatus> = {
      HIDE: 'HIDDEN', RESTORE: 'PUBLISHED', REMOVE: 'REMOVED', ARCHIVE: 'ARCHIVED'
    }
    const action = payload.action?.toUpperCase() || ''
    const status = statusByAction[action]
    if (!status && !['PIN', 'UNPIN', 'FEATURE', 'UNFEATURE', 'LIMIT_REACH', 'RESTORE_REACH', 'EDIT'].includes(action)) {
      throw new BadRequestException('Ação inválida.')
    }
    if (action === 'EDIT') {
      const content = required(payload.content, 'o novo conteúdo', 2)
      const after = await this.prisma.$transaction(async (tx) => {
        await tx.communityPostRevision.create({
          data: {
            postId: id,
            title: before.title,
            content: before.content,
            type: before.type,
            visibility: before.visibility,
            media: before.media || undefined,
            tags: before.tags || undefined,
            mentions: before.mentions || undefined,
            editedBy: user.id,
            editorRole: user.role,
            reason
          }
        })
        return tx.communityPost.update({
          where: { id },
          data: {
            title: payload.title?.trim().slice(0, 191) ?? before.title,
            content,
            administrativeEdit: true,
            administrativeNote: reason,
            editedBy: user.id,
            edited: true,
            editedAt: new Date()
          }
        })
      })
      await this.audited(user, 'admin.community.post.edit', 'CommunityPost', id, reason, before, after, before.authorId, payload.evidence)
      return after
    }
    const data: Prisma.CommunityPostUpdateInput = status ? {
      status,
      ...(status === 'HIDDEN' ? { hiddenBy: user.id, hiddenAt: new Date() } : {}),
      ...(status === 'REMOVED' ? { removedBy: user.id, removedAt: new Date(), deletionReason: reason } : {}),
      ...(status === 'PUBLISHED' ? { hiddenBy: null, hiddenAt: null, removedBy: null, removedAt: null } : {})
    } : action === 'PIN' ? { isPinned: true }
      : action === 'UNPIN' ? { isPinned: false }
      : action === 'FEATURE' ? { isFeatured: true }
      : action === 'UNFEATURE' ? { isFeatured: false }
      : action === 'LIMIT_REACH' ? { reachLimited: true }
      : { reachLimited: false }
    const after = await this.prisma.communityPost.update({ where: { id }, data })
    await this.audited(user, `admin.community.post.${action.toLowerCase()}`, 'CommunityPost', id, reason, before, after, before.authorId, payload.evidence)
    return after
  }

  async comments(query: CommunityQuery) {
    const { page, pageSize, skip } = pageValues(query)
    const search = query.search?.trim()
    const where: Prisma.CommunityCommentWhereInput = {
      ...(query.status && ['PUBLISHED', 'HIDDEN', 'REMOVED'].includes(query.status) ? { status: query.status as CommunityPostStatus } : {}),
      ...(search ? { OR: [{ content: { contains: search } }, { author: { username: { contains: search } } }] } : {})
    }
    const [data, total] = await Promise.all([
      this.prisma.communityComment.findMany({
        where,
        include: {
          author: { select: { id: true, username: true, communityProfile: true } },
          post: { select: { id: true, title: true } },
          _count: { select: { reports: true, reactions: true, replies: true } }
        },
        orderBy: { createdAt: 'desc' }, skip, take: pageSize
      }),
      this.prisma.communityComment.count({ where })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async commentAction(id: string, payload: CommunityAdminActionPayload, user: AuthenticatedUser) {
    const reason = required(payload.reason, 'a justificativa', 4)
    const before = await this.prisma.communityComment.findUnique({ where: { id } })
    if (!before) throw new NotFoundException('Comentário não encontrado.')
    const action = payload.action?.toUpperCase()
    const status: CommunityPostStatus | undefined = action === 'HIDE' ? 'HIDDEN' : action === 'RESTORE' ? 'PUBLISHED' : action === 'REMOVE' ? 'REMOVED' : undefined
    if (!status) throw new BadRequestException('Ação inválida.')
    const after = await this.prisma.communityComment.update({
      where: { id },
      data: {
        status, reason,
        ...(status === 'HIDDEN' ? { hiddenBy: user.id, hiddenAt: new Date() } : {}),
        ...(status === 'REMOVED' ? { removedBy: user.id, removedAt: new Date() } : {}),
        ...(status === 'PUBLISHED' ? { hiddenBy: null, hiddenAt: null, removedBy: null, removedAt: null } : {})
      }
    })
    await this.audited(user, `admin.community.comment.${action?.toLowerCase()}`, 'CommunityComment', id, reason, before, after, before.authorId, payload.evidence)
    return after
  }

  async reactions(query: CommunityQuery) {
    const { page, pageSize, skip } = pageValues(query)
    const search = query.search?.trim()
    const where: Prisma.CommunityReactionWhereInput = {
      ...(search ? { OR: [{ type: { contains: search } }, { account: { username: { contains: search } } }] } : {})
    }
    const [data, total] = await Promise.all([
      this.prisma.communityReaction.findMany({
        where,
        include: {
          account: { select: { id: true, username: true, name: true } },
          post: { select: { id: true, title: true, content: true } },
          comment: { select: { id: true, content: true } }
        },
        orderBy: { createdAt: 'desc' }, skip, take: pageSize
      }),
      this.prisma.communityReaction.count({ where })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async reactionAction(id: string, payload: CommunityAdminActionPayload, user: AuthenticatedUser) {
    const reason = required(payload.reason, 'a justificativa', 4)
    if (payload.action?.toUpperCase() !== 'REMOVE') throw new BadRequestException('Ação inválida.')
    const before = await this.prisma.communityReaction.findUnique({ where: { id } })
    if (!before) throw new NotFoundException('Reação não encontrada.')
    await this.prisma.communityReaction.delete({ where: { id } })
    await this.audited(user, 'admin.community.reaction.remove', 'CommunityReaction', id, reason, before, { removed: true }, before.accountId, payload.evidence)
    return { removed: true }
  }

  async users(query: CommunityQuery) {
    const { page, pageSize, skip } = pageValues(query)
    const search = query.search?.trim()
    const where: Prisma.CommunityProfileWhereInput = search ? {
      OR: [{ displayName: { contains: search } }, { account: { username: { contains: search } } }]
    } : {}
    const [data, total] = await Promise.all([
      this.prisma.communityProfile.findMany({
        where,
        include: {
          account: { select: { id: true, username: true, name: true, status: true, _count: { select: { reportedCommunity: true } } } },
          moderationActions: { orderBy: { createdAt: 'desc' }, take: 10 },
          _count: { select: { moderationActions: true } }
        },
        orderBy: { updatedAt: 'desc' }, skip, take: pageSize
      }),
      this.prisma.communityProfile.count({ where })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async moderateUser(accountId: string, payload: CommunityModerationPayload, user: AuthenticatedUser) {
    const reason = required(payload.reason, 'a justificativa', 4)
    const type = payload.type as CommunityModerationType
    if (!type || !['WARNING', 'SOCIAL_SUSPENSION', 'POST_BLOCK', 'COMMENT_BLOCK', 'MESSAGE_LIMIT', 'AVATAR_REMOVAL', 'COVER_REMOVAL', 'BIO_REMOVAL', 'USERNAME_CHANGE', 'REACH_LIMIT'].includes(type)) {
      throw new BadRequestException('Tipo de moderação inválido.')
    }
    const account = await this.prisma.account.findUnique({ where: { id: accountId }, include: { communityProfile: true } })
    if (!account) throw new NotFoundException('Usuário não encontrado.')
    const timedModeration = ['SOCIAL_SUSPENSION', 'POST_BLOCK', 'COMMENT_BLOCK', 'MESSAGE_LIMIT', 'REACH_LIMIT'].includes(type)
    const expiresAt = timedModeration
      ? payload.expiresAt ? new Date(payload.expiresAt) : new Date(Date.now() + 7 * 86400000)
      : null
    const before = account.communityProfile
    const profile = await this.prisma.communityProfile.upsert({
      where: { accountId },
      create: { accountId, displayName: account.name || account.username },
      update: {}
    })
    if (type === 'USERNAME_CHANGE') {
      const replacement = required(payload.replacement, 'o novo username', 3).toLowerCase()
      if (!/^[a-z0-9._-]{3,24}$/.test(replacement)) throw new BadRequestException('Username invÃ¡lido.')
      const duplicate = await this.prisma.account.findUnique({ where: { username: replacement }, select: { id: true } })
      if (duplicate && duplicate.id !== accountId) throw new BadRequestException('Este username jÃ¡ estÃ¡ em uso.')
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.communityUsernameHistory.create({ data: { accountId, oldUsername: account.username, newUsername: replacement, changedBy: user.id, reason } })
        return tx.account.update({ where: { id: accountId }, data: { username: replacement }, select: { id: true, username: true } })
      })
      await this.audited(user, 'admin.community.profile.username_change', 'CommunityProfile', profile.id, reason, { username: account.username }, updated, accountId, payload.evidence)
      return updated
    }
    const update: Prisma.CommunityProfileUpdateInput =
      type === 'WARNING' ? { warningCount: { increment: 1 } }
      : type === 'SOCIAL_SUSPENSION' ? { socialSuspendedUntil: expiresAt }
      : type === 'POST_BLOCK' ? { postBlockedUntil: expiresAt }
      : type === 'COMMENT_BLOCK' ? { commentBlockedUntil: expiresAt }
      : type === 'MESSAGE_LIMIT' ? { messagesLimitedUntil: expiresAt }
      : type === 'REACH_LIMIT' ? { reachLimitedUntil: expiresAt }
      : type === 'AVATAR_REMOVAL' ? { avatarUrl: null }
      : type === 'COVER_REMOVAL' ? { coverUrl: null }
      : { bio: null }
    const after = await this.prisma.$transaction(async (tx) => {
      const result = await tx.communityProfile.update({ where: { id: profile.id }, data: update })
      await tx.communityModerationAction.create({
        data: { profileId: profile.id, actorId: user.id, type, reason, expiresAt, evidence: json(payload.evidence) }
      })
      return result
    })
    await this.audited(user, `admin.community.user.${type.toLowerCase()}`, 'CommunityProfile', profile.id, reason, before || {}, after, accountId, payload.evidence)
    return after
  }

  async restoreUser(accountId: string, reasonValue: string, user: AuthenticatedUser) {
    const reason = required(reasonValue, 'a justificativa', 4)
    const before = await this.prisma.communityProfile.findUnique({ where: { accountId } })
    if (!before) throw new NotFoundException('Perfil social não encontrado.')
    const after = await this.prisma.communityProfile.update({
      where: { accountId },
      data: {
        socialSuspendedUntil: null, postBlockedUntil: null, commentBlockedUntil: null,
        messagesLimitedUntil: null, reachLimitedUntil: null
      }
    })
    await this.prisma.communityModerationAction.updateMany({
      where: { profileId: before.id, restoredAt: null },
      data: { restoredAt: new Date(), restoredBy: user.id }
    })
    await this.audited(user, 'admin.community.user.restore', 'CommunityProfile', before.id, reason, before, after, accountId)
    return after
  }

  async reports(query: CommunityQuery) {
    const { page, pageSize, skip } = pageValues(query)
    const search = query.search?.trim()
    const where: Prisma.CommunityReportWhereInput = {
      ...(query.status ? { status: query.status as CommunityReportStatus } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(search ? { OR: [{ reason: { contains: search } }, { description: { contains: search } }, { reporter: { username: { contains: search } } }] } : {})
    }
    const [data, total] = await Promise.all([
      this.prisma.communityReport.findMany({
        where,
        include: {
          reporter: { select: { id: true, username: true } },
          reportedUser: { select: { id: true, username: true } },
          post: { select: { id: true, content: true, status: true } },
          comment: { select: { id: true, content: true, status: true } }
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }], skip, take: pageSize
      }),
      this.prisma.communityReport.count({ where })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async reportAction(id: string, payload: CommunityAdminActionPayload, user: AuthenticatedUser) {
    const reason = required(payload.reason || payload.notes, 'a decisão ou observação', 3)
    const before = await this.prisma.communityReport.findUnique({ where: { id } })
    if (!before) throw new NotFoundException('Denúncia não encontrada.')
    const status = payload.status as CommunityReportStatus
    if (!['NEW', 'ASSIGNED', 'INVESTIGATING', 'WAITING_FOR_USER', 'RESOLVED', 'REJECTED', 'ESCALATED', 'REOPENED'].includes(status)) {
      throw new BadRequestException('Status inválido.')
    }
    const after = await this.prisma.communityReport.update({
      where: { id },
      data: {
        status,
        assigneeId: payload.assigneeId ?? (status === 'ASSIGNED' ? user.id : before.assigneeId),
        priority: payload.priority ?? before.priority,
        internalNotes: payload.notes?.trim() ?? before.internalNotes,
        decision: ['RESOLVED', 'REJECTED'].includes(status) ? reason : before.decision,
        dueAt: payload.dueAt ? new Date(payload.dueAt) : before.dueAt,
        resolvedBy: ['RESOLVED', 'REJECTED'].includes(status) ? user.id : null,
        resolvedAt: ['RESOLVED', 'REJECTED'].includes(status) ? new Date() : null
      }
    })
    await this.audited(user, `admin.community.report.${status.toLowerCase()}`, 'CommunityReport', id, reason, before, after, before.reportedUserId, payload.evidence)
    return after
  }

  async achievements(query: CommunityQuery) {
    const { page, pageSize, skip } = pageValues(query)
    const search = query.search?.trim()
    const where: Prisma.CommunityAchievementWhereInput = {
      deletedAt: null,
      ...(search ? { OR: [{ name: { contains: search } }, { category: { contains: search } }] } : {})
    }
    const [data, total] = await Promise.all([
      this.prisma.communityAchievement.findMany({ where, include: { _count: { select: { grants: true } } }, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      this.prisma.communityAchievement.count({ where })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async saveAchievement(id: string | null, payload: CommunityAchievementPayload, user: AuthenticatedUser) {
    const name = required(payload.name, 'o nome da conquista')
    const description = required(payload.description, 'a descrição')
    const data = {
      name, slug: slug(payload.slug || name), description,
      category: required(payload.category, 'a categoria'),
      rarity: payload.rarity || 'COMMON' as const,
      points: Math.max(0, Number(payload.points) || 0),
      condition: json(payload.condition),
      imageUrl: payload.imageUrl?.trim() || null,
      isActive: Boolean(payload.isActive),
      updatedBy: user.id
    }
    const before = id ? await this.prisma.communityAchievement.findUnique({ where: { id } }) : null
    const after = id
      ? await this.prisma.communityAchievement.update({ where: { id }, data })
      : await this.prisma.communityAchievement.create({ data: { ...data, createdBy: user.id } })
    await this.audited(user, `admin.community.achievement.${id ? 'edit' : 'create'}`, 'CommunityAchievement', after.id, id ? 'Atualização da conquista.' : 'Criação da conquista.', before || {}, after)
    return after
  }

  async achievementAction(id: string, actionValue: string, reasonValue: string, user: AuthenticatedUser) {
    const reason = required(reasonValue, 'a justificativa', 4)
    const before = await this.prisma.communityAchievement.findUnique({ where: { id } })
    if (!before) throw new NotFoundException('Conquista não encontrada.')
    const action = actionValue.toUpperCase()
    if (action === 'DUPLICATE') {
      const after = await this.prisma.communityAchievement.create({
        data: {
          slug: `${before.slug}-copia-${Date.now()}`,
          name: `${before.name} (cópia)`,
          description: before.description,
          category: before.category,
          rarity: before.rarity,
          points: before.points,
          condition: before.condition === null ? undefined : json(before.condition),
          imageUrl: before.imageUrl,
          isActive: false,
          createdBy: user.id,
          updatedBy: user.id
        }
      })
      await this.audited(user, 'admin.community.achievement.duplicate', 'CommunityAchievement', after.id, reason, before, after)
      return after
    }
    const data = action === 'ACTIVATE' ? { isActive: true } : action === 'DEACTIVATE' ? { isActive: false } : action === 'ARCHIVE' ? { deletedAt: new Date(), isActive: false } : null
    if (!data) throw new BadRequestException('Ação inválida.')
    const after = await this.prisma.communityAchievement.update({ where: { id }, data: { ...data, updatedBy: user.id } })
    await this.audited(user, `admin.community.achievement.${action.toLowerCase()}`, 'CommunityAchievement', id, reason, before, after)
    return after
  }

  async grantAchievement(id: string, payload: CommunityGrantPayload, user: AuthenticatedUser) {
    const accountId = required(payload.accountId, 'a conta')
    const reason = required(payload.reason, 'o motivo da atribuição', 4)
    const grant = await this.prisma.communityAchievementGrant.upsert({
      where: { achievementId_accountId: { achievementId: id, accountId } },
      create: { achievementId: id, accountId, grantedBy: user.id, reason },
      update: { revokedAt: null, revokedBy: null, revokeReason: null, grantedBy: user.id, reason, grantedAt: new Date() }
    })
    await this.audited(user, 'admin.community.achievement.grant', 'CommunityAchievementGrant', grant.id, reason, {}, grant, accountId)
    return grant
  }

  async revokeAchievement(id: string, accountId: string, reasonValue: string, user: AuthenticatedUser) {
    const reason = required(reasonValue, 'o motivo da remoção', 4)
    const grant = await this.prisma.communityAchievementGrant.findUnique({ where: { achievementId_accountId: { achievementId: id, accountId } } })
    if (!grant) throw new NotFoundException('Atribuição não encontrada.')
    const after = await this.prisma.communityAchievementGrant.update({ where: { id: grant.id }, data: { revokedAt: new Date(), revokedBy: user.id, revokeReason: reason } })
    await this.audited(user, 'admin.community.achievement.revoke', 'CommunityAchievementGrant', grant.id, reason, grant, after, accountId)
    return after
  }

  async quests(query: CommunityQuery) {
    const { page, pageSize, skip } = pageValues(query)
    const where: Prisma.CommunityQuestWhereInput = query.search ? { name: { contains: query.search.trim() } } : {}
    const [data, total] = await Promise.all([
      this.prisma.communityQuest.findMany({ where, include: { _count: { select: { participants: true } } }, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      this.prisma.communityQuest.count({ where })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async saveQuest(id: string | null, payload: CommunityQuestPayload, user: AuthenticatedUser) {
    const name = required(payload.name, 'o nome da quest')
    const data = {
      name, slug: slug(payload.slug || name),
      description: required(payload.description, 'a descrição'),
      objective: json(payload.objective), reward: json(payload.reward), audience: json(payload.audience),
      participantLimit: payload.participantLimit ? Math.max(1, payload.participantLimit) : null,
      startsAt: payload.startsAt ? new Date(payload.startsAt) : null,
      endsAt: payload.endsAt ? new Date(payload.endsAt) : null,
      status: payload.status || 'DRAFT' as CommunityQuestStatus,
      updatedBy: user.id
    }
    if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) throw new BadRequestException('O término deve ocorrer após o início.')
    const before = id ? await this.prisma.communityQuest.findUnique({ where: { id } }) : null
    const after = id
      ? await this.prisma.communityQuest.update({ where: { id }, data })
      : await this.prisma.communityQuest.create({ data: { ...data, createdBy: user.id } })
    await this.audited(user, `admin.community.quest.${id ? 'edit' : 'create'}`, 'CommunityQuest', after.id, id ? 'Atualização da quest.' : 'Criação da quest.', before || {}, after)
    return after
  }

  async questAction(id: string, actionValue: string, reasonValue: string, user: AuthenticatedUser) {
    const reason = required(reasonValue, 'a justificativa', 4)
    const before = await this.prisma.communityQuest.findUnique({ where: { id } })
    if (!before) throw new NotFoundException('Quest não encontrada.')
    const statusByAction: Record<string, CommunityQuestStatus> = {
      PUBLISH: 'ACTIVE', SCHEDULE: 'SCHEDULED', END: 'ENDED', CANCEL: 'CANCELLED', ARCHIVE: 'ARCHIVED'
    }
    const action = actionValue.toUpperCase()
    if (action === 'DUPLICATE') {
      const after = await this.prisma.communityQuest.create({
        data: {
          slug: `${before.slug}-copia-${Date.now()}`,
          name: `${before.name} (cópia)`,
          description: before.description,
          objective: json(before.objective),
          reward: json(before.reward),
          audience: before.audience === null ? undefined : json(before.audience),
          participantLimit: before.participantLimit,
          startsAt: before.startsAt,
          endsAt: before.endsAt,
          status: 'DRAFT',
          createdBy: user.id,
          updatedBy: user.id
        }
      })
      await this.audited(user, 'admin.community.quest.duplicate', 'CommunityQuest', after.id, reason, before, after)
      return after
    }
    const status = statusByAction[action]
    if (!status) throw new BadRequestException('Ação inválida.')
    const after = await this.prisma.communityQuest.update({ where: { id }, data: { status, updatedBy: user.id, ...(status === 'ACTIVE' ? { publishedBy: user.id } : {}) } })
    await this.audited(user, `admin.community.quest.${action.toLowerCase()}`, 'CommunityQuest', id, reason, before, after)
    return after
  }

  async questParticipants(id: string) {
    return this.prisma.communityQuestParticipant.findMany({
      where: { questId: id },
      include: { account: { select: { id: true, username: true, name: true } } },
      orderBy: { joinedAt: 'desc' }
    })
  }

  async validateQuestReward(id: string, accountId: string, reasonValue: string, user: AuthenticatedUser) {
    const reason = required(reasonValue, 'a justificativa', 4)
    const before = await this.prisma.communityQuestParticipant.findUnique({ where: { questId_accountId: { questId: id, accountId } } })
    if (!before) throw new NotFoundException('Participante não encontrado.')
    const after = await this.prisma.communityQuestParticipant.update({ where: { id: before.id }, data: { rewardedAt: new Date(), validatedBy: user.id } })
    await this.audited(user, 'admin.community.quest.reward.validate', 'CommunityQuestParticipant', before.id, reason, before, after, accountId)
    return after
  }

  async updateQuestProgress(id: string, accountId: string, payload: CommunityQuestProgressPayload, user: AuthenticatedUser) {
    const reason = required(payload.reason, 'a justificativa', 4)
    const before = await this.prisma.communityQuestParticipant.findUnique({
      where: { questId_accountId: { questId: id, accountId } }
    })
    if (!before) throw new NotFoundException('Participante não encontrado.')
    const progress = Math.min(100, Math.max(0, Number(payload.progress) || 0))
    const after = await this.prisma.communityQuestParticipant.update({
      where: { id: before.id },
      data: {
        progress,
        progressData: payload.progressData ? json(payload.progressData) : before.progressData || undefined,
        completedAt: payload.completed || progress === 100 ? before.completedAt || new Date() : null
      }
    })
    await this.audited(user, 'admin.community.quest.progress.update', 'CommunityQuestParticipant', before.id, reason, before, after, accountId)
    return after
  }

  async badges(query: CommunityQuery) {
    const { page, pageSize, skip } = pageValues(query)
    const where: Prisma.CommunityBadgeWhereInput = query.search ? { name: { contains: query.search.trim() } } : {}
    const [data, total] = await Promise.all([
      this.prisma.communityBadge.findMany({ where, include: { _count: { select: { grants: true } } }, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      this.prisma.communityBadge.count({ where })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async saveBadge(id: string | null, payload: CommunityBadgePayload, user: AuthenticatedUser) {
    const name = required(payload.name, 'o nome do badge')
    const data = {
      name, slug: slug(payload.slug || name), description: required(payload.description, 'a descrição'),
      imageUrl: payload.imageUrl?.trim() || null, visibility: payload.visibility?.trim() || 'PUBLIC',
      maxGrants: payload.maxGrants ? Math.max(1, payload.maxGrants) : null,
      validDays: payload.validDays ? Math.max(1, payload.validDays) : null,
      isActive: payload.isActive !== false, updatedBy: user.id
    }
    const before = id ? await this.prisma.communityBadge.findUnique({ where: { id } }) : null
    const after = id
      ? await this.prisma.communityBadge.update({ where: { id }, data })
      : await this.prisma.communityBadge.create({ data: { ...data, createdBy: user.id } })
    await this.audited(user, `admin.community.badge.${id ? 'edit' : 'create'}`, 'CommunityBadge', after.id, id ? 'Atualização do badge.' : 'Criação do badge.', before || {}, after)
    return after
  }

  async grantBadge(id: string, payload: CommunityGrantPayload, user: AuthenticatedUser) {
    const accountId = required(payload.accountId, 'a conta')
    const reason = required(payload.reason, 'o motivo da atribuição', 4)
    const badge = await this.prisma.communityBadge.findUnique({ where: { id }, include: { _count: { select: { grants: true } } } })
    if (!badge || !badge.isActive) throw new BadRequestException('Badge indisponível.')
    if (badge.maxGrants && badge._count.grants >= badge.maxGrants) throw new BadRequestException('Limite de atribuições atingido.')
    const expiresAt = badge.validDays ? new Date(Date.now() + badge.validDays * 86400000) : null
    const grant = await this.prisma.communityBadgeGrant.upsert({
      where: { badgeId_accountId: { badgeId: id, accountId } },
      create: { badgeId: id, accountId, grantedBy: user.id, reason, expiresAt },
      update: { removedAt: null, removedBy: null, grantedBy: user.id, reason, expiresAt, grantedAt: new Date() }
    })
    await this.audited(user, 'admin.community.badge.grant', 'CommunityBadgeGrant', grant.id, reason, {}, grant, accountId)
    return grant
  }

  async revokeBadge(id: string, accountId: string, reasonValue: string, user: AuthenticatedUser) {
    const reason = required(reasonValue, 'o motivo da remoção', 4)
    const grant = await this.prisma.communityBadgeGrant.findUnique({
      where: { badgeId_accountId: { badgeId: id, accountId } }
    })
    if (!grant || grant.removedAt) throw new NotFoundException('Atribuição de badge não encontrada.')
    const after = await this.prisma.communityBadgeGrant.update({
      where: { id: grant.id },
      data: { removedAt: new Date(), removedBy: user.id }
    })
    await this.audited(user, 'admin.community.badge.revoke', 'CommunityBadgeGrant', grant.id, reason, grant, after, accountId)
    return after
  }

  async policy() {
    return this.prisma.communityPolicy.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {}
    })
  }

  async updatePolicy(payload: CommunityPolicyPayload, user: AuthenticatedUser) {
    const before = await this.policy()
    const after = await this.prisma.communityPolicy.update({
      where: { id: 'default' },
      data: {
        blockedWords: json(payload.blockedWords),
        allowedDomains: json(payload.allowedDomains),
        blockedDomains: json(payload.blockedDomains),
        spamRules: json(payload.spamRules),
        maxPostsPerHour: Math.max(1, Number(payload.maxPostsPerHour) || before.maxPostsPerHour),
        maxCommentsPerHour: Math.max(1, Number(payload.maxCommentsPerHour) || before.maxCommentsPerHour),
        postCooldownSeconds: Math.max(0, Number(payload.postCooldownSeconds) || 0),
        commentCooldownSeconds: Math.max(0, Number(payload.commentCooldownSeconds) || 0),
        usernameCooldownDays: Math.max(1, Number(payload.usernameCooldownDays) || before.usernameCooldownDays),
        updatedBy: user.id
      }
    })
    await this.audited(user, 'admin.community.policy.update', 'CommunityPolicy', 'default', 'Atualização das regras sociais.', before, after)
    return after
  }

  async tasks(query: CommunityQuery) {
    const { page, pageSize, skip } = pageValues(query)
    const where: Prisma.CommunityTaskWhereInput = {
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.search ? { title: { contains: query.search.trim() } } : {})
    }
    const [data, total] = await Promise.all([
      this.prisma.communityTask.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      this.prisma.communityTask.count({ where })
    ])
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async saveTask(id: string | null, payload: CommunityTaskPayload, user: AuthenticatedUser) {
    const data = {
      title: required(payload.title, 'o título'),
      description: payload.description?.trim() || null,
      entityType: required(payload.entityType, 'o tipo de origem'),
      entityId: payload.entityId?.trim() || null,
      status: payload.status || 'PENDING' as const,
      priority: payload.priority || 'NORMAL' as const,
      assigneeId: payload.assigneeId?.trim() || null,
      dueAt: payload.dueAt ? new Date(payload.dueAt) : null,
      evidence: json(payload.evidence),
      updatedBy: user.id,
      ...(payload.status === 'DONE' ? { completedAt: new Date() } : { completedAt: null })
    }
    const before = id ? await this.prisma.communityTask.findUnique({ where: { id } }) : null
    const after = id
      ? await this.prisma.communityTask.update({ where: { id }, data })
      : await this.prisma.communityTask.create({ data: { ...data, createdBy: user.id } })
    const centralStatus = after.status === 'DONE' ? 'COMPLETED'
      : after.status === 'IN_PROGRESS' ? 'IN_PROGRESS'
        : after.status === 'BLOCKED' ? 'WAITING'
          : after.status === 'CANCELLED' ? 'CANCELED'
            : after.assigneeId ? 'ASSIGNED' : 'OPEN'
    const centralTask = await this.prisma.adminTask.upsert({
      where: { sourceTaskType_sourceTaskId: { sourceTaskType: 'CommunityTask', sourceTaskId: after.id } },
      create: {
        title: after.title, description: after.description || '', module: 'community', type: after.entityType,
        priority: after.priority === 'URGENT' ? 'URGENT' : after.priority,
        complexity: after.priority === 'URGENT' ? 'COMPLEX' : 'STANDARD',
        status: centralStatus, assignedTo: after.assigneeId, assignedBy: after.assigneeId ? user.id : null,
        createdBy: user.id, dueAt: after.dueAt, completedAt: after.completedAt,
        entityType: after.entityType, entityId: after.entityId,
        sourceTaskType: 'CommunityTask', sourceTaskId: after.id
      },
      update: {
        title: after.title, description: after.description || '',
        priority: after.priority === 'URGENT' ? 'URGENT' : after.priority,
        status: centralStatus, assignedTo: after.assigneeId, assignedBy: after.assigneeId ? user.id : null,
        dueAt: after.dueAt, completedAt: after.completedAt
      }
    })
    await this.audited(user, `admin.community.task.${id ? 'edit' : 'create'}`, 'CommunityTask', after.id, id ? 'Atualização da tarefa.' : 'Criação da tarefa.', before || {}, after)
    return { ...after, centralTaskId: centralTask.id }
  }

  async analytics() {
    const [posts, comments, reactions, reports, resolvedReports, activeUsers, completedQuests, achievements] = await Promise.all([
      this.prisma.communityPost.count(),
      this.prisma.communityComment.count(),
      this.prisma.communityReaction.count(),
      this.prisma.communityReport.count(),
      this.prisma.communityReport.findMany({ where: { resolvedAt: { not: null } }, select: { createdAt: true, resolvedAt: true } }),
      this.prisma.communityProfile.count({ where: { updatedAt: { gte: new Date(Date.now() - 30 * 86400000) } } }),
      this.prisma.communityQuestParticipant.count({ where: { completedAt: { not: null } } }),
      this.prisma.communityAchievementGrant.count({ where: { revokedAt: null } })
    ])
    const averageModerationHours = resolvedReports.length
      ? resolvedReports.reduce((sum, item) => sum + ((item.resolvedAt?.getTime() || item.createdAt.getTime()) - item.createdAt.getTime()), 0) / resolvedReports.length / 3600000
      : 0
    const relevant = await this.prisma.communityPost.findMany({
      where: { status: 'PUBLISHED' },
      include: { _count: { select: { reactions: true, comments: true } } },
      orderBy: { reactions: { _count: 'desc' } },
      take: 10
    })
    return { posts, comments, reactions, reports, activeUsers, completedQuests, achievements, averageModerationHours: Math.round(averageModerationHours * 10) / 10, relevant }
  }
}
