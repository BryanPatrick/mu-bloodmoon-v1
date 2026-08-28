#!/usr/bin/env node
// Knowledge Phase 8 -- validates knowledge/vendor-sweep/beta-readiness/event-registry.json
// structurally and derives the coverage metrics (enabled/disabled/unknown,
// player-facing status, chain completeness) mechanically from the registry's
// own fields, rather than hand-counting -- same "derive, don't hand-maintain"
// convention as the rest of this project's knowledge-*.mjs tooling.
//
// Usage: node scripts/knowledge-event-registry-report.mjs
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(process.cwd(), 'knowledge', 'vendor-sweep')
const registry = JSON.parse(readFileSync(join(ROOT, 'beta-readiness', 'event-registry.json'), 'utf8'))
const claimsDoc = JSON.parse(readFileSync(join(ROOT, 'atomic-claims.json'), 'utf8'))
const claimIds = new Set(claimsDoc.claims.map((c) => c.claimId))

const ENABLED_STATUS_VALUES = new Set(['ACTIVE', 'DISABLED', 'ENGINE_PRESENT', 'UNKNOWN'])
const ENTRY_METHOD_VALUES = new Set(['PARTICIPAR', 'NPC_CLICK', 'GM_OPEN_ONLY', 'UNKNOWN'])
const PLAYER_FACING_VALUES = new Set(['PLAYER_READY', 'PARTIAL', 'INTERNAL_ONLY'])
const PUBLICATION_SAFETY_VALUES = new Set(['ACTIVE_SAFE_TO_DESCRIBE_AS_LIVE', 'DISABLED_MUST_LABEL_UNAVAILABLE'])
const REQUIRED_FIELDS = Object.keys(registry.schema).filter((k) => k !== 'schema')

let errors = []

for (const e of registry.events) {
  const name = e.canonicalName || '(unnamed)'
  for (const field of REQUIRED_FIELDS) {
    if (!(field in e)) errors.push(`${name}: missing field '${field}'`)
  }
  if (!ENABLED_STATUS_VALUES.has(e.enabledStatus)) errors.push(`${name}: invalid enabledStatus '${e.enabledStatus}'`)
  if (!ENTRY_METHOD_VALUES.has(e.entryMethod)) errors.push(`${name}: invalid entryMethod '${e.entryMethod}'`)
  if (!PLAYER_FACING_VALUES.has(e.playerFacingStatus)) errors.push(`${name}: invalid playerFacingStatus '${e.playerFacingStatus}'`)
  if (!PUBLICATION_SAFETY_VALUES.has(e.publicationSafety)) errors.push(`${name}: invalid publicationSafety '${e.publicationSafety}'`)
  // Player safety invariant (Part K): a DISABLED or UNKNOWN event must never
  // be marked as safe to describe as live, and must never be PLAYER_READY.
  // ENGINE_PRESENT (an always-on base-MU feature never individually toggled,
  // e.g. the 4 castle events) is a legitimate exception to this alongside
  // ACTIVE -- it is DISABLED and UNKNOWN specifically that must never be
  // described as live.
  if (
    (e.enabledStatus === 'DISABLED' || e.enabledStatus === 'UNKNOWN') &&
    e.publicationSafety === 'ACTIVE_SAFE_TO_DESCRIBE_AS_LIVE'
  ) {
    errors.push(`${name}: enabledStatus=${e.enabledStatus} but publicationSafety claims safe-to-describe-as-live`)
  }
  if (e.enabledStatus === 'DISABLED' && e.playerFacingStatus === 'PLAYER_READY') {
    errors.push(`${name}: DISABLED event marked PLAYER_READY -- must not present disabled content as available`)
  }
  for (const ref of e.claimRefs || []) {
    if (!claimIds.has(ref)) errors.push(`${name}: claimRef ${ref} does not exist in atomic-claims.json`)
  }
}

if (errors.length) {
  console.log(`${errors.length} validation error(s):`)
  for (const e of errors) console.log('  - ' + e)
  process.exit(1)
}

// Derive coverage metrics
const isKnown = (v) => v !== undefined && v !== null && v !== 'UNKNOWN' && !String(v).startsWith('UNKNOWN')
function chainTier(e) {
  const entry = isKnown(e.entryMethod)
  const requirements =
    isKnown(e.levelRequirement) ||
    isKnown(e.resetRequirement) ||
    isKnown(e.masterResetRequirement) ||
    isKnown(e.requiredItems) ||
    isKnown(e.currencyCost)
  const map = isKnown(e.mapId) || isKnown(e.mapName)
  const mechanic = isKnown(e.scoring) || isKnown(e.winCondition)
  const reward = isKnown(e.reward)
  const count = [entry, requirements, map, mechanic, reward].filter(Boolean).length
  if (count >= 5) return 'FULL_CHAIN'
  if (count >= 3) return 'PARTIAL_CHAIN'
  return 'MINIMAL_CHAIN'
}

const byEnabled = {}
const byPlayerFacing = {}
const byChain = {}
for (const e of registry.events) {
  byEnabled[e.enabledStatus] = (byEnabled[e.enabledStatus] || 0) + 1
  byPlayerFacing[e.playerFacingStatus] = (byPlayerFacing[e.playerFacingStatus] || 0) + 1
  const tier = chainTier(e)
  byChain[tier] = (byChain[tier] || 0) + 1
}

console.log(`Validated ${registry.events.length} events in event-registry.json against ${claimsDoc.claims.length} atomic claims.`)
console.log('All structural checks passed.\n')
console.log('EVENTS_TOTAL =', registry.events.length)
console.log('EVENTS_ACTIVE =', byEnabled.ACTIVE || 0)
console.log('EVENTS_DISABLED =', byEnabled.DISABLED || 0)
console.log('EVENTS_ENGINE_PRESENT =', byEnabled.ENGINE_PRESENT || 0)
console.log('EVENTS_UNKNOWN =', byEnabled.UNKNOWN || 0)
console.log('PLAYER_READY =', byPlayerFacing.PLAYER_READY || 0)
console.log('PARTIAL =', byPlayerFacing.PARTIAL || 0)
console.log('INTERNAL_ONLY =', byPlayerFacing.INTERNAL_ONLY || 0)
console.log('FULL_CHAIN =', byChain.FULL_CHAIN || 0)
console.log('PARTIAL_CHAIN =', byChain.PARTIAL_CHAIN || 0)
console.log('MINIMAL_CHAIN =', byChain.MINIMAL_CHAIN || 0)
