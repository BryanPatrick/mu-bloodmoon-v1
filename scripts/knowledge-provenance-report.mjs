#!/usr/bin/env node
// Knowledge Sweep tooling (Part T) -- machine-readable provenance
// completeness report. For every cataloged source (knowledge-index.json),
// checks each pipeline stage (RAW / NORMALIZED / CLAIMS / VERIFICATION /
// GRAPH / WIKI) and reports COMPLETE / PARTIAL / MISSING, derived
// mechanically by cross-referencing the other sweep artifacts rather than
// hand-maintained (this project hit real hand-count drift bugs earlier in
// this same session -- derive, don't copy).
//
// Usage: node scripts/knowledge-provenance-report.mjs [--write]
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'

const ROOT = join(process.cwd(), 'knowledge', 'vendor-sweep')
const load = (name, fallback) => {
  const p = join(ROOT, name)
  if (!existsSync(p)) return fallback
  return JSON.parse(readFileSync(p, 'utf8'))
}

const index = load('knowledge-index.json', { entries: [] }).entries
const claims = load('atomic-claims.json', { claims: [] }).claims
const graph = load('knowledge-graph.json', { nodes: [], edges: [] })

function collectWikiCandidateText() {
  const dir = join(ROOT, 'wiki_candidates')
  if (!existsSync(dir)) return ''
  let text = ''
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (extname(entry.name) === '.md') text += readFileSync(full, 'utf8') + '\n---\n'
    }
  }
  walk(dir)
  return text
}
const wikiText = collectWikiCandidateText()

const report = index.map(ki => {
  const rawStatus = ki.rawArtifact ? 'COMPLETE' : 'MISSING'
  const normStatus = ki.normalizedArtifact ? 'COMPLETE' : (ki.derivedArtifacts?.length ? 'PARTIAL' : 'MISSING')
  const relatedClaims = claims.filter(c => (c.sourceId || '').includes(ki.id))
  const claimsStatus = relatedClaims.length > 0 ? 'COMPLETE' : 'MISSING'
  const verifiedClaims = relatedClaims.filter(c => c.verificationStatus?.startsWith('CONFIRMED_') || c.verificationStatus?.startsWith('CONTRADICTED_'))
  const verificationStatus = relatedClaims.length === 0 ? 'MISSING' : (verifiedClaims.length === relatedClaims.length ? 'COMPLETE' : (verifiedClaims.length > 0 ? 'PARTIAL' : 'MISSING'))
  const hasGraphNode = graph.nodes.some(n => n.id === `SRC-${ki.id}`)
  const graphStatus = hasGraphNode ? 'COMPLETE' : 'MISSING'
  const inWiki = ki.rawArtifact && wikiText.includes(ki.rawArtifact.split('/').pop())
  const wikiStatus = inWiki ? 'COMPLETE' : 'MISSING'
  return {
    id: ki.id,
    title: ki.title,
    RAW: rawStatus,
    NORMALIZED: normStatus,
    CLAIMS: claimsStatus,
    VERIFICATION: verificationStatus,
    GRAPH: graphStatus,
    WIKI: wikiStatus,
  }
})

const tallies = {}
for (const stage of ['RAW', 'NORMALIZED', 'CLAIMS', 'VERIFICATION', 'GRAPH', 'WIKI']) {
  tallies[stage] = { COMPLETE: 0, PARTIAL: 0, MISSING: 0 }
  for (const r of report) tallies[stage][r[stage]]++
}

const output = {
  generatedAt: new Date().toISOString(),
  generatedBy: 'scripts/knowledge-provenance-report.mjs -- derived mechanically from knowledge-index.json, atomic-claims.json, knowledge-graph.json, and wiki_candidates/, do not hand-edit',
  scope: `${index.length} cataloged sources (knowledge-index.json). Does NOT cover the underlying 75+ prior-session docs corpus, which predates this sweep's index and uses its own provenance conventions (see Knowledge/README.md's EVIDENCE/KNOWLEDGE/OPERATIONS model instead).`,
  perSource: report,
  tallies,
}

if (process.argv.includes('--write')) {
  writeFileSync(join(ROOT, 'provenance-report.json'), JSON.stringify(output, null, 2) + '\n')
  console.log(`Wrote provenance report for ${index.length} sources to knowledge/vendor-sweep/provenance-report.json`)
  console.log(JSON.stringify(tallies, null, 2))
} else {
  console.log(JSON.stringify(output, null, 2))
}
