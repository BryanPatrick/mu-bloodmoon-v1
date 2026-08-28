#!/usr/bin/env node
// Knowledge Phase 9, Part U -- checks that every backtick-quoted `file.md`/
// `file.json` reference inside knowledge/vendor-sweep/beta-readiness/**/*.md
// actually exists somewhere under knowledge/vendor-sweep/ (basename match,
// since these docs cross-reference each other by filename, not full path).
// Cheap, mechanical link validation -- not a substitute for reading the
// content, but catches the common "renamed a file, forgot to update a
// reference" class of error.
//
// Usage: node scripts/knowledge-beta-readiness-link-check.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, files)
    else files.push(p)
  }
  return files
}

const ROOT = 'knowledge/vendor-sweep'
const allFiles = walk(ROOT)
const basenames = new Set(allFiles.map((f) => f.split(/[\\/]/).pop()))

const mdFiles = allFiles.filter((f) => extname(f) === '.md' && f.includes('beta-readiness'))
let totalRefs = 0
let brokenRefs = 0
for (const f of mdFiles) {
  const text = readFileSync(f, 'utf8')
  const refs = [...text.matchAll(/`([a-zA-Z0-9_-]+\.(?:md|json))`/g)].map((m) => m[1])
  for (const ref of refs) {
    totalRefs++
    if (!basenames.has(ref)) {
      brokenRefs++
      console.log(`BROKEN: ${f} references '${ref}' -- not found anywhere in ${ROOT}`)
    }
  }
}
console.log(`\nChecked ${totalRefs} filename references across ${mdFiles.length} Phase 7-9 markdown files.`)
console.log(`${brokenRefs} broken.`)
