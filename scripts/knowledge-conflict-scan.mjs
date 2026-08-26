#!/usr/bin/env node
// Knowledge Sweep tooling (Part AG) -- systematic pairwise scan of
// knowledge/vendor-sweep/atomic-claims.json for potential conflicts: claims
// that share an entity but disagree on verificationStatus or bloodMoonStatus.
// Read-only, prints candidates for human triage -- does NOT auto-resolve
// anything or write to knowledge-conflicts.json itself.
//
// Usage: node scripts/knowledge-conflict-scan.mjs [--json]
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const CLAIMS_PATH = join(process.cwd(), 'knowledge', 'vendor-sweep', 'atomic-claims.json')
const CONFLICTS_PATH = join(process.cwd(), 'knowledge', 'vendor-sweep', 'knowledge-conflicts.json')

// verificationStatus values that actively disagree with each other when
// applied to the same entity (a CONFIRMED next to an UNVERIFIED is not a
// conflict -- it's just incomplete information; CONFIRMED next to
// CONTRADICTED on the same entity/topic IS worth a human look).
const OPPOSING_VERIFICATION = new Set([
  'CONFIRMED_BY_CONFIG:CONTRADICTED_BY_CONFIG',
  'CONFIRMED_BY_SCHEMA:CONTRADICTED_BY_SCHEMA',
  'CONFIRMED_BY_RUNTIME:CONTRADICTED_BY_RUNTIME',
])
const OPPOSING_BLOODMOON = new Set([
  'BLOODMOON_CONFIRMED:BLOODMOON_CONTRADICTED',
  'BLOODMOON_CONFIRMED:OTHER_SERVER',
  'BLOODMOON_CONFIRMED:LEGACY',
])

function pairKey(a, b) {
  return [a, b].sort().join(':')
}

function main() {
  const asJson = process.argv.includes('--json')
  const { claims } = JSON.parse(readFileSync(CLAIMS_PATH, 'utf8'))
  const knownConflictIds = new Set()
  try {
    const { conflicts } = JSON.parse(readFileSync(CONFLICTS_PATH, 'utf8'))
    for (const c of conflicts) {
      knownConflictIds.add(pairKey(c.claimA.claimId, c.claimB.claimId))
    }
  } catch { /* no conflicts file yet, fine */ }

  // group claims by shared entity (case-insensitive)
  const byEntity = new Map()
  for (const c of claims) {
    for (const e of c.entities || []) {
      const key = e.toLowerCase()
      if (!byEntity.has(key)) byEntity.set(key, [])
      byEntity.get(key).push(c)
    }
  }

  const candidates = []
  for (const [entity, group] of byEntity) {
    if (group.length < 2) continue
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i], b = group[j]
        if (a.claimId === b.claimId) continue
        const vKey = pairKey(a.verificationStatus, b.verificationStatus)
        const bKey = pairKey(a.bloodMoonStatus, b.bloodMoonStatus)
        const isOpposing = OPPOSING_VERIFICATION.has(vKey) || OPPOSING_BLOODMOON.has(bKey)
        if (!isOpposing) continue
        const already = knownConflictIds.has(pairKey(a.claimId, b.claimId))
        candidates.push({
          entity, claimA: a.claimId, claimB: b.claimId,
          verificationA: a.verificationStatus, verificationB: b.verificationStatus,
          bloodMoonA: a.bloodMoonStatus, bloodMoonB: b.bloodMoonStatus,
          statementA: a.statement, statementB: b.statement,
          alreadyTrackedInConflictsFile: already,
        })
      }
    }
  }

  if (asJson) {
    process.stdout.write(JSON.stringify({ generatedAt: new Date().toISOString(), candidateCount: candidates.length, candidates }, null, 2) + '\n')
    return
  }

  console.log(`Claim conflict scan -- ${claims.length} claims, ${candidates.length} potential conflict candidate(s)\n`)
  if (candidates.length === 0) {
    console.log('No opposing verificationStatus/bloodMoonStatus pairs found among claims sharing an entity.')
    return
  }
  for (const c of candidates) {
    const flag = c.alreadyTrackedInConflictsFile ? '(already tracked)' : '(NOT tracked -- review)'
    console.log(`Entity "${c.entity}": ${c.claimA} vs ${c.claimB} ${flag}`)
    console.log(`  ${c.claimA}: ${c.verificationA} / ${c.bloodMoonA}`)
    console.log(`  ${c.claimB}: ${c.verificationB} / ${c.bloodMoonB}`)
  }
}

main()
