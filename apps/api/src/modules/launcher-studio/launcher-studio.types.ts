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

// Part E's asset-resolution flow (assetId -> API-resolved metadata/url)
// needs a manifest the same shape as GET /launcher/bootstrap's existing
// assets[] -- an IMAGE/asset-REFERENCE slot's Value is only ever a
// LauncherAsset id, never a URL, so the client can't resolve it without
// this.
export interface LauncherAssetManifestEntry {
  id: string
  url: string
  contentType: string
  hash: string
  size: number
}

export interface LauncherContentResponse {
  schemaVersion: number
  contentVersion: number
  generatedAt: string
  slots: ResolvedSlot[]
  assets: LauncherAssetManifestEntry[]
}
