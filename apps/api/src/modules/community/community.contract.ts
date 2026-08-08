import type {
  CommunityAchievementRarity,
  CommunityModerationType,
  CommunityPostType,
  CommunityPostVisibility,
  CommunityQuestStatus,
  CommunityReportPriority,
  CommunityReportStatus,
  CommunityTaskStatus
} from '@prisma/client'

export type CommunityQuery = {
  page?: string
  pageSize?: string
  search?: string
  status?: string
  authorId?: string
  assigneeId?: string
  sort?: 'recent' | 'relevant'
  type?: CommunityPostType
  visibility?: CommunityPostVisibility
  feed?: 'for-you' | 'following' | 'recent' | 'saved'
}

export type CommunityPostPayload = {
  type?: CommunityPostType
  visibility?: CommunityPostVisibility
  status?: 'DRAFT' | 'PUBLISHED'
  title?: string
  content?: string
  mediaIds?: string[]
}

export type CommunityCommentPayload = {
  content?: string
  parentId?: string
}

export type CommunityReactionPayload = {
  postId?: string
  commentId?: string
  type?: 'LIKE' | 'HONOR' | 'POWER' | 'RARE' | 'VICTORY'
}

export type CommunityReportPayload = {
  postId?: string
  commentId?: string
  reason?: string
  description?: string
  evidence?: unknown[]
}

export type CommunityAdminActionPayload = {
  action?: string
  reason?: string
  notes?: string
  assigneeId?: string
  dueAt?: string
  expiresAt?: string
  evidence?: unknown[]
  title?: string
  content?: string
  status?: CommunityReportStatus | CommunityTaskStatus
  priority?: CommunityReportPriority
}

export type CommunityModerationPayload = {
  type?: CommunityModerationType
  reason?: string
  expiresAt?: string
  evidence?: unknown[]
  replacement?: string
}

export type CommunityProfilePayload = {
  displayName?: string
  bio?: string
  avatarUrl?: string
  coverUrl?: string
  mainCharacterName?: string
  mainCharacterClass?: string
  guildName?: string
  featuredAchievementIds?: string[]
  profileVisibility?: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'
  charactersVisibility?: 'ALL' | 'MAIN_ONLY' | 'HIDDEN'
  equipmentVisibility?: 'VISIBLE' | 'HIDDEN'
  statisticsVisibility?: 'PRIVATE' | 'SELECTIVE' | 'PUBLIC'
  guildVisibility?: 'VISIBLE' | 'HIDDEN'
  activityVisibility?: 'VISIBLE' | 'HIDDEN'
}

export type CommunityAchievementPayload = {
  name?: string
  slug?: string
  description?: string
  category?: string
  rarity?: CommunityAchievementRarity
  points?: number
  condition?: Record<string, unknown>
  imageUrl?: string
  isActive?: boolean
}

export type CommunityQuestPayload = {
  name?: string
  slug?: string
  description?: string
  objective?: Record<string, unknown>
  reward?: Record<string, unknown>
  audience?: Record<string, unknown>
  participantLimit?: number
  startsAt?: string
  endsAt?: string
  status?: CommunityQuestStatus
}

export type CommunityQuestProgressPayload = {
  progress?: number
  progressData?: Record<string, unknown>
  completed?: boolean
  reason?: string
}

export type CommunityBadgePayload = {
  name?: string
  slug?: string
  description?: string
  imageUrl?: string
  visibility?: string
  maxGrants?: number
  validDays?: number
  isActive?: boolean
}

export type CommunityGrantPayload = {
  accountId?: string
  reason?: string
}

export type CommunityPolicyPayload = {
  blockedWords?: string[]
  allowedDomains?: string[]
  blockedDomains?: string[]
  spamRules?: Record<string, unknown>
  maxPostsPerHour?: number
  maxCommentsPerHour?: number
  postCooldownSeconds?: number
  commentCooldownSeconds?: number
  usernameCooldownDays?: number
}

export type CommunityTaskPayload = {
  title?: string
  description?: string
  entityType?: string
  entityId?: string
  status?: CommunityTaskStatus
  priority?: CommunityReportPriority
  assigneeId?: string
  dueAt?: string
  evidence?: unknown[]
}
