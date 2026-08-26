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

console.log('')
if (failures === 0) {
  console.log('All knowledge tooling integration checks passed.')
  process.exit(0)
} else {
  console.log(`${failures} check(s) failed.`)
  process.exit(1)
}
