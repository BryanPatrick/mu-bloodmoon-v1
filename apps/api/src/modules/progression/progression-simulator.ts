// PHASE V (2026-09-04) -- STRUCTURAL_SIMULATOR only (Part 21/22). This
// module never invents a monster-kill-to-XP formula -- the real one is
// UNKNOWN (docs/progression/xp-formula-evidence-and-vendor-questions.md).
// Every function here either (a) computes real arithmetic on real, known
// numbers (reset cadence, reset stat-point totals, or an
// already-empirically-measured XP rate the caller supplies), or (b)
// throws XpFormulaUnknownError rather than fabricate a precise-looking
// number from an unproven formula. There is no FORMULA_VALIDATED mode --
// only build one once docs/progression/xp-formula-evidence-and-vendor-
// questions.md's formula question package is actually answered.

export type ProgressionTier = 'AL0' | 'AL1' | 'AL2' | 'AL3'

export class XpFormulaUnknownError extends Error {
  constructor() {
    super(
      'XP_FORMULA_UNKNOWN -- cannot produce an authoritative XP estimate from ' +
      'account tier and monster level alone. See docs/progression/' +
      'xp-formula-evidence-and-vendor-questions.md. Supply an empirically ' +
      'measured xpPerKill (Part 15 test design) to use ' +
      'estimateHoursFromKnownXpRate() instead.'
    )
    this.name = 'XpFormulaUnknownError'
  }
}

// Part 13 -- pure cadence arithmetic, no XP/playtime assumption involved.
export type ResetCadenceInput = { resetsPerWeek: number }
export type ResetCadenceResult = { resetsPerWeek: number; daysPerReset: number }

export function cadenceFromResetsPerWeek(input: ResetCadenceInput): ResetCadenceResult {
  if (!(input.resetsPerWeek > 0)) throw new RangeError('resetsPerWeek must be > 0')
  return { resetsPerWeek: input.resetsPerWeek, daysPerReset: 7 / input.resetsPerWeek }
}

// Real arithmetic on real, confirmed ProgressionConfigItem values (Part 11)
// -- e.g. "how many stat points would N resets grant a Bronze player."
export type ResetRewardInput = { tier: ProgressionTier; resetPointsPerReset: number; resetCount: number }

export function totalResetStatPoints(input: ResetRewardInput): number {
  if (input.resetCount < 0) throw new RangeError('resetCount must be >= 0')
  if (input.resetPointsPerReset < 0) throw new RangeError('resetPointsPerReset must be >= 0')
  return input.resetPointsPerReset * input.resetCount
}

// Structural-only time projection: the caller must already know xpPerKill
// from some real source (an empirical test, Part 15) -- this function never
// derives it from tier/monster level itself. See estimateXpFromFormula()
// below for the path that explicitly refuses to do that.
export type StructuralTimeToXpInput = { xpPerKill: number; killsPerHour: number; xpNeeded: number }
export type StructuralTimeToXpResult = { hours: number; killsRequired: number }

export function estimateHoursFromKnownXpRate(input: StructuralTimeToXpInput): StructuralTimeToXpResult {
  if (!(input.xpPerKill > 0) || !(input.killsPerHour > 0) || !(input.xpNeeded > 0)) {
    throw new RangeError('xpPerKill, killsPerHour, and xpNeeded must all be > 0')
  }
  const killsRequired = input.xpNeeded / input.xpPerKill
  const hours = killsRequired / input.killsPerHour
  return { hours, killsRequired }
}

// Part 22's mandatory refusal path: deriving XP from account tier + monster
// level alone (i.e. from the formula itself, not a caller-supplied
// empirical rate) is exactly what this whole investigation could not
// resolve -- so this function's only job is to say so, loudly and
// specifically, never to guess.
export function estimateXpFromFormula(_tier: ProgressionTier, _monsterLevel: number): never {
  throw new XpFormulaUnknownError()
}
