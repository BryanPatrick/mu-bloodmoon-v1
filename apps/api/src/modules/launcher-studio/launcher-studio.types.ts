import type { LauncherAssetCategoryValue, LauncherPageKey } from './slot-registry'

export type AdminLauncherSlotUpdatePayload = {
  value: unknown
  tokens?: Record<string, string>
}

export type AdminLauncherAssetUploadPayload = {
  name?: string
  category: LauncherAssetCategoryValue
  dataUrl: string
}

export type AdminLauncherAssetQuery = {
  page?: string
  pageSize?: string
  category?: LauncherAssetCategoryValue
  search?: string
}

export type AdminLauncherPublishPayload = {
  note?: string
}

export type AdminLauncherRollbackPayload = {
  version: number
  note?: string
}

export type AdminLauncherTermsCreatePayload = {
  title: string
  content: string
  effectiveAt?: string
}

// Public, launcher-consumable DTO -- resolved slot values only, never a
// raw Prisma row (Part AJ/AL). draftIncluded is only ever true when the
// caller is an authenticated admin preview request; the plain public
// bootstrap route never includes draft values.
export interface ResolvedSlot {
  id: string
  page: LauncherPageKey
  value: unknown
  tokens: Record<string, string>
  status: 'DRAFT' | 'PUBLISHED' | 'UNSET'
}

export interface LauncherContentResponse {
  schemaVersion: number
  contentVersion: number
  generatedAt: string
  slots: ResolvedSlot[]
}
