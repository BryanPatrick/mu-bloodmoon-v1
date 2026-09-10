// PHASE X (2026-09-04) -- Progression calculator domain foundation
// (Parts 19-23, 30). Same discipline as progression-simulator.ts: real
// arithmetic only on real, known/caller-supplied numbers; every unproven
// combination throws a named error instead of fabricating a result.
// See docs/progression/xp-stack-inventory.md and
// docs/progression/spot-dataset-analysis.md for the evidence this file
// encodes.

export type XpModifierGroup =
  | 'BASE_SERVER_RATE'
  | 'ACCOUNT_LEVEL_VIP'
  | 'MAP'
  | 'PARTY'
  | 'EVENT'
  | 'QUEST'
  | 'SEAL'
  | 'BUFF'
  | 'PET'
  | 'RANDOM_BONUS'

// Effect.txt's own "Group" column (Effect.htm, CONFIRMED_VENDOR_DOC:
// "so um efeito ativo por grupo") -- null means this modifier is a
// Common.dat/MapManager.txt config rate, not an Effect.txt timed item,
// and has no proven exclusion with anything else.
export type XpModifier = {
  id: string
  group: XpModifierGroup
  name: string
  rawValue: string
  stackGroupKey: string | null
  confidence: 'CONFIRMED' | 'PARTIAL'
  active: boolean // whether this mechanism currently has real, non-empty production config
}

// Real, current production catalog -- see docs/progression/xp-modifier-dataset.json
// for the full extraction this mirrors.
export const XP_MODIFIER_CATALOG: XpModifier[] = [
  { id: 'base_server_rate', group: 'BASE_SERVER_RATE', name: 'Base server rate (50x)', rawValue: '50x', stackGroupKey: null, confidence: 'CONFIRMED', active: true },
  { id: 'account_level_vip', group: 'ACCOUNT_LEVEL_VIP', name: 'AddExperienceRate_AL0-3', rawValue: '50/60/60/60', stackGroupKey: null, confidence: 'CONFIRMED', active: true },
  { id: 'map_rate', group: 'MAP', name: 'MapManager.txt ExperienceRate', rawValue: '100 (all 67 maps)', stackGroupKey: null, confidence: 'CONFIRMED', active: true },
  { id: 'party_rate', group: 'PARTY', name: 'PartyGeneralExperience1-7 / PartySpecialExperience1-7', rawValue: '100/75/80/80/80/80/80', stackGroupKey: null, confidence: 'CONFIRMED', active: true },
  { id: 'event_rate', group: 'EVENT', name: 'AddEventExperienceRate_AL0-3', rawValue: '300', stackGroupKey: null, confidence: 'CONFIRMED', active: true },
  { id: 'event_bonus_manager', group: 'EVENT', name: 'BonusManager.dat scheduled EXP% bonus', rawValue: '100/100/100/100 (map 33 only, monster level 110-130)', stackGroupKey: null, confidence: 'PARTIAL', active: true },
  { id: 'quest_rate', group: 'QUEST', name: 'AddQuestExperienceRate_AL0-3', rawValue: '100', stackGroupKey: null, confidence: 'CONFIRMED', active: true },
  { id: 'seal_of_ascension', group: 'SEAL', name: 'Seal of Ascension (item 6699)', rawValue: '50', stackGroupKey: 'EFFECT_GROUP_60', confidence: 'CONFIRMED', active: true },
  { id: 'seal_of_ascension_strong', group: 'SEAL', name: 'Seal of Ascension, stronger variant (item 6836)', rawValue: '100', stackGroupKey: 'EFFECT_GROUP_60', confidence: 'CONFIRMED', active: true },
  { id: 'master_seal_of_ascension', group: 'SEAL', name: 'Master Seal of Ascension (item 6749)', rawValue: '50', stackGroupKey: 'EFFECT_GROUP_60', confidence: 'CONFIRMED', active: true },
  { id: 'master_seal_of_ascension_strong', group: 'SEAL', name: 'Master Seal of Ascension, stronger variant (item 6837)', rawValue: '100', stackGroupKey: 'EFFECT_GROUP_60', confidence: 'CONFIRMED', active: true },
  { id: 'talisman_of_ascension_1', group: 'BUFF', name: 'Talisman of Ascension 1 (item 6833)', rawValue: '50', stackGroupKey: 'EFFECT_GROUP_115', confidence: 'CONFIRMED', active: true },
  { id: 'talisman_of_ascension_2', group: 'BUFF', name: 'Talisman of Ascension 2 (item 6834)', rawValue: '100', stackGroupKey: 'EFFECT_GROUP_115', confidence: 'CONFIRMED', active: true },
  { id: 'talisman_of_ascension_3', group: 'BUFF', name: 'Talisman of Ascension 3 (item 6835)', rawValue: '200', stackGroupKey: 'EFFECT_GROUP_115', confidence: 'CONFIRMED', active: true },
  { id: 'party_experience_bonus_item', group: 'BUFF', name: 'Party Experience Bonus (item 6759)', rawValue: '90/10', stackGroupKey: 'EFFECT_GROUP_24', confidence: 'CONFIRMED', active: true },
  { id: 'pet_experience', group: 'PET', name: 'CustomPet.txt IncExperience/IncMasterExperience', rawValue: 'mechanism exists, no pet currently configured', stackGroupKey: null, confidence: 'CONFIRMED', active: false },
  { id: 'random_bonus', group: 'RANDOM_BONUS', name: 'ExperienceRandomAditional', rawValue: '0 (inert)', stackGroupKey: null, confidence: 'CONFIRMED', active: true }
]

