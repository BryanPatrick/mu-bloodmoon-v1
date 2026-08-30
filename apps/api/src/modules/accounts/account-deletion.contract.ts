export interface NormalDeletionPayload {
  accountId: string
  reason?: string
}

export interface PreBetaPurgePayload {
  betaCycleId: string
  accountIds: string[]
}

export type DependencyDecision = 'PRESERVE' | 'DETACH' | 'ANONYMIZE' | 'BLOCK' | 'DELETE'

export interface DependencyReportRow {
  system: string
  decision: DependencyDecision
  detail: string
}

export interface NormalDeletionDryRunResult {
  accountId: string
  verdict: 'WOULD_ANONYMIZE' | 'BLOCKED' | 'ALREADY_DELETED' | 'UNKNOWN'
  blockers: string[]
  dependencies: DependencyReportRow[]
}

export interface PreBetaPurgeDryRunRow {
  accountId: string
  verdict: 'WOULD_DELETE' | 'BLOCKED' | 'UNKNOWN_DEPENDENCY'
  reasons: string[]
}
