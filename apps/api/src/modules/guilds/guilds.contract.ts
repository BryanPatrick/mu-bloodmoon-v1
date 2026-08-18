import type {
  GuildApprovalStatus,
  GuildFocusTag,
  GuildMovementType,
  GuildProjectStatus,
  GuildRecruitmentStatus,
  GuildRequestStatus,
  GuildRequestType,
  GuildSource,
  GuildStatus,
  GuildSyncStatus
} from '@prisma/client'

export type GuildQuery = {
  page?: string
  pageSize?: string
  search?: string
  focus?: GuildFocusTag
  recruitment?: GuildRecruitmentStatus
  sort?: 'newest' | 'level' | 'members' | 'name'
  status?: GuildStatus
  source?: GuildSource
  syncStatus?: GuildSyncStatus
}

export type GuildCreatePayload = {
  name?: string
  tag?: string
  description?: string
  recruitment?: GuildRecruitmentStatus
  focusTags?: GuildFocusTag[]
  leaderCharacterId?: string
  foundedByAccountId?: string
}

export type GuildUpdatePayload = {
  name?: string
  tag?: string
  description?: string
  recruitment?: GuildRecruitmentStatus
  focusTags?: GuildFocusTag[]
}

export type GuildJoinPayload = {
  characterId?: string
  message?: string
}

export type GuildJoinDecisionPayload = {
  note?: string
}

export type GuildInviteCandidateQuery = {
  search?: string
}

export type GuildInvitePayload = {
  characterId?: string
  message?: string
}

export type GuildMemberRolePayload = {
  roleKey?: string
}

export type GuildMemberKickPayload = {
  reason?: string
}

export type GuildRequestPayload = {
  type?: GuildRequestType
  title?: string
  description?: string
  quantity?: number
  characterId?: string
}

export type GuildRequestUpdatePayload = {
  title?: string
  description?: string
  quantity?: number
  status?: GuildRequestStatus
}

export type GuildProjectPayload = {
  title?: string
  description?: string
  goal?: string
  requiredResources?: unknown
  deadline?: string
  impact?: string
}

export type GuildProjectUpdatePayload = GuildProjectPayload & {
  status?: GuildProjectStatus
  availableResources?: unknown
  contributors?: unknown
  relatedPlayers?: unknown
}

export type GuildAdminActionPayload = {
  action?: string
  reason?: string
}

export type GuildLevelConfigPayload = {
  level?: number
  xpRequired?: number
  title?: string
  perks?: unknown
  active?: boolean
}

export type GuildXpRulePayload = {
  resourceType?: string
  resourceKey?: string
  amountRequired?: string | number
  guildXpGranted?: number
  active?: boolean
  seasonId?: string
  perGuildLimit?: number
  perMemberLimit?: number
}

export type GuildMovementApprovalStatus = GuildApprovalStatus
export type GuildMovementKind = GuildMovementType