export class ImpossibleModifierCombinationError extends Error {
  constructor(public readonly conflicts: Array<{ a: string; b: string; stackGroupKey: string }>) {
    super(
      'IMPOSSIBLE_MODIFIER_COMBINATION -- one or more selected modifiers share a real ' +
      'Effect.txt Group and cannot be simultaneously active: ' +
      conflicts.map((c) => `${c.a} + ${c.b} (${c.stackGroupKey})`).join(', ')
    )
    this.name = 'ImpossibleModifierCombinationError'
  }
}

export type ModifierValidationResult =
  | { valid: true }
  | { valid: false; conflicts: Array<{ a: string; b: string; stackGroupKey: string }> }

// Part 21 -- reject impossible combinations where proven (same Effect.txt
// Group). Two modifiers with no stackGroupKey, or different
// stackGroupKeys, are never rejected here -- their real numeric
// interaction may still be unknown, but eligibility to be simultaneously
// active is not disproven.
export function validateModifierSelection(selectedIds: string[]): ModifierValidationResult {
  const selected = XP_MODIFIER_CATALOG.filter((m) => selectedIds.includes(m.id))
  const conflicts: Array<{ a: string; b: string; stackGroupKey: string }> = []
  for (let i = 0; i < selected.length; i++) {
    for (let j = i + 1; j < selected.length; j++) {
      const a = selected[i]
      const b = selected[j]
      if (a.stackGroupKey && a.stackGroupKey === b.stackGroupKey) {
        conflicts.push({ a: a.id, b: b.id, stackGroupKey: a.stackGroupKey })
      }
    }
  }
  return conflicts.length ? { valid: false, conflicts } : { valid: true }
}

export class XpStackFormulaUnknownError extends Error {
  constructor() {
    super(
      'XP_STACK_FORMULA_UNKNOWN -- cannot compute a combined effective XP ' +
      'percentage from multiple active modifiers. The Effect.txt Group ' +
      'mechanism proves which modifiers CAN be simultaneously active, not ' +
      'how their values combine (additive vs multiplicative, and in what ' +
      'order). See docs/progression/xp-stack-inventory.md Part 2.'
    )
    this.name = 'XpStackFormulaUnknownError'
  }
}

// Part 20's "Effective multiplier: KNOWN / PARTIAL / UNKNOWN" requirement
// -- this function's only job is to report that state honestly. It never
// returns a computed percentage.
export function computeEffectiveMultiplier(_selectedIds: string[]): never {
  throw new XpStackFormulaUnknownError()
}

export type BestCaseStackResult = {
  maximumConfirmedStack: { modifierIds: string[]; note: string }
  maximumPossibleButUnverifiedStack: { modifierIds: string[]; note: string }
}

