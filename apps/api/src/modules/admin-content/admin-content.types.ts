import type { EditorialStatus, EquipmentGroup, KnowledgeEntryKind, KnowledgeScope, ReferenceAssetKind } from '@prisma/client'

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
}

export type AdminUpdateKnowledgeEntryPayload = Partial<AdminCreateKnowledgeEntryPayload>

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
}

export type AdminUpdateEquipmentPayload = Partial<AdminCreateEquipmentPayload>
