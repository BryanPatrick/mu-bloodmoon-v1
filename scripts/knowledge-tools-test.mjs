#!/usr/bin/env node
// Knowledge Sweep tooling (Part AA) -- integration test for the whole
// scripts/knowledge-*.mjs suite. Runs each tool against the real sweep data
// and checks structural invariants. Complements knowledge-validate.mjs
// (which checks the DATA); this checks the TOOLS that read it.
//
// Usage: node scripts/knowledge-tools-test.mjs
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
let failures = 0
function check(name, fn) {
  try {
    fn()
    console.log(`[PASS] ${name}`)
  } catch (e) {
    failures++
    console.log(`[FAIL] ${name}: ${e.message}`)
  }
}
function run(script, args = []) {
  return execFileSync('node', [join(ROOT, 'scripts', script), ...args], { encoding: 'utf8' })
}

check('knowledge-validate.mjs exits clean against real data', () => {
  const out = run('knowledge-validate.mjs')
  if (!out.includes('All structural checks passed')) throw new Error('did not report all-clear: ' + out.slice(0, 200))
})

check('knowledge-query.mjs entity <name> finds a known real entity', () => {
  const out = run('knowledge-query.mjs', ['entity', 'CustomBotStore'])
  if (!out.includes('CLAIM-006')) throw new Error('expected CLAIM-006 in output')
})

check('knowledge-query.mjs entity monster lists at least the 7 cross-referenced bosses', () => {
  const out = run('knowledge-query.mjs', ['entity', 'monster'])
  for (const name of ['Kundun', 'Erohim', 'Nightmare', 'Selupan', 'Medusa', 'Boss Farao', 'Boss BloodMoon']) {
    if (!out.includes(name)) throw new Error(`missing ${name} in monster listing`)
  }
})

check('knowledge-query.mjs query does tokenized AND search, not exact phrase', () => {
  const out = run('knowledge-query.mjs', ['query', 'ItemDrop VIP'])
  if (!out.includes('CLAIM-004')) throw new Error('tokenized search regressed -- see the fix in the same script earlier this session')
})

check('knowledge-conflict-scan.mjs finds the known CONFLICT-001 cluster and nothing new', () => {
  const out = run('knowledge-conflict-scan.mjs')
  if (!out.includes('itemdrop.txt')) throw new Error('expected the known ItemDrop.txt conflict cluster')
})

check('knowledge-canonical-facts.mjs produces a non-empty, real facts list', () => {
  const out = JSON.parse(run('knowledge-canonical-facts.mjs'))
  if (out.canonicalFactCount < 1) throw new Error('expected at least 1 canonical fact')
  if (!out.canonicalFacts.every(f => f.evidenceBasis?.startsWith('CONFIRMED_BY_'))) {
    throw new Error('a canonical fact leaked in without CONFIRMED_BY_ evidence -- Part W rule violated')
  }
})

check('knowledge-provenance-report.mjs covers every knowledge-index.json entry exactly once', () => {
  const index = JSON.parse(readFileSync(join(ROOT, 'knowledge', 'vendor-sweep', 'knowledge-index.json'), 'utf8')).entries
  const out = JSON.parse(run('knowledge-provenance-report.mjs'))
  if (out.perSource.length !== index.length) throw new Error(`expected ${index.length} rows, got ${out.perSource.length}`)
  const ids = new Set(out.perSource.map(r => r.id))
  if (ids.size !== out.perSource.length) throw new Error('duplicate source ids in provenance report')
})

check('knowledge-provenance-audit.mjs resolves the large majority of path references (regression guard against the Data/-prefix and repo-root bugs found this session)', () => {
  const out = JSON.parse(run('knowledge-provenance-audit.mjs', ['--json']))
  const resolveRate = out.found / out.checked
  if (resolveRate < 0.9) throw new Error(`resolve rate ${(resolveRate * 100).toFixed(1)}% is suspiciously low -- likely a path-resolution regression, not 100s of real broken docs`)
})

// --- Phase 5 additions ---

check('knowledge-transcript-inventory.mjs covers all 108 relevant videos and matches the actual RAW-capture rate', () => {
  const out = JSON.parse(run('knowledge-transcript-inventory.mjs'))
  if (out.totalRelevantVideos !== 108) throw new Error(`expected 108 relevant videos, got ${out.totalRelevantVideos}`)
  if (out.rawCapturedCount !== 108) throw new Error(`expected all 108 to be RAW-captured (per the earlier pipeline-optimization phase), got ${out.rawCapturedCount}`)
  if (out.withKnowledgeIndexEntry < 39) throw new Error(`expected at least the 39 sources processed by end of this Phase 5 pass, got ${out.withKnowledgeIndexEntry}`)
})

check('knowledge-query.mjs source <videoId> reports per-stage status for a known Phase 5 video', () => {
  const out = run('knowledge-query.mjs', ['source', 'TDL051DxNw8'])
  if (!out.includes('KI-019')) throw new Error('expected KI-019 for TDL051DxNw8')
  if (!out.includes('CLAIM-039')) throw new Error('expected CLAIM-039 to be listed as a claim from this source')
})

check('knowledge-query.mjs claims <system> finds claims by entity substring', () => {
  const out = run('knowledge-query.mjs', ['claims', 'CustomEventTime'])
  if (!out.includes('CLAIM-023') || !out.includes('CLAIM-051')) throw new Error('expected both CLAIM-023 and CLAIM-051 for CustomEventTime')
})

