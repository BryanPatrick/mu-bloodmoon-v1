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

// Bryan's 2026-08-30 follow-up: structured exit feedback shown before the
// self-service deletion request is created -- optional, never blocking
// (account-deletion-request.service.ts#requestDeletion records it
// best-effort; a malformed/failed write never prevents the request
// itself). `detail` is free text per reason, standing in for whatever
// contextual sub-question the frontend shows for that specific code --
// the backend deliberately does not encode a rigid per-reason sub-question
// schema, since that's a UI concern, not a data-shape one.
export type ExitFeedbackReasonCode =
  | 'LACK_OF_TIME' | 'PROGRESSION' | 'BALANCING' | 'BUGS' | 'PERFORMANCE_CONNECTION'
  | 'PLAYER_COMMUNITY_ISSUE' | 'STAFF_SUPPORT_ISSUE' | 'SHOP_VIP_ECONOMY'
  | 'ANOTHER_SERVER' | 'ACCOUNT_ISSUE' | 'PRIVACY_SECURITY' | 'OTHER'

export const EXIT_FEEDBACK_REASON_CODES: readonly ExitFeedbackReasonCode[] = [
  'LACK_OF_TIME', 'PROGRESSION', 'BALANCING', 'BUGS', 'PERFORMANCE_CONNECTION',
  'PLAYER_COMMUNITY_ISSUE', 'STAFF_SUPPORT_ISSUE', 'SHOP_VIP_ECONOMY',
  'ANOTHER_SERVER', 'ACCOUNT_ISSUE', 'PRIVACY_SECURITY', 'OTHER'
]

export interface ExitFeedbackReason {
  code: ExitFeedbackReasonCode
  detail?: string
}

// Phase K (2026-08-30) Part 12: records what happened when a contextual
// retention offer (BUGS/STAFF_SUPPORT_ISSUE/ACCOUNT_ISSUE -> "talk to
// support first"; LACK_OF_TIME -> "you can just go inactive") was shown
// during the exit questionnaire -- purely observational, never gates the
// deletion itself. `offerCodes` names which reason(s) triggered the offer
// shown, not the player's own selected reasons (already in `reasons`
// above) -- kept separate so a future offer-copy change doesn't retroactively
// reinterpret old rows.
export interface ExitRetentionInteraction {
  offered: boolean
  offerCodes: ExitFeedbackReasonCode[]
  helpAccepted: boolean
  ticketCreated: boolean
  continuedAnyway: boolean
}

export interface ExitFeedbackPayload {
  reasons: ExitFeedbackReason[]
  otherText?: string
  retentionInteraction?: ExitRetentionInteraction
}
