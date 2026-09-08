import {
  XpFormulaUnknownError,
  cadenceFromResetsPerWeek,
  estimateHoursFromKnownXpRate,
  estimateXpFromFormula,
  totalResetStatPoints
} from '../src/modules/progression/progression-simulator'

// PHASE V (2026-09-04) -- pure unit tests for the STRUCTURAL_SIMULATOR
// (Part 21/22). No database, no app bootstrap needed -- named
// *.e2e-spec.ts only to match this project's existing jest-e2e.json
// testRegex (apps/api has no separate unit-test jest config).
describe('Progression structural simulator -- Phase V', () => {
  it('cadenceFromResetsPerWeek: 2 and 3 resets/week translate to real day intervals, no XP assumption involved', () => {
    expect(cadenceFromResetsPerWeek({ resetsPerWeek: 2 }).daysPerReset).toBeCloseTo(3.5, 5)
    expect(cadenceFromResetsPerWeek({ resetsPerWeek: 3 }).daysPerReset).toBeCloseTo(7 / 3, 5)
    expect(() => cadenceFromResetsPerWeek({ resetsPerWeek: 0 })).toThrow(RangeError)
  })

  it('totalResetStatPoints: real arithmetic on real ProgressionConfigItem values', () => {
    expect(totalResetStatPoints({ tier: 'AL0', resetPointsPerReset: 450, resetCount: 20 })).toBe(9000)
    expect(totalResetStatPoints({ tier: 'AL3', resetPointsPerReset: 500, resetCount: 20 })).toBe(10000)
    expect(totalResetStatPoints({ tier: 'AL0', resetPointsPerReset: 450, resetCount: 0 })).toBe(0)
  })

  it('estimateHoursFromKnownXpRate: real projection ONLY from caller-supplied, already-known rates', () => {
    const result = estimateHoursFromKnownXpRate({ xpPerKill: 100, killsPerHour: 600, xpNeeded: 600000 })
    expect(result.killsRequired).toBe(6000)
    expect(result.hours).toBe(10)
    expect(() => estimateHoursFromKnownXpRate({ xpPerKill: 0, killsPerHour: 600, xpNeeded: 1000 })).toThrow(RangeError)
  })

  it('SIMULATOR_REFUSES_AUTHORITATIVE_OUTPUT_WITH_UNKNOWN_FORMULA: deriving XP from tier + monster level alone always refuses, never fabricates a number', () => {
    expect(() => estimateXpFromFormula('AL0', 60)).toThrow(XpFormulaUnknownError)
    expect(() => estimateXpFromFormula('AL3', 400)).toThrow(/XP_FORMULA_UNKNOWN/)
  })
})
