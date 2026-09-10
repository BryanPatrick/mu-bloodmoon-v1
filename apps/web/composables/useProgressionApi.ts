// PHASE U (2026-09-03) -- admin client for the Progression control plane
// (progression-config.service.ts on the API side). Mirrors
// useLegacyCatalogApi.ts's own fetch/header pattern exactly.
export type ProgressionDomain = 'EXPERIENCE' | 'DROP' | 'RESET' | 'MASTER_RESET'
export type ProgressionDriftStatus = 'NOT_CHECKED' | 'IN_SYNC' | 'DRIFT_DETECTED' | 'CHECK_FAILED' | 'NOT_MANAGED'
export type ProgressionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type ProgressionPolicyStatus = 'NOT_EVALUATED' | 'APPROVED' | 'EFFECTIVE_BUT_UNAPPROVED' | 'POLICY_DRIFT' | 'DISABLED' | 'UNKNOWN'
export type ProgressionTierValue = { AL0: number, AL1: number, AL2: number, AL3: number }

export type ProgressionConfigItem = {
  id: string
  domain: ProgressionDomain
  key: string
  friendlyLabel: string
  description: string | null
  unit: string | null
  technicalSource: { file: string, key: string, shape: 'flat' | 'perTier' }
  riskLevel: ProgressionRiskLevel
  policyStatus: ProgressionPolicyStatus
  desiredValue: number | ProgressionTierValue | null
  desiredReason: string | null
  effectiveValue: number | ProgressionTierValue | null
  driftStatus: ProgressionDriftStatus
  sourceLastReadAt: string | null
  sourceFingerprint: string | null
  internalNotes: string | null
  version: number
  createdAt: string
  updatedAt: string
}

export type ProgressionSummaryRow = { domain: ProgressionDomain, driftStatus: ProgressionDriftStatus, count: number }

export type ProgressionUpdatePayload = Partial<{
  desiredValue: number | ProgressionTierValue | null
  desiredReason: string
  internalNotes: string
}>

export type ProgressionListQuery = Partial<{
  domain: ProgressionDomain
  driftStatus: ProgressionDriftStatus
  riskLevel: ProgressionRiskLevel
  policyStatus: ProgressionPolicyStatus
  search: string
}>

export type ProgressionHistoryEntry = {
  id: string
  action: string
  actorUsername: string | null
  reason: string | null
  beforeData: unknown
  afterData: unknown
  createdAt: string
}

// PHASE X (2026-09-04) -- XP stack calculator (progression-calculator.ts)
export type XpModifierGroup = 'BASE_SERVER_RATE' | 'ACCOUNT_LEVEL_VIP' | 'MAP' | 'PARTY' | 'EVENT' | 'QUEST' | 'SEAL' | 'BUFF' | 'PET' | 'RANDOM_BONUS'
export type XpModifier = {
  id: string
  group: XpModifierGroup
  name: string
  rawValue: string
  stackGroupKey: string | null
  confidence: 'CONFIRMED' | 'PARTIAL'
  active: boolean
}
export type BestCaseStackResult = {
  maximumConfirmedStack: { modifierIds: string[], note: string }
  maximumPossibleButUnverifiedStack: { modifierIds: string[], note: string }
}
export type ModifierValidationResult = { valid: true } | { valid: false, conflicts: Array<{ a: string, b: string, stackGroupKey: string }> }
export type SpawnCapacityResult = { blocked: true, reason: string } | { blocked: false, spawnCapacityPerHour: number }

const authStorageKey = 'blood-moon-auth'

const readAccessToken = () => {
  if (!import.meta.client) return ''
  try {
    const saved = localStorage.getItem(authStorageKey)
    return saved ? JSON.parse(saved)?.accessToken || '' : ''
  } catch {
    return ''
  }
}

const headers = (): Record<string, string> => (readAccessToken() ? { Authorization: `Bearer ${readAccessToken()}` } : {})

export const useProgressionApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))

  const get = <T>(path: string, query: Record<string, unknown> = {}) => $fetch<T>(`${apiBase.value}${path}`, { query, headers: headers() })
  const send = <T>(method: 'POST' | 'PATCH', path: string, body?: unknown) => $fetch<T>(`${apiBase.value}${path}`, { method, body: body as Record<string, any> | BodyInit | null | undefined, headers: headers() })

  return {
    list: (query: ProgressionListQuery = {}) => get<{ items: ProgressionConfigItem[], total: number }>('/admin/progression', query),
    summary: () => get<ProgressionSummaryRow[]>('/admin/progression/summary'),
    seed: () => send<{ created: number, updated: number, total: number }>('POST', '/admin/progression/seed'),
    update: (id: string, payload: ProgressionUpdatePayload) => send<ProgressionConfigItem>('PATCH', `/admin/progression/${id}`, payload),
    history: (id: string) => get<ProgressionHistoryEntry[]>(`/admin/progression/${id}/history`),
    refreshEffectiveState: () =>
      send<{ updated: number, driftCount: number, inSyncCount: number, unmatched: number, snapshotGeneratedAt: string }>('POST', '/admin/progression/effective-state/refresh'),
    sync: () => send<never>('POST', '/admin/progression/sync'),
    calculatorCatalog: () => get<{ modifiers: XpModifier[], bestCaseStack: BestCaseStackResult }>('/admin/progression/calculator/catalog'),
    calculatorValidateSelection: (modifierIds: string[]) => send<ModifierValidationResult>('POST', '/admin/progression/calculator/validate-selection', { modifierIds }),
    calculatorSpawnCapacity: (spotMonsterCount: number, confirmedRespawnSeconds: number | null) =>
      send<SpawnCapacityResult>('POST', '/admin/progression/calculator/spawn-capacity', { spotMonsterCount, confirmedRespawnSeconds }),
    calculatorXpPerHour: (xpPerKill: number, killsPerHour: number) =>
      send<{ xpPerHour: number }>('POST', '/admin/progression/calculator/xp-per-hour', { xpPerKill, killsPerHour })
  }
}
