#!/usr/bin/env node
// Phase 5 Part A/B/C: builds the complete 108-video transcript inventory with
// per-stage status, multi-domain classification, and P0-P3 priority queues.
// Derives everything from existing sources (_relevant.tsv, transcripts-status.tsv,
// knowledge-index.json, atomic-claims.json) -- never hand-maintained.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'D:\\MU'
const VS = join(ROOT, 'mu-bloodmoon-v1', 'knowledge', 'vendor-sweep')
const YT = join(ROOT, 'Research', 'YouTube', 'project-gamers-oficial')

function parseRelevant(text) {
  return text.trim().split('\n').map(line => {
    const [idxVid, ...titleParts] = line.split('\t')
    const [idx, videoId] = idxVid.split(':')
    return { idx: Number(idx), videoId, title: titleParts.join('\t') }
  })
}

function parseStatusTsv(text) {
  const lines = text.trim().split('\n')
  const header = lines[0].split('\t')
  const rows = lines.slice(1).map(l => {
    const cols = l.split('\t')
    const o = {}
    header.forEach((h, i) => { o[h] = cols[i] })
    return o
  })
  const byVideo = new Map()
  for (const r of rows) byVideo.set(r.videoId, r) // last row wins (append-log)
  return byVideo
}

// --- Part B: domain classification by title keyword, multi-domain allowed ---
const DOMAIN_RULES = [
  ['RESET', /reset|master\s*reset/i],
  ['MASTER_RESET', /master\s*reset/i],
  ['PROGRESSION', /reset|entry level|entry to events/i],
  ['EVENT', /\bevent\b/i],
  ['MONSTER', /monster/i],
  ['NPC', /\bnpc\b/i],
  ['MAP', /\bmap\b/i],
  ['ITEM', /\bitem\b|itemdrop|drop item|makeset/i],
  ['DROP', /\bdrop\b/i],
  ['COMMAND', /\bcommand\b/i],
  ['SHOP', /bot store|bot trader|bot fusion|buy vip|store\b/i],
  ['CURRENCY', /\bvip\b|\bcoin\b|\bcash\b|money|wcoin|pcpoint|ruud/i],
  ['SKILL', /\bskill\b/i],
  ['CLASS', /\bclass\b|\bdamage\b/i],
  ['SECURITY', /gamemaster|account level|account migration/i],
  ['DATABASE', /\bsql\b|database|migration/i],
  ['OPERATIONS', /launcher|ftp|smtp|update(?!d)|conex[aã]o|apply|aplicar/i],
  ['CONFIG', /custom\b|configurando|configuracoes|configura[cç][oõ]es/i],
  ['SYSTEM', /custom|bot|manager/i],
]

function classify(title) {
  const domains = new Set()
  for (const [domain, re] of DOMAIN_RULES) if (re.test(title)) domains.add(domain)
  if (domains.size === 0) domains.add('OTHER')
  return [...domains]
}

// --- Part C: priority queues ---
function priority(domains) {
  const has = d => domains.includes(d)
  if (has('PROGRESSION') || has('RESET') || has('MASTER_RESET')) return 'P0'
  if (has('MAP') || has('ITEM') || has('MONSTER') || has('EVENT')) return 'P0'
  if (has('DROP') || has('NPC') || has('SHOP') || has('CURRENCY')) return 'P1'
  if (has('SYSTEM') || has('CONFIG') || has('COMMAND')) return 'P2'
  return 'P3'
}

const relevant = parseRelevant(readFileSync(join(YT, '_relevant.tsv'), 'utf8'))
const statusByVideo = parseStatusTsv(readFileSync(join(YT, 'transcripts-status.tsv'), 'utf8'))
const knowledgeIndex = JSON.parse(readFileSync(join(VS, 'knowledge-index.json'), 'utf8'))
const claimsDoc = JSON.parse(readFileSync(join(VS, 'atomic-claims.json'), 'utf8'))

// map videoId -> KI entry (via rawArtifact path containing the videoId)
const kiByVideo = new Map()
for (const ki of knowledgeIndex.entries) {
  const m = /transcripts\/([^/.]+)\.pt\.json/.exec(ki.rawArtifact || '')
  if (m) kiByVideo.set(m[1], ki)
}