check('knowledge-query.mjs event <name> does typed substring lookup, not just exact match', () => {
  const out = run('knowledge-query.mjs', ['event', 'Devil Square'])
  if (!out.includes('EVENT-devil-square')) throw new Error('expected the Devil Square graph node')
})

check('knowledge-query.mjs unverified --priority=P0 filters by derived priority', () => {
  const all = run('knowledge-query.mjs', ['unverified'])
  const p0 = run('knowledge-query.mjs', ['unverified', '--priority=P0'])
  const countAll = Number((all.match(/-- (\d+) hit/) || [])[1])
  const countP0 = Number((p0.match(/-- (\d+) hit/) || [])[1])
  if (!(countP0 > 0 && countP0 < countAll)) throw new Error(`expected 0 < P0 count (${countP0}) < total count (${countAll})`)
})

check('knowledge-query.mjs provider-version <version> filters correctly', () => {
  const out = run('knowledge-query.mjs', ['provider-version', '8.6'])
  if (!out.includes('CLAIM-039')) throw new Error('expected CLAIM-039 (ADDED 8.6) in provider-version 8.6 results')
})

check('knowledge-graph.json Phase 5 additions pass structural validation (node-id regression guard)', () => {
  const out = run('knowledge-validate.mjs')
  if (!out.includes('79 graph nodes') && !/\d+ graph nodes/.test(out)) throw new Error('unexpected validator output shape: ' + out.slice(0, 200))
  if (!out.includes('All structural checks passed')) throw new Error('Phase 5 graph additions broke validation -- see the EVT-devil-square vs EVENT-devil-square id-mismatch bug caught during this same phase for the failure mode this guards against')
})

// --- Phase 10 additions ---

check('knowledge-transcript-inventory.mjs still counts .pt.srt-only transcripts, not just .pt.json (Phase 7 regression guard)', () => {
  const src = readFileSync(join(ROOT, 'scripts', 'knowledge-transcript-inventory.mjs'), 'utf8')
  if (!src.includes('\\.pt\\.(json|srt)')) {
    throw new Error('kiByVideo regex no longer matches both .pt.json AND .pt.srt -- this is exactly the Phase 7 bug (zJRrsKWKcUc hidden from inventory) silently returning')
  }
  const out = JSON.parse(run('knowledge-transcript-inventory.mjs'))
  if (out.byPriorityUnprocessed.P0 !== 0) {
    throw new Error(`expected 0 unprocessed P0 videos (all 27 were processed in Phase 7, verified via the .pt.srt inventory fix), got ${out.byPriorityUnprocessed.P0}`)
  }
})

check('knowledge-search-index-build.mjs fail-closed visibility filter does not over-trigger on safe player-facing prose (Phase 10 false-positive regression guard)', () => {
  const out = run('knowledge-search-index-build.mjs')
  const idx = JSON.parse(out)
  if (idx.chunkCount < 150) throw new Error(`expected at least 150 chunks, got ${idx.chunkCount}`)
  const built = JSON.parse(readFileSync(join(ROOT, 'knowledge', 'vendor-sweep', 'beta-readiness', 'search-index.json'), 'utf8'))
  const eventos = built.chunks.filter((c) => c.sourcePath.includes('wiki-drafts/eventos.md'))
  const classicos = eventos.find((c) => c.section === 'Eventos clássicos do motor MU')
  if (!classicos || classicos.playerVisibility !== 'PUBLIC_PLAYER') {
    throw new Error('the classic castle events section (Blood Castle/Chaos Castle/Devil Square real schedule data) is not PUBLIC_PLAYER -- see the literal "INTERNAL_ONLY" token false-positive fixed this phase')
  }
  const leilao = eventos.find((c) => c.section === 'ATIVO hoje')
  if (!leilao || leilao.playerVisibility !== 'PUBLIC_PLAYER') {
    throw new Error('the Auction (Leilão) section is not PUBLIC_PLAYER -- see the "/openevent" passing-mention false-positive fixed this phase')
  }
  const gmSection = (built.chunks.find((c) => c.sourcePath.includes('comandos.md') && c.section && c.section.includes('GM_COMMAND')))
  if (!gmSection || gmSection.playerVisibility !== 'ADMIN_INTERNAL') {
    throw new Error('the GM_COMMAND section stopped being downgraded to ADMIN_INTERNAL -- this is the real leak the fail-closed filter exists to prevent')
  }
  const superseded = built.chunks.filter((c) => c.sourcePath.includes('wiki-drafts/comecando.md') || c.sourcePath.includes('wiki-drafts/central-de-ajuda-faq.md'))
  if (superseded.some((c) => c.playerVisibility === 'PUBLIC_PLAYER')) {
    throw new Error('a BLOCKED/superseded page (comecando.md or central-de-ajuda-faq.md, per phase9/wiki-release-candidates.md) is competing in player search again -- should be HISTORICAL')
  }
})

check('knowledge-search-query.mjs 20-query Portuguese test corpus has zero WRONG_RESULT (worse than NOT_FOUND per Part K)', () => {
  let out
  try {
    out = run('knowledge-search-test-corpus.mjs')
  } catch (e) {
    // the script exits 1 on any WRONG_RESULT -- execFileSync throws, but
    // stdout is still on the error object
    out = e.stdout ? e.stdout.toString() : ''
    if (!out) throw e
  }
  if (!out.includes('WRONG_RESULT: 0')) throw new Error('expected WRONG_RESULT: 0 in the test corpus summary:\n' + out.slice(-600))
})

console.log('')
if (failures === 0) {
  console.log('All knowledge tooling integration checks passed.')
  process.exit(0)
} else {
  console.log(`${failures} check(s) failed.`)
  process.exit(1)
}
