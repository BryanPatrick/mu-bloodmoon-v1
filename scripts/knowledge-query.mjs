#!/usr/bin/env node
// Knowledge Sweep tooling (Part AM) -- simple local search over the sweep's
// structured outputs (atomic-claims.json, knowledge-index.json,
// knowledge-graph.json, knowledge-conflicts.json, reference-gap-manifest.json,
// wiki_candidates/). Read-only. No network, no mutation.
//
// Usage:
//   node scripts/knowledge-query.mjs query "ItemDrop VIP"
//   node scripts/knowledge-query.mjs entity "CustomBotStore"
//   node scripts/knowledge-query.mjs gaps
//   node scripts/knowledge-query.mjs conflicts
//   node scripts/knowledge-query.mjs unverified
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

function cmdEntity(name) {
  if (!name) { console.error('Usage: knowledge-query.mjs entity "<entity name>"'); process.exit(1) }
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
    case 'wiki-ready': return cmdWikiReady()
    default:
      console.log('Usage: node scripts/knowledge-query.mjs <query "term"|entity "name"|gaps|conflicts|unverified|wiki-ready>')
      process.exit(cmd ? 1 : 0)
  }
}

main()
