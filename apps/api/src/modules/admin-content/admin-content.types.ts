import type { EditorialStatus, EquipmentClassLinkRole, EquipmentGroup, EquipmentQuality, KnowledgeEntryKind, KnowledgeScope, ReferenceAssetKind } from '@prisma/client'

export type AdminContentQuery = {
  page?: string
  pageSize?: string
  kind?: KnowledgeEntryKind
  scope?: KnowledgeScope
  status?: EditorialStatus
  search?: string
}

export type AdminAssetQuery = {
  page?: string
  pageSize?: string
  kind?: ReferenceAssetKind
  status?: EditorialStatus
  search?: string
}

export type AdminEquipmentQuery = {
  page?: string
  pageSize?: string
  group?: EquipmentGroup
  status?: EditorialStatus
  category?: string
  search?: string
}

export type AdminCreateKnowledgeEntryPayload = {
  canonicalKey?: string
  slug?: string
  title: string
  kind?: KnowledgeEntryKind
  scope?: KnowledgeScope
  status?: EditorialStatus
  sourceKey?: string
  sourceUrl?: string
  summary?: string
  seasonMin?: number | null
  seasonMax?: number | null
  rawData?: unknown
  normalizedData?: unknown
  // Launcher CMS Studio phase (Part S/T) -- additive, only meaningful for
  // kind NEWS/EVENT. See schema.prisma's KnowledgeEntry comment for why
  // these live here instead of a second content model.
  launcherEnabled?: boolean
  launcherSummary?: string | null
  body?: string | null
  eventStartsAt?: string | null
  eventEndsAt?: string | null
  recommendedLevel?: string | null
  entryInfo?: string | null
  guideUrl?: string | null
  calendarEnabled?: boolean
}

export type AdminUpdateKnowledgeEntryPayload = Partial<AdminCreateKnowledgeEntryPayload>

export type AdminSettingQuery = {
  page?: string
  pageSize?: string
  category?: string
  status?: EditorialStatus
  search?: string
}

export type AdminCreateSiteSettingPayload = {
  key: string
  category?: string
  label: string
  description?: string | null
  value: unknown
  isPublic?: boolean
  status?: EditorialStatus
}

export type AdminUpdateSiteSettingPayload = Partial<AdminCreateSiteSettingPayload>

export type AdminCreateReferenceAssetPayload = {
  sourceId?: string | null
  sourceUrl?: string | null
  localPath: string
  publicPath?: string | null
  kind?: ReferenceAssetKind
  mimeType?: string | null
  sha1?: string | null
  bytes?: number | null
  status?: EditorialStatus
  duplicateOfId?: string | null
  metadata?: unknown
}

export type AdminUpdateReferenceAssetPayload = Partial<AdminCreateReferenceAssetPayload>

export type AdminUploadImagePayload = {
  name?: string
  dataUrl?: string
}

export type AdminCreateEquipmentPayload = {
  key?: string
  name: string
  title?: string
  category?: string
  categorySlug?: string
  group?: EquipmentGroup
  baseSetName?: string | null
  sourceUrl?: string | null
  minSeason?: number
  status?: EditorialStatus
  rawData?: unknown
  remapData?: unknown
  variants?: Array<{
    quality: EquipmentQuality
    minSeason?: number
    data?: unknown
  }>
  pieces?: Array<{
    name: string
    slot: string
    imagePath?: string | null
    data?: unknown
    sortOrder?: number
  }>
  options?: Array<{
    scope: string
    label: string
    data?: unknown
    sortOrder?: number
  }>
  classLinks?: Array<{
    classId: string
    characterId: string
    role?: EquipmentClassLinkRole
    source?: string
  }>
  seasons?: Array<{
    season: number
    visibility?: KnowledgeScope
    source?: string
  }>
}

export type AdminUpdateEquipmentPayload = Partial<AdminCreateEquipmentPayload>
