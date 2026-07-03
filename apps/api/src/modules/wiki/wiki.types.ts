import type { EquipmentGroup, EquipmentQuality, KnowledgeEntryKind, KnowledgeScope } from '@prisma/client'

export type PaginationQuery = {
  page?: string
  pageSize?: string
}

export type WikiEntryQuery = PaginationQuery & {
  kind?: KnowledgeEntryKind
  scope?: KnowledgeScope
  season?: string
  search?: string
}

export type WikiEquipmentQuery = PaginationQuery & {
  group?: EquipmentGroup
  quality?: EquipmentQuality
  season?: string
  search?: string
  character?: string
  className?: string
  category?: string
}

export type WikiEquipmentSetQuery = PaginationQuery & {
  season?: string
  quality?: EquipmentQuality
  search?: string
  character?: string
  className?: string
  category?: string
}

export type PaginatedResult<T> = {
  data: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
