// Open Beta P0 foundation. The ONE authoritative source for "is it Open
// Beta right now" -- read server-side only, at registration time
// (auth.service.ts), never trusted from a client clock and never
// duplicated across multiple frontend files. Defaults match the decided
// window (docs/product/ECONOMY_PRODUCT_DECISIONS.md); overridable via env
// for local/staging testing without code changes.
const DEFAULT_OPEN_BETA_START_AT = '2026-09-01T00:00:00-03:00'
const DEFAULT_OPEN_BETA_END_AT = '2026-09-15T23:59:59-03:00'

function parseConfiguredDate(envValue: string | undefined, fallback: string): Date {
  const raw = envValue?.trim() || fallback
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid Open Beta window date: "${raw}"`)
  }
  return parsed
}

export function getOpenBetaWindow() {
  return {
    startAt: parseConfiguredDate(process.env.OPEN_BETA_START_AT, DEFAULT_OPEN_BETA_START_AT),
    endAt: parseConfiguredDate(process.env.OPEN_BETA_END_AT, DEFAULT_OPEN_BETA_END_AT)
  }
}

export type AccountPhaseValue = 'PRE_BETA' | 'OPEN_BETA' | 'OFFICIAL'

/**
 * The only place accountPhase is derived from "what time is it right
 * now" -- and only ever at the moment of a NEW registration, never
 * retroactively re-derived for an existing account from its createdAt
 * (that would misclassify accounts created for unrelated reasons, which
 * is exactly what the phase spec warns against).
 */
export function currentAccountPhase(now: Date = new Date()): AccountPhaseValue {
  const { startAt, endAt } = getOpenBetaWindow()
  if (now.getTime() < startAt.getTime()) return 'PRE_BETA'
  if (now.getTime() > endAt.getTime()) return 'OFFICIAL'
  return 'OPEN_BETA'
}

export const OPEN_BETA_NOTICE_TERMS_KEY = 'OPEN_BETA_NOTICE'
export const OPEN_BETA_NOTICE_VERSION = 1

// Part L draft copy -- LEGAL_REVIEW_REQUIRED, not final legal Terms. Kept
// as a single backend-owned constant (not duplicated in frontend copy)
// so there's one place to update if legal review changes the wording.
export const OPEN_BETA_NOTICE_TEXT_PT_BR = `Esta conta é válida para o Open Beta do Blood Moon, realizado de 01/09/2026 a 15/09/2026.

Ao final do período, a conta e o progresso do Open Beta serão excluídos.

Recompensas elegíveis conquistadas durante o Beta poderão ser vinculadas posteriormente a uma nova conta criada com o mesmo endereço de e-mail.`