// map KI id -> claim count (claims reference sourceId which may be "KI-NNN" or
// "KI-NNN (...)" or a compound string -- extract every KI-NNN token present)
const claimCountByKi = new Map()
for (const cl of claimsDoc.claims) {
  const ids = [...(cl.sourceId || '').matchAll(/KI-\d+/g)].map(m => m[0])
  for (const id of ids) claimCountByKi.set(id, (claimCountByKi.get(id) || 0) + 1)
}

const inventory = relevant.map(({ idx, videoId, title }) => {
  const statusRow = statusByVideo.get(videoId)
  const ki = kiByVideo.get(videoId)
  const domains = classify(title)
  const claimCount = ki ? (claimCountByKi.get(ki.id) || 0) : 0
  return {
    idx,
    videoId,
    title,
    rawTranscriptStatus: statusRow ? statusRow.transcriptStatus : 'UNKNOWN',
    captureMethod: statusRow ? statusRow.captureMethod : null,
    knowledgeIndexId: ki ? ki.id : null,
    normalizedStatus: ki && ki.normalizedArtifact ? 'NORMALIZED' : (ki ? 'RAW_ONLY' : 'NOT_STARTED'),
    claimsStatus: claimCount > 0 ? `EXTRACTED (${claimCount})` : (ki ? 'NONE_YET' : 'NOT_STARTED'),
    entityExtractionStatus: ki && ki.entities && ki.entities.length ? 'PARTIAL' : 'NOT_STARTED',
    graphStatus: 'NOT_TRACKED_PER_VIDEO', // graph nodes aren't 1:1 with videos; see knowledge-graph.json
    verificationStatus: ki ? ki.status : 'NOT_APPLICABLE',
    domains,
    priority: priority(domains),
    bloodMoonProviderVersion: (/(?:ADDED|UPDATED|update)\s*[\d.]+/i.exec(title) || [null])[0],
  }
})

const summary = {
  totalRelevantVideos: inventory.length,
  rawCapturedCount: inventory.filter(v => v.rawTranscriptStatus === 'CAPTURED').length,
  withKnowledgeIndexEntry: inventory.filter(v => v.knowledgeIndexId).length,
  withClaims: inventory.filter(v => v.claimsStatus.startsWith('EXTRACTED')).length,
  pureRawAwaitingProcessing: inventory.filter(v => !v.knowledgeIndexId).length,
  byPriority: {
    P0: inventory.filter(v => v.priority === 'P0').length,
    P1: inventory.filter(v => v.priority === 'P1').length,
    P2: inventory.filter(v => v.priority === 'P2').length,
    P3: inventory.filter(v => v.priority === 'P3').length,
  },
  byPriorityUnprocessed: {
    P0: inventory.filter(v => v.priority === 'P0' && !v.knowledgeIndexId).length,
    P1: inventory.filter(v => v.priority === 'P1' && !v.knowledgeIndexId).length,
    P2: inventory.filter(v => v.priority === 'P2' && !v.knowledgeIndexId).length,
    P3: inventory.filter(v => v.priority === 'P3' && !v.knowledgeIndexId).length,
  },
}

const output = {
  generatedAt: new Date().toISOString(),
  generatedBy: 'scripts/knowledge-transcript-inventory.mjs (Phase 5 Part A/B/C)',
  scope: 'All 108 project-gamers-oficial videos in _relevant.tsv. Per-video status is DERIVED from transcripts-status.tsv + knowledge-index.json + atomic-claims.json, not hand-maintained -- re-run this script any time those sources change.',
  summary,
  videos: inventory,
}

writeFileSync(join(VS, 'transcript-inventory.json'), JSON.stringify(output, null, 2))

// priority queues as a separate, focused artifact for the P0-first work order
const queues = { generatedAt: output.generatedAt, generatedBy: output.generatedBy }
for (const p of ['P0', 'P1', 'P2', 'P3']) {
  queues[p] = inventory
    .filter(v => v.priority === p && !v.knowledgeIndexId)
    .map(v => ({ videoId: v.videoId, title: v.title, domains: v.domains, rawTranscriptStatus: v.rawTranscriptStatus }))
}
writeFileSync(join(VS, 'priority-queues.json'), JSON.stringify(queues, null, 2))

console.log(JSON.stringify(summary, null, 2))
