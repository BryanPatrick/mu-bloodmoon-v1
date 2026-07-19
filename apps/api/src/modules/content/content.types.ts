import type { KnowledgeEntryKind } from '@prisma/client'

export type PublicContentQuery = {
  kind?: KnowledgeEntryKind
  page?: string
  pageSize?: string
  search?: string
}
