#!/usr/bin/env node
// Knowledge Sweep tooling (Part AM) -- simple local search over the sweep's
// structured outputs (atomic-claims.json, knowledge-index.json,
// knowledge-graph.json, knowledge-conflicts.json, reference-gap-manifest.json,
// wiki_candidates/). Read-only. No network, no mutation.
//
// Usage:
//   node scripts/knowledge-query.mjs query "ItemDrop VIP"
//   node scripts/knowledge-query.mjs entity "CustomBotStore"
//   node scripts/knowledge-query.mjs entity map | monster | item | event | npc | system | config
//   node scripts/knowledge-query.mjs gaps
//   node scripts/knowledge-query.mjs conflicts
//   node scripts/knowledge-query.mjs unverified
//   node scripts/knowledge-query.mjs verified
//   node scripts/knowledge-query.mjs disabled-systems
//   node scripts/knowledge-query.mjs progression
//   node scripts/knowledge-query.mjs wiki-ready
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'

const ROOT = join(process.cwd(), 'knowledge', 'vendor-sweep')
const load = (name, fallback) => {
  const p = join(ROOT, name)
  if (!existsSync(p)) return fallback
  return JSON.parse(readFileSync(p, 'utf8'))
}

function cmdQuery(term) {
  if (!term) { console.error('Usage: knowledge-query.mjs query "<search term>"'); process.exit(1) }
  // tokenized AND search -- every word in the query must appear somewhere in
  // the haystack, not necessarily adjacent (so "ItemDrop VIP" matches text
  // containing both "ItemDrop.txt" and "VIP-tier", even though that exact
  // phrase never appears verbatim).
  const words = term.toLowerCase().split(/\s+/).filter(Boolean)
  const matchesAll = (haystack) => words.every(w => haystack.includes(w))
  const claims = load('atomic-claims.json', { claims: [] }).claims
  const index = load('knowledge-index.json', { entries: [] }).entries
  const hits = []
  for (const c of claims) {
    const haystack = [c.statement, ...(c.entities || []), c.topic].join(' ').toLowerCase()
    if (matchesAll(haystack)) hits.push({ type: 'claim', id: c.claimId, text: c.statement, verificationStatus: c.verificationStatus, bloodMoonStatus: c.bloodMoonStatus })
  }
  for (const e of index) {
    const haystack = [e.title, ...(e.entities || []), ...(e.tags || [])].join(' ').toLowerCase()
    if (matchesAll(haystack)) hits.push({ type: 'source', id: e.id, text: e.title, status: e.status })
  }
  console.log(`Query "${term}" -- ${hits.length} hit(s)\n`)
  for (const h of hits) {
    if (h.type === 'claim') console.log(`[claim ${h.id}] ${h.text}\n  verificationStatus=${h.verificationStatus} bloodMoonStatus=${h.bloodMoonStatus}`)
    else console.log(`[source ${h.id}] ${h.text}\n  status=${h.status}`)
  }
}

const ENTITY_TYPE_KEYWORDS = new Set(['map', 'monster', 'item', 'event', 'npc', 'system', 'config'])

function cmdEntity(name) {
  if (!name) { console.error('Usage: knowledge-query.mjs entity "<entity name>" | entity <map|monster|item|event|npc|system|config>'); process.exit(1) }
  if (ENTITY_TYPE_KEYWORDS.has(name.toLowerCase())) return cmdEntityOfType(name)
  const needle = name.toLowerCase()
  const claims = load('atomic-claims.json', { claims: [] }).claims
  const graph = load('knowledge-graph.json', { nodes: [], edges: [] })
  const matchingClaims = claims.filter(c => (c.entities || []).some(e => e.toLowerCase() === needle))
  const node = graph.nodes.find(n => n.name.toLowerCase() === needle)
  console.log(`Entity "${name}"\n`)
  if (node) {
    console.log(`Graph node: id=${node.id} type=${node.type} bloodMoonStatus=${node.bloodMoonStatus || 'n/a'}`)
    const edges = graph.edges.filter(e => e.from === node.id || e.to === node.id)
    for (const e of edges) console.log(`  ${e.from} --${e.type}--> ${e.to}`)
  } else {
    console.log('(not found as a graph node -- may only exist as a claim entity)')
  }
  console.log(`\n${matchingClaims.length} claim(s) about this entity:`)
  for (const c of matchingClaims) console.log(`  [${c.claimId}] ${c.statement} (${c.verificationStatus})`)
}

function cmdGaps() {
  const manifest = load('reference-gap-manifest.json', { gaps: [] })
  console.log(`Reference gaps -- ${manifest.gaps.length} total\n`)
  for (const g of manifest.gaps) console.log(`[${g.id}] ${g.status} (${g.priority}): ${g.reference}`)
}

