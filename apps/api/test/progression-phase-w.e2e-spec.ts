import * as fs from 'fs'
import * as path from 'path'
import { totalResetStatPoints, cadenceFromResetsPerWeek } from '../src/modules/progression/progression-simulator'

// PHASE W (2026-09-04) -- OR-023 forensics + balance-input tests (Part 22).
// No database, no app bootstrap -- named *.e2e-spec.ts only to match this
// project's existing jest-e2e.json testRegex (apps/api has no separate
// unit-test jest config).

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..')
const OR023_DATASET_PATH = path.join(REPO_ROOT, 'docs', 'drop', 'or-023-diff-dataset.json')
const OR023_FORENSICS_DOC_PATH = path.join(REPO_ROOT, 'docs', 'drop', 'or-023-forensics.md')
const VENDOR_PACKAGE_PT_BR_PATH = path.join(REPO_ROOT, 'docs', 'progression', 'xp-vendor-package-pt-br.md')

type Or023Dataset = {
  mapDiffs: Array<{
    index: number
    name: string
    itemDropRate: { before: number; after: number }
    excItemDropRate: { before: number; after: number }
    setItemDropRate: { before: number; after: number }
  }>
  mapDiffCount: number
  bossReverts: Array<{ index: number; name: string; itemRate: { before: number; after: number } }>
  bossRevertCount: number
  monstersStillAtSentinel: number
  newMonsters: Array<{ index: number; name: string; level: number }>
}

function loadDataset(): Or023Dataset {
  return JSON.parse(fs.readFileSync(OR023_DATASET_PATH, 'utf-8'))
}

describe('Phase W -- OR-023 drop-diff dataset (deterministic, committed, real values)', () => {
  it('DROP_DIFF_EXTRACTION_DETERMINISTIC: the committed dataset has a stable, real shape', () => {
    const dataset = loadDataset()
    expect(dataset.mapDiffCount).toBe(dataset.mapDiffs.length)
    expect(dataset.bossRevertCount).toBe(dataset.bossReverts.length)
    expect(dataset.mapDiffs.length).toBeGreaterThan(0)
    expect(dataset.bossReverts.length).toBeGreaterThan(0)
  })

  it('ALL_67_MAPS_ACCOUNTED_FOR: every map diff is a uniform ItemDropRate 100->0, ExcItemDropRate 1000->100 change', () => {
    const dataset = loadDataset()
    expect(dataset.mapDiffs.length).toBe(67)
    const uniqueIndexes = new Set(dataset.mapDiffs.map((m) => m.index))
    expect(uniqueIndexes.size).toBe(67)
    for (const map of dataset.mapDiffs) {
      expect(map.itemDropRate.before).toBe(100)
      expect(map.itemDropRate.after).toBe(0)
      expect(map.excItemDropRate.before).toBe(1000)
      expect(map.excItemDropRate.after).toBe(100)
    }
  })

  it('CHANGED_BOSSES_ACCOUNTED_FOR: exactly 10 named monsters reverted from the 999999999 sentinel, 214 remain at it', () => {
    const dataset = loadDataset()
    expect(dataset.bossReverts.length).toBe(10)
    const uniqueBossIndexes = new Set(dataset.bossReverts.map((b) => b.index))
    expect(uniqueBossIndexes.size).toBe(10)
    for (const boss of dataset.bossReverts) {
      expect(boss.itemRate.before).toBe(999999999)
      expect(boss.itemRate.after).not.toBe(999999999)
      expect(typeof boss.name).toBe('string')
      expect(boss.name.length).toBeGreaterThan(0)
    }
    expect(dataset.monstersStillAtSentinel).toBe(214)
    expect(dataset.newMonsters.length).toBe(4)
  })

  it('NO_AUTOMATIC_DROP_RESTORE: the forensics doc explicitly states no file was restored and no production write was made', () => {
    const doc = fs.readFileSync(OR023_FORENSICS_DOC_PATH, 'utf-8')
    expect(doc).toMatch(/No file was restored, no production write was made/)
    expect(doc).not.toMatch(/restore.*(button|endpoint|automatic)/i)
  })

  it('OR023_CLASSIFICATION_PRESERVES_UNKNOWN_INTENT: magnitude and proven impact are kept as separate, distinct fields', () => {
    const doc = fs.readFileSync(OR023_FORENSICS_DOC_PATH, 'utf-8')
    expect(doc).toMatch(/CONFIG_CHANGE_MAGNITUDE = HIGH/)
    expect(doc).toMatch(/PROVEN_PLAYER_IMPACT = UNKNOWN/)
    // the classification must never assert proven impact as a fact
    expect(doc).not.toMatch(/PROVEN_PLAYER_IMPACT = (HIGH|MEDIUM|LOW|CONFIRMED)/)
  })
})