// Part 22 -- "how high can effective XP go with everything compatible
// activated." Answers with the SET of simultaneously-active-eligible
// modifiers (real, group-collision-checked), never a computed percentage
// (see computeEffectiveMultiplier). MAXIMUM_CONFIRMED_STACK picks the
// single strongest item per stackGroupKey (since a weaker one is never
// preferable when only one per group can be active); config-based rates
// (no stackGroupKey) are always included since no exclusion was ever
// proven against them. MAXIMUM_POSSIBLE_BUT_UNVERIFIED_STACK additionally
// includes currently-inactive mechanisms (e.g. PET, since CustomPet.txt's
// mechanism is real but unpopulated) to show the theoretical ceiling if
// that mechanism were ever configured.
export function bestCaseStack(): BestCaseStackResult {
  const byGroupKey = new Map<string, XpModifier[]>()
  const ungrouped: XpModifier[] = []
  for (const m of XP_MODIFIER_CATALOG) {
    if (m.stackGroupKey) {
      const list = byGroupKey.get(m.stackGroupKey) ?? []
      list.push(m)
      byGroupKey.set(m.stackGroupKey, list)
    } else {
      ungrouped.push(m)
    }
  }

  const confirmedActive = [
    ...ungrouped.filter((m) => m.active),
    ...[...byGroupKey.values()].map((group) => {
      const activeMembers = group.filter((m) => m.active)
      const strongest = activeMembers.reduce((best, cur) => {
        const bestVal = Number(best.rawValue.split('/')[0]) || 0
        const curVal = Number(cur.rawValue.split('/')[0]) || 0
        return curVal > bestVal ? cur : best
      }, activeMembers[0])
      return strongest
    }).filter((m): m is XpModifier => Boolean(m))
  ]

  return {
    maximumConfirmedStack: {
      modifierIds: confirmedActive.map((m) => m.id),
      note: 'Every listed modifier is real, currently active in production config, ' +
        'and proven not to share an Effect.txt Group with any other listed ' +
        'modifier (at most one item per Group, the strongest active member ' +
        'chosen). The resulting COMBINED XP PERCENTAGE IS NOT CALCULABLE -- ' +
        'only the eligibility to be simultaneously active is confirmed.'
    },
    maximumPossibleButUnverifiedStack: {
      modifierIds: XP_MODIFIER_CATALOG.filter((m) => !m.stackGroupKey || true).map((m) => m.id).filter((id, i, arr) => arr.indexOf(id) === i),
      note: 'Includes every catalogued modifier, including currently-INACTIVE ' +
        'mechanisms (e.g. pet XP -- CustomPet.txt is empty today) and every ' +
        'variant within a shared Effect.txt Group (even though only one per ' +
        'Group can really be active). This is a theoretical upper bound on ' +
        'what COULD exist, not a real, currently-achievable loadout -- never ' +
        'present this list as something a player can actually stack today.'
    }
  }
}

export class RespawnTimeUnknownError extends Error {
  constructor() {
    super(
      'RESPAWN_TIME_UNKNOWN -- Monster.txt\'s RegenTime column exists but its ' +
      'semantic meaning (respawn interval vs. self-regen tick) is not vendor-' +
      'documented and was not assumed. Supply a confirmedRespawnSeconds value ' +
      'from a verified source to compute spawn capacity. See ' +
      'docs/progression/spot-dataset-analysis.md Part 16.'
    )
    this.name = 'RespawnTimeUnknownError'
  }
}

export type SpawnCapacityInput = { spotMonsterCount: number; confirmedRespawnSeconds: number | null }
export type SpawnCapacityResult = { spawnCapacityPerHour: number }

// Part 17 -- SPAWN_CAPACITY_PER_HOUR, explicitly distinct from player
// kills/hour. Refuses rather than guessing a respawn interval.
export function spawnCapacityPerHour(input: SpawnCapacityInput): SpawnCapacityResult {
  if (input.confirmedRespawnSeconds === null) throw new RespawnTimeUnknownError()
  if (!(input.spotMonsterCount > 0) || !(input.confirmedRespawnSeconds > 0)) {
    throw new RangeError('spotMonsterCount and confirmedRespawnSeconds must both be > 0')
  }
  return { spawnCapacityPerHour: input.spotMonsterCount * (3600 / input.confirmedRespawnSeconds) }
}

export type XpPerHourInput = { xpPerKill: number; killsPerHour: number }
export type XpPerHourResult = { xpPerHour: number }

// Part 18/19 -- real arithmetic on caller-supplied, already-known numbers
// only (xpPerKill and killsPerHour are both REQUIRES_USER_INPUT per this
// project's own evidence -- see docs/progression/xp-stack-inventory.md
// Part 6 and spot-dataset-analysis.md Part 18). Never derives either
// input itself.
export function estimateXpPerHour(input: XpPerHourInput): XpPerHourResult {
  if (!(input.xpPerKill > 0) || !(input.killsPerHour > 0)) {
    throw new RangeError('xpPerKill and killsPerHour must both be > 0')
  }
  return { xpPerHour: input.xpPerKill * input.killsPerHour }
}

// Part 7/8 -- level curve provider. No CONFIRMED Blood Moon curve exists
// (docs/progression/xp-stack-inventory.md Part 7/8). This interface lets
// a future, explicitly-sourced dataset be plugged in and clearly labeled
// -- the calculator never falls back to a guessed formula on its own.
export type LevelCurveSource = 'BLOOD_MOON_CONFIRMED' | 'EXTERNAL_REFERENCE_ONLY'

export interface LevelCurveProvider {
  readonly source: LevelCurveSource
  xpRequiredForLevel(level: number): number
}

export class LevelCurveUnavailableProvider implements LevelCurveProvider {
  readonly source: LevelCurveSource = 'BLOOD_MOON_CONFIRMED'
  xpRequiredForLevel(_level: number): number {
    throw new Error(
      'LEVEL_CURVE_UNKNOWN -- no confirmed Blood Moon level XP curve exists. ' +
      'Provide a LevelCurveProvider with source=EXTERNAL_REFERENCE_ONLY (an ' +
      'explicitly sourced, clearly labeled external table) to compute this.'
    )
  }
}