function cmdConflicts() {
  const c = load('knowledge-conflicts.json', { conflicts: [] })
  console.log(`Conflicts -- ${c.conflicts.length} total\n`)
  for (const conf of c.conflicts) {
    console.log(`[${conf.id}] ${conf.subject} / ${conf.property} -- ${conf.classification}, status=${conf.status}`)
    console.log(`  A: ${conf.claimA.value} (${conf.claimA.source})`)
    console.log(`  B: ${conf.claimB.value} (${conf.claimB.source})`)
  }
}

function cmdUnverified() {
  const claims = load('atomic-claims.json', { claims: [] }).claims
  const unverified = claims.filter(c => c.verificationStatus === 'UNVERIFIED')
  console.log(`Unverified claims -- ${unverified.length} of ${claims.length}\n`)
  for (const c of unverified) console.log(`[${c.claimId}] ${c.statement}`)
}

function cmdEntityOfType(type) {
  const typeMap = { map: 'MAP', monster: 'MONSTER', item: 'ITEM', event: 'EVENT', npc: 'NPC', system: 'SYSTEM', config: 'CONFIG' }
  const wanted = typeMap[type?.toLowerCase()]
  if (!wanted) { console.error(`Usage: knowledge-query.mjs entity <${Object.keys(typeMap).join('|')}>`); process.exit(1) }
  const graph = load('knowledge-graph.json', { nodes: [] })
  const nodes = graph.nodes.filter(n => n.type === wanted)
  console.log(`${wanted} entities -- ${nodes.length} total\n`)
  for (const n of nodes) console.log(`[${n.id}] ${n.name}${n.bloodMoonStatus ? ' (' + n.bloodMoonStatus + ')' : ''}`)
  if (nodes.length === 0) {
    console.log(`(none in the graph yet -- for a fuller MONSTER/ITEM/EVENT roster including entries not promoted to individual graph nodes, see knowledge/vendor-sweep/entities/gameplay-entities.json)`)
  }
}

function cmdVerified() {
  const claims = load('atomic-claims.json', { claims: [] }).claims
  const verified = claims.filter(c => c.verificationStatus?.startsWith('CONFIRMED_'))
  console.log(`Verified claims (CONFIRMED_BY_*) -- ${verified.length} of ${claims.length}\n`)
  for (const c of verified) console.log(`[${c.claimId}] ${c.statement} (${c.verificationStatus})`)
}

function cmdDisabledSystems() {
  const claims = load('atomic-claims.json', { claims: [] }).claims
  const needle = /disab|inert|commented|enabled\s*=\s*0|zero active/i
  const hits = claims.filter(c => needle.test(c.statement) || needle.test(c.notes || ''))
  console.log(`Claims describing a disabled/inert system state -- ${hits.length} of ${claims.length}\n`)
  for (const c of hits) console.log(`[${c.claimId}] ${c.statement}`)
  console.log(`\nReminder (per this sweep's explicit hypothesis-generalization rule): this is a per-file PATTERN_OBSERVED list, not evidence of a general Blood Moon policy. See CLAIM-027's note for the counter-evidence found among event configs.`)
}

function cmdProgression() {
  const p = load('progression-entries.json', { entries: [] })
  console.log(`Progression entries -- ${p.entries.length} total\n`)
  for (const e of p.entries) {
    console.log(`[${e.progressionId}] (${e.factStatus}) ${e.stage}: ${e.requirement} -> ${e.target}`)
  }
  if (p.entries.length === 0) console.log('(none yet -- no sufficient real evidence found for a formal progression entry)')
}

function cmdWikiReady() {
  const dir = join(ROOT, 'wiki_candidates')
  if (!existsSync(dir)) { console.log('No wiki_candidates directory found.'); return }
  const results = []
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (extname(entry.name) === '.md') {
        const text = readFileSync(full, 'utf8')
        const statusMatch = text.match(/^status:\s*(\S+)/m)
        const titleMatch = text.match(/^#\s+(.+)$/m)
        results.push({ file: full.replace(ROOT + '\\', '').replace(ROOT + '/', ''), status: statusMatch ? statusMatch[1] : 'UNKNOWN', title: titleMatch ? titleMatch[1] : entry.name })
      }
    }
  }
  walk(dir)
  console.log(`Wiki candidates -- ${results.length} total\n`)
  for (const r of results) console.log(`[${r.status}] ${r.title} (${r.file})`)
}

function main() {
  const [, , cmd, ...rest] = process.argv
  const arg = rest.join(' ')
  switch (cmd) {
    case 'query': return cmdQuery(arg)
    case 'entity': return cmdEntity(arg)
    case 'gaps': return cmdGaps()
    case 'conflicts': return cmdConflicts()
    case 'unverified': return cmdUnverified()
    case 'verified': return cmdVerified()
    case 'disabled-systems': return cmdDisabledSystems()
    case 'progression': return cmdProgression()
    case 'wiki-ready': return cmdWikiReady()
    default:
      console.log('Usage: node scripts/knowledge-query.mjs <query "term"|entity "name"|entity <map|monster|item|event|npc|system|config>|gaps|conflicts|unverified|verified|disabled-systems|progression|wiki-ready>')
      process.exit(cmd ? 1 : 0)
  }
}

main()
