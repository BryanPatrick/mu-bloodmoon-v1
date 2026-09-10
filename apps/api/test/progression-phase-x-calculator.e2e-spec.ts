import * as fs from 'fs'
import * as path from 'path'
import {
  XP_MODIFIER_CATALOG,
  validateModifierSelection,
  computeEffectiveMultiplier,
  XpStackFormulaUnknownError,
  bestCaseStack,
  spawnCapacityPerHour,
  RespawnTimeUnknownError,
  estimateXpPerHour,
  LevelCurveUnavailableProvider
} from '../src/modules/progression/progression-calculator'

// PHASE X (2026-09-04) -- XP stack + progression calculator foundation
// (Part 31). No database, no app bootstrap -- named *.e2e-spec.ts only to
// match this project's existing jest-e2e.json testRegex.

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..')

describe('Phase X -- base server rate representation', () => {
  it('BASE_SERVER_RATE_50X: the calculator catalog and the inventory doc both represent the base rate as 50x, separate from the account-level VIP config value', () => {
    const base = XP_MODIFIER_CATALOG.find((m) => m.id === 'base_server_rate')
    expect(base?.rawValue).toBe('50x')
    expect(base?.group).toBe('BASE_SERVER_RATE')
    const accountLevel = XP_MODIFIER_CATALOG.find((m) => m.id === 'account_level_vip')
    expect(accountLevel?.group).toBe('ACCOUNT_LEVEL_VIP')
    expect(accountLevel?.rawValue).not.toBe('50x')

    const doc = fs.readFileSync(path.join(REPO_ROOT, 'docs', 'progression', 'xp-stack-inventory.md'), 'utf-8')
    expect(doc).toMatch(/BASE_SERVER_RATE = 50x/)
    expect(doc).toMatch(/CAN_CALL_BASE_SERVER_50X = YES/)
    expect(doc).toMatch(/CAN_CLAIM_EFFECTIVE_XP_WITH_ALL_BONUSES = NO/)
  })
})

describe('Phase X -- XP modifier extraction + compatibility', () => {
  it('XP_MODIFIER_EXTRACTION_DETERMINISTIC: the committed dataset has a stable, real shape matching the calculator catalog', () => {
    const dataset = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'docs', 'progression', 'xp-modifier-dataset.json'), 'utf-8'))
    expect(dataset.itemModifiers.length).toBeGreaterThan(0)
    expect(dataset.modifierGroups.length).toBeGreaterThan(0)
    expect(dataset.compatibilityMatrix.length).toBeGreaterThan(0)
    // Every real Effect.txt item modifier in the dataset has a calculator-catalog counterpart
    for (const row of dataset.itemModifiers) {
      const match = XP_MODIFIER_CATALOG.find((m) => m.name.startsWith(row.name))
      expect(match).toBeDefined()
    }
  })

  it('XP_COMPATIBILITY_MATRIX_PRESERVES_UNKNOWN: coexistence is proven only via real Effect.txt Group data, numeric combination is never asserted', () => {
    const dataset = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'docs', 'progression', 'xp-modifier-dataset.json'), 'utf-8'))
    for (const row of dataset.compatibilityMatrix) {
      expect(['YES', 'NO']).toContain(row.canCoexist)
      if (row.canCoexist === 'YES') {
        expect(row.stackBehavior).toMatch(/UNKNOWN|DIFFERENT_GROUPS/)
      } else {
        expect(row.stackBehavior).toMatch(/MUTUALLY_EXCLUSIVE/)
      }
    }
  })

  it('IMPOSSIBLE_MODIFIER_COMBINATION_REJECTED: two modifiers sharing a real Effect.txt Group are rejected, different groups are accepted', () => {
    const sameGroup = validateModifierSelection(['seal_of_ascension', 'master_seal_of_ascension'])
    expect(sameGroup.valid).toBe(false)
    if (!sameGroup.valid) {
      expect(sameGroup.conflicts.length).toBe(1)
      expect(sameGroup.conflicts[0].stackGroupKey).toBe('EFFECT_GROUP_60')
    }

    const differentGroups = validateModifierSelection(['seal_of_ascension', 'talisman_of_ascension_1', 'party_experience_bonus_item'])
    expect(differentGroups.valid).toBe(true)
  })
})

