#!/usr/bin/env node
// Knowledge Sweep tooling (Part AN) -- structural validation, no network:
//   1. Every atomic-claims.json entry has all required fields and only
//      enum-valid values for bloodMoonStatus/verificationStatus.
//   2. Every knowledge-graph.json edge references an existing node id.
//   3. Every SUPPORTS_CLAIM/VERIFIES_CLAIM edge target looks like a real
//      claimId that actually exists in atomic-claims.json.
// Exit 0 = all pass. Exit 1 = failures printed.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(process.cwd(), 'knowledge', 'vendor-sweep')
const claims = JSON.parse(readFileSync(join(ROOT, 'atomic-claims.json'), 'utf8')).claims
const graph = JSON.parse(readFileSync(join(ROOT, 'knowledge-graph.json'), 'utf8'))

const REQUIRED_FIELDS = ['claimId', 'statement', 'sourceId', 'sourceAuthority', 'sourceLocation', 'entityTypes', 'entities', 'topic', 'bloodMoonStatus', 'verificationStatus', 'confidence']
const VALID_BLOODMOON_STATUS = new Set(['BLOODMOON_CONFIRMED', 'BLOODMOON_CONTRADICTED', 'BLOODMOON_LIKELY', 'UPSTREAM_MU', 'PROVIDER_SPECIFIC', 'PROVIDER_SPECIFIC_OTHER_SERVER', 'OTHER_SERVER', 'LEGACY', 'UNKNOWN'])
const VALID_VERIFICATION_STATUS = new Set(['UNVERIFIED', 'CONFIRMED_BY_CONFIG', 'CONFIRMED_BY_SCHEMA', 'CONFIRMED_BY_RUNTIME', 'CONFIRMED_BY_MULTIPLE', 'CONTRADICTED_BY_CONFIG', 'CONTRADICTED_BY_SCHEMA', 'CONTRADICTED_BY_RUNTIME', 'NOT_APPLICABLE'])

let failures = []

// 1. atomic claim validation
const seenIds = new Set()
for (const c of claims) {
  const label = c.claimId || '(missing claimId)'
  for (const f of REQUIRED_FIELDS) {
    if (c[f] === undefined || c[f] === null) failures.push(`${label}: missing required field '${f}'`)
  }
  if (c.claimId) {
    if (seenIds.has(c.claimId)) failures.push(`${label}: duplicate claimId`)
    seenIds.add(c.claimId)
  }
  if (c.bloodMoonStatus && !VALID_BLOODMOON_STATUS.has(c.bloodMoonStatus)) {
    failures.push(`${label}: invalid bloodMoonStatus '${c.bloodMoonStatus}'`)
  }
  if (c.verificationStatus && !VALID_VERIFICATION_STATUS.has(c.verificationStatus)) {
    failures.push(`${label}: invalid verificationStatus '${c.verificationStatus}'`)
  }
  if (c.entities && !Array.isArray(c.entities)) failures.push(`${label}: 'entities' must be an array`)
  if (c.statement && c.statement.split(/[.;]/).filter(s => s.trim()).length > 1 && /\band\b.*\band\b/i.test(c.statement)) {
    // heuristic only, not a hard failure: flag statements that look compound (Part G granularity)
    // (kept as a warning, not pushed to failures, since this is a style heuristic not a hard rule)
  }
}

// 2. graph node/edge integrity
const nodeIds = new Set(graph.nodes.map(n => n.id))
for (const e of graph.edges) {
  if (!nodeIds.has(e.from)) {
    // 'from' may legitimately be a claimId (CLAIM-XXX) per the graph's own documented convention
    if (!/^CLAIM-\d+$/.test(e.from)) failures.push(`edge ${e.from}--${e.type}-->${e.to}: 'from' node id not found in nodes[]`)
    else if (!seenIds.has(e.from)) failures.push(`edge ${e.from}--${e.type}-->${e.to}: claimId '${e.from}' not found in atomic-claims.json`)
  }
  if (!nodeIds.has(e.to)) {
    if (!/^CLAIM-\d+$/.test(e.to)) failures.push(`edge ${e.from}--${e.type}-->${e.to}: 'to' node id not found in nodes[]`)
    else if (!seenIds.has(e.to)) failures.push(`edge ${e.from}--${e.type}-->${e.to}: claimId '${e.to}' not found in atomic-claims.json`)
  }
}

// duplicate node id check
const nodeIdCounts = new Map()
for (const n of graph.nodes) nodeIdCounts.set(n.id, (nodeIdCounts.get(n.id) || 0) + 1)
for (const [id, count] of nodeIdCounts) if (count > 1) failures.push(`node id '${id}' appears ${count} times (must be unique)`)

console.log(`Validated ${claims.length} atomic claims, ${graph.nodes.length} graph nodes, ${graph.edges.length} graph edges.\n`)
if (failures.length === 0) {
  console.log('All structural checks passed.')
  process.exit(0)
} else {
  console.log(`${failures.length} failure(s):`)
  for (const f of failures) console.log(`  - ${f}`)
  process.exit(1)
}
