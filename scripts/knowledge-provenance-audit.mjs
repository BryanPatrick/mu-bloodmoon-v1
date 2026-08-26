#!/usr/bin/env node
// Knowledge Sweep tooling (Part S/T) -- a real, mechanical exhaustive audit
// of the doc corpus (D:\MU\docs + mu-bloodmoon-v1\docs), replacing the
// earlier keyword-phrase scan (scripts/knowledge-gap-report.mjs) which
// matched too broadly to triage by hand.
//
// What this does: extracts every file-path-shaped token from every .md file
// in scope (patterns like Data/X/Y.txt, Research/..., docs/..., knowledge/...)
// and checks whether that path actually exists on disk, either relative to
// D:\MU or relative to the referencing doc's own directory. This finds real
// dangling references mechanically -- "reference without a source" in a form
// a script can actually verify, rather than relying on a human/agent to read
// 75+ files closely.
//
// Limitations (stated up front, not hidden): this only catches file-path
// references. It cannot detect "summary without raw" in prose that doesn't
// name a path, "claim without verification target" (that's what
// knowledge-validate.mjs's atomic-claims.json schema check covers), or
// broken cross-references to a concept described only in words. It is a
// real, useful, but partial instrument -- not a substitute for a human
// close-read of all 75+ docs, which remains out of scope for a single
// automated pass.
//
// Usage: node scripts/knowledge-provenance-audit.mjs [--json]
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname, extname, resolve } from 'node:path'

const REPO_ROOT = process.cwd()
const MU_ROOT = resolve(REPO_ROOT, '..')
const SCAN_ROOTS = [
  join(MU_ROOT, 'docs'),
  join(REPO_ROOT, 'docs'),
]

// A file-path-shaped token: starts with a known root-ish segment, contains
// at least one slash, ends with a plausible extension. Deliberately
// conservative to avoid false positives on prose that merely mentions a
// word like "Data" without meaning a path.
//
// NOTE: 'Data/...' is deliberately EXCLUDED here. Throughout this corpus,
// "Data/X.txt" is the established shorthand for a path on the REMOTE VPS
// (C:\MuServer\Data\...), not a local file -- checking those against the
// local filesystem produces near-100% false positives (confirmed by an
// earlier run of this script: 459 of 562 "broken" refs, the overwhelming
// majority being exactly this pattern). Real remote-path verification
// belongs to RemoteOps (bm-remote inventory), not this local-file audit.
const PATH_PATTERN = /\b((?:Research|RemoteData|knowledge|docs|Knowledge|Tools|catalog|mu-bloodmoon-v1|scripts|apps|references)[\\/][\w .\-\\/]+?\.(?:txt|json|md|dat|htm|html|ps1|mjs|ts|tsx|js|sql|cs|csproj))\b/g

function walk(dir, files = []) {
  if (!existsSync(dir)) return files
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    let stat
    try { stat = statSync(full) } catch { continue }
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git') continue
      walk(full, files)
    } else if (extname(entry) === '.md') {
      files.push(full)
    }
  }
  return files
}

function checkPathExists(refPath, fromDir) {
  const normalized = refPath.replace(/\\/g, '/')
  const candidates = [
    join(MU_ROOT, normalized),      // relative to D:\MU (matches 'Research/...', 'knowledge/...' as seen from D:\MU)
    join(REPO_ROOT, normalized),    // relative to mu-bloodmoon-v1/ (matches 'apps/...', 'scripts/...', 'docs/...' as seen from inside the git repo)
    join(fromDir, normalized),      // relative to the referencing doc's own directory (rare, but covers doc-to-doc relative links)
  ]
  for (const c of candidates) {
    if (existsSync(c)) return { exists: true, resolvedAs: c }
  }
  return { exists: false, resolvedAs: null }
}

function main() {
  const asJson = process.argv.includes('--json')
  const results = { checked: 0, found: 0, broken: [] }

  for (const root of SCAN_ROOTS) {
    for (const file of walk(root)) {
      const text = readFileSync(file, 'utf8')
      const lines = text.split(/\r?\n/)
      const seen = new Set()
      lines.forEach((line, idx) => {
        const matches = line.matchAll(PATH_PATTERN)
        for (const m of matches) {
          const refPath = m[1]
          const key = refPath.toLowerCase()
          if (seen.has(key)) continue // avoid re-checking the same ref repeated in one file
          seen.add(key)
          results.checked++
          const { exists } = checkPathExists(refPath, dirname(file))
          if (exists) {
            results.found++
          } else {
            results.broken.push({
              file: file.replace(MU_ROOT + '\\', '').replace(MU_ROOT + '/', ''),
              line: idx + 1,
              reference: refPath,
            })
          }
        }
      })
    }
  }

  if (asJson) {
    process.stdout.write(JSON.stringify({ generatedAt: new Date().toISOString(), ...results }, null, 2) + '\n')
    return
  }

  console.log(`Provenance audit -- ${results.checked} path-shaped references checked across docs/`)
  console.log(`  ${results.found} resolved to a real file/directory`)
  console.log(`  ${results.broken.length} did NOT resolve\n`)
  if (results.broken.length) {
    console.log('Unresolved references (may be stale docs, typos, or paths outside this audit\'s known roots):')
    for (const b of results.broken) console.log(`  ${b.file}:${b.line} -> "${b.reference}"`)
  }
}

main()