describe('Phase X -- best-case stack + refusal to fabricate a combined percentage', () => {
  it('UNKNOWN_STACK_PREVENTS_AUTHORITATIVE_EFFECTIVE_XP: combining any modifier selection always refuses rather than computing a number', () => {
    expect(() => computeEffectiveMultiplier(['base_server_rate', 'account_level_vip'])).toThrow(XpStackFormulaUnknownError)
    expect(() => computeEffectiveMultiplier([])).toThrow(/XP_STACK_FORMULA_UNKNOWN/)
  })

  it('MAX_CONFIRMED_STACK_EXCLUDES_UNKNOWN_RELATIONSHIPS: the confirmed stack never includes two modifiers from the same Effect.txt Group, and never claims a resulting percentage', () => {
    const result = bestCaseStack()
    const confirmedIds = result.maximumConfirmedStack.modifierIds
    const confirmedModifiers = confirmedIds.map((id) => XP_MODIFIER_CATALOG.find((m) => m.id === id)!)
    const groupKeys = confirmedModifiers.map((m) => m.stackGroupKey).filter((k): k is string => Boolean(k))
    expect(new Set(groupKeys).size).toBe(groupKeys.length) // no duplicate group keys
    expect(result.maximumConfirmedStack.note).toMatch(/NOT CALCULABLE/)
    // the unverified stack is a strict superset (includes inactive mechanisms like pet XP)
    expect(result.maximumPossibleButUnverifiedStack.modifierIds.length).toBeGreaterThanOrEqual(confirmedIds.length)
    expect(result.maximumPossibleButUnverifiedStack.modifierIds).toContain('pet_experience')
  })
})

describe('Phase X -- spot dataset', () => {
  const dataset = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'docs', 'progression', 'spot-dataset.json'), 'utf-8'))

  it('SPOT_MONSTER_COUNT_DETERMINISTIC: total spots and total monsters match the committed, real dataset', () => {
    expect(dataset.totalSpots).toBe(58)
    expect(dataset.totalMapsWithSpotData).toBe(15)
    expect(dataset.totalMonstersInSpots).toBe(407)
    expect(dataset.spots.length).toBe(58)
  })

  it('SPOT_DATASET_NO_ROW_LOSS: summing every spot\'s monsterCount reproduces the dataset-level total exactly', () => {
    const sum = dataset.spots.reduce((acc: number, s: { monsterCount: number }) => acc + s.monsterCount, 0)
    expect(sum).toBe(dataset.totalMonstersInSpots)
  })

  it('SPAWN_CAPACITY_MATH: refuses without a confirmed respawn time, computes correctly once one is supplied', () => {
    expect(() => spawnCapacityPerHour({ spotMonsterCount: 61, confirmedRespawnSeconds: null })).toThrow(RespawnTimeUnknownError)
    const result = spawnCapacityPerHour({ spotMonsterCount: 10, confirmedRespawnSeconds: 10 })
    expect(result.spawnCapacityPerHour).toBe(3600)
  })
})

describe('Phase X -- player kill speed + level curve refusals (no false precision)', () => {
  it('estimateXpPerHour requires real, caller-supplied inputs, never derives them itself', () => {
    expect(() => estimateXpPerHour({ xpPerKill: 0, killsPerHour: 100 })).toThrow(RangeError)
    expect(estimateXpPerHour({ xpPerKill: 50, killsPerHour: 600 }).xpPerHour).toBe(30000)
  })

  it('LevelCurveUnavailableProvider refuses rather than guessing a formula', () => {
    const provider = new LevelCurveUnavailableProvider()
    expect(() => provider.xpRequiredForLevel(100)).toThrow(/LEVEL_CURVE_UNKNOWN/)
  })
})
