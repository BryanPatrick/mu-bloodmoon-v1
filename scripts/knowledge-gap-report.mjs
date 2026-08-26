#!/usr/bin/env node
// Knowledge Sweep tooling (Part AB/AC) -- read-only scan for reference-gap
// candidates: phrases in docs/ that point at a source ("ver tutorial",
// "see video", file-path-shaped citations) which may or may not have a
// captured RAW artifact behind them. This does NOT decide whether a gap
// is real -- it produces candidate hits for a human (or a future agent
// turn) to triage against knowledge/vendor-sweep/reference-gap-manifest.json.
//
// Scans both D:\MU\docs (the ungoverned research workspace, outside this
// git repo) and this repo's own docs/, matching the project's existing
// split: raw ongoing research stays outside git, product-relevant docs
// live inside it. Read-only -- writes nothing, mutates nothing.
//
// Usage: node scripts/knowledge-gap-report.mjs [--json]
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, extname, relative } from 'node:path'

const REPO_ROOT = process.cwd()
const MU_ROOT = join(REPO_ROOT, '..')
const SCAN_ROOTS = [
  { label: 'D:\\MU\\docs', path: join(MU_ROOT, 'docs') },
  { label: 'mu-bloodmoon-v1/docs', path: join(REPO_ROOT, 'docs') },
]
const MANIFEST_PATH = join(REPO_ROOT, 'knowledge', 'vendor-sweep', 'reference-gap-manifest.json')

// Gap-indicating phrases: cross-references to a source that may or may not
// have a captured RAW artifact. Kept deliberately narrower than a first
// pass at generic words like "TODO"/"pendente" (those matched ~80% of the
// corpus and are too broad a signal to triage automatically).
const GAP_PHRASES = [
  /ver v[íi]deo/i,
  /ver tutorial/i,
  /conforme tutorial/i,
  /v[íi]deo[- ]aula/i,
  /see video/i,
  /according to the video/i,
  /RAW_MISSING/,
  /RAW_CAPTURE\s*=\s*NOT_AVAILABLE/,
]
const EXTS = new Set(['.md', '.txt'])

function walk(dir, files = []) {
  if (!existsSync(dir)) return files
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    let stat
    try { stat = statSync(full) } catch { continue }
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git') continue
      walk(full, files)
    } else if (EXTS.has(extname(entry))) {
      files.push(full)
    }
  }
  return files
}

function scanFile(path) {
  const text = readFileSync(path, 'utf8')
  const lines = text.split(/\r?\n/)
  const hits = []
  lines.forEach((line, i) => {
    for (const re of GAP_PHRASES) {
      if (re.test(line)) {
        hits.push({ line: i + 1, text: line.trim().slice(0, 200), matched: re.source })
        break
      }
    }
  })
  return hits
}

function loadKnownGapIds() {
  if (!existsSync(MANIFEST_PATH)) return new Set()
  try {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
    return new Set((manifest.gaps || []).map(g => g.whereReferenced))
  } catch {
    return new Set()
  }
}

function main() {
  const asJson = process.argv.includes('--json')
  const knownGapFiles = loadKnownGapIds()
  const report = []

  for (const root of SCAN_ROOTS) {
    const files = walk(root.path)
    for (const file of files) {
      const hits = scanFile(file)
      if (hits.length === 0) continue
      const rel = relative(MU_ROOT, file).replace(/\\/g, '/')
      const alreadyTracked = [...knownGapFiles].some(g => g.startsWith(rel) || rel.startsWith(g.split(':')[0]))
      report.push({ file: rel, root: root.label, hitCount: hits.length, alreadyTrackedInManifest: alreadyTracked, hits })
    }
  }

  if (asJson) {
    process.stdout.write(JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2) + '\n')
    return
  }

  console.log(`Knowledge gap candidate scan -- ${report.length} file(s) with hits\n`)
  for (const r of report) {
    const flag = r.alreadyTrackedInManifest ? '(already in manifest)' : '(NOT yet in manifest -- review)'
    console.log(`${r.file}  [${r.hitCount} hit(s)] ${flag}`)
  }
  console.log(`\nFiles with hits NOT yet tracked in reference-gap-manifest.json:`)
  const untracked = report.filter(r => !r.alreadyTrackedInManifest)
  if (untracked.length === 0) {
    console.log('  (none)')
  } else {
    for (const r of untracked) console.log(`  - ${r.file}`)
  }
}

main()