describe('Phase W -- reset stat points + playtime arithmetic (real config values, no XP assumption)', () => {
  it('RESET_STAT_POINTS_TOTAL_AT_20: Free totals 9000, Bronze/Silver/Gold total 10000, using the real confirmed per-reset values', () => {
    expect(totalResetStatPoints({ tier: 'AL0', resetPointsPerReset: 450, resetCount: 20 })).toBe(9000)
    expect(totalResetStatPoints({ tier: 'AL1', resetPointsPerReset: 500, resetCount: 20 })).toBe(10000)
    expect(totalResetStatPoints({ tier: 'AL2', resetPointsPerReset: 500, resetCount: 20 })).toBe(10000)
    expect(totalResetStatPoints({ tier: 'AL3', resetPointsPerReset: 500, resetCount: 20 })).toBe(10000)
    // Current effective (unsynced) Gold cap of 50 -- shows the much larger current gap
    expect(totalResetStatPoints({ tier: 'AL3', resetPointsPerReset: 500, resetCount: 50 })).toBe(25000)
  })

  it('PLAYTIME_SCENARIO_MATH: CASUAL/REGULAR/HARDCORE hours/week and hours/reset are pure, correct arithmetic', () => {
    const scenarios = [
      { hoursPerDay: 1, expectedHoursPerWeek: 7 },
      { hoursPerDay: 2, expectedHoursPerWeek: 14 },
      { hoursPerDay: 4, expectedHoursPerWeek: 28 }
    ]
    for (const s of scenarios) {
      const hoursPerWeek = s.hoursPerDay * 7
      expect(hoursPerWeek).toBe(s.expectedHoursPerWeek)
      const at2PerWeek = hoursPerWeek / cadenceFromResetsPerWeek({ resetsPerWeek: 2 }).resetsPerWeek
      const at3PerWeek = hoursPerWeek / cadenceFromResetsPerWeek({ resetsPerWeek: 3 }).resetsPerWeek
      expect(at2PerWeek).toBeCloseTo(hoursPerWeek / 2, 5)
      expect(at3PerWeek).toBeCloseTo(hoursPerWeek / 3, 5)
    }
  })
})

describe('Phase W -- VIP final-power matrix + vendor package (static content checks)', () => {
  it('VIP_FINAL_POWER_MATRIX_DETERMINISTIC: the balance doc classifies reset.stat_points as FINAL_POWER_ADVANTAGE and xp.rate as ACCELERATION_ONLY', () => {
    const doc = fs.readFileSync(
      path.join(REPO_ROOT, 'docs', 'progression', 'balance-inputs-playtime-and-vip-power.md'),
      'utf-8'
    )
    expect(doc).toMatch(/\*\*`reset\.stat_points`\*\*.*\|\s*\*\*`FINAL_POWER_ADVANTAGE`\*\*/)
    expect(doc).toMatch(/`xp\.rate`.*`ACCELERATION_ONLY`/)
    expect(doc).toMatch(/GAP_UNDER_APPROVED_POLICY = Free vs Bronze\/Silver\/Gold: 1,000 points/)
  })

  it('VENDOR_PACKAGE_HAS_ALL_REQUIRED_QUESTIONS: the PT-BR vendor package covers all 8 required technical questions and is marked not sent', () => {
    const doc = fs.readFileSync(VENDOR_PACKAGE_PT_BR_PATH, 'utf-8')
    for (let i = 1; i <= 8; i++) {
      expect(doc).toMatch(new RegExp(`\\*\\*${i}\\.`))
    }
    expect(doc).toMatch(/AddExperienceRate_AL0-3/)
    expect(doc).toMatch(/ExperienceMultiplierConstA/)
    expect(doc).toMatch(/ExperienceMultiplierConstB/)
    expect(doc).toMatch(/AddMasterExperienceRate_AL0-3/)
    expect(doc).toMatch(/ExperienceRandomAditional/)
    expect(doc).toMatch(/ExperienceTable\.txt/)
    expect(doc).toMatch(/SENT = NO/)
  })
})
