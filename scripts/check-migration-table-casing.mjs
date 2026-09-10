#!/usr/bin/env node
// Static safeguard against the migration-casing bug class that caused two
// real production incidents (open_beta_p0_foundation, and
// 20260904090000_phase_v_progression_policy_status on 2026-09-10 -- see
// docs/deployments/deploy-2026-09-10-migration-execution/deploy-manifest.md
// for the full incident writeup). A migration.sql that references a table
// with different casing than the table's real CREATE TABLE casing (e.g.
// `progressionconfigitem` vs `ProgressionConfigItem`) passes silently on
// Windows/macOS local dev (case-insensitive table names) and fails on
// Linux production MySQL/MariaDB (case-sensitive), so this can only be
// caught by reading the SQL text itself, not by running migrations
// locally. Read-only, no database connection, no network access.
//
// Exit code 0 = no findings. Exit code 1 = a real casing mismatch found.
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.argv[2] ? join(process.cwd(), process.argv[2]) : join(process.cwd(), 'apps/api/prisma/migrations')

function listMigrationFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(dir, e.name, 'migration.sql'))
    .sort()
}

function stripComments(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
}

// Table names this script cannot resolve a canonical casing for because
// they are never CREATEd within the migrations directory itself (system
// tables, or tables created outside Prisma's migration history). Adding an
// entry here is a deliberate, reviewed exception -- never a way to silence
// a real finding.
const KNOWN_EXTERNAL_TABLES = new Set(['_prisma_migrations'])

function buildCanonicalTableNames(files) {
  const canonical = new Map() // lowercase -> { name, file }
  const conflicts = []
  for (const file of files) {
    const sql = stripComments(readFileSync(file, 'utf8'))
    for (const m of sql.matchAll(/CREATE TABLE\s+`([A-Za-z0-9_]+)`/g)) {
      const name = m[1]
      const key = name.toLowerCase()
      const existing = canonical.get(key)
      if (existing && existing.name !== name) {
        conflicts.push({ name, existingName: existing.name, file, existingFile: existing.file })
      } else if (!existing) {
        canonical.set(key, { name, file })
      }
    }
  }
  return { canonical, conflicts }
}

// Extracts every table-name reference this migration makes to a table it
// did NOT itself just create (self-references in a CREATE TABLE's own
// column/constraint definitions are covered by the CREATE TABLE match
// itself, so only cross-references matter here: ALTER TABLE, DROP TABLE,
// "... ON `Table`" (CREATE INDEX), REFERENCES, CREATE VIEW target).
function extractReferences(sql) {
  const refs = []
  const patterns = [
    /ALTER TABLE\s+`([A-Za-z0-9_]+)`/g,
    /DROP TABLE\s+(?:IF EXISTS\s+)?`([A-Za-z0-9_]+)`/g,
    /\sON\s+`([A-Za-z0-9_]+)`\s*\(/g,
    /REFERENCES\s+`([A-Za-z0-9_]+)`/g,
    /CREATE\s+(?:OR REPLACE\s+)?VIEW\s+`([A-Za-z0-9_]+)`/g
  ]
  for (const pattern of patterns) {
    for (const m of sql.matchAll(pattern)) refs.push(m[1])
  }
  return refs
}

function lineNumberOf(sql, needle) {
  const idx = sql.indexOf(needle)
  if (idx === -1) return null
  return sql.slice(0, idx).split('\n').length
}

const files = listMigrationFiles(root)
const { canonical, conflicts } = buildCanonicalTableNames(files)

const findings = []
for (const file of files) {
  const sql = stripComments(readFileSync(file, 'utf8'))
  for (const ref of extractReferences(sql)) {
    const key = ref.toLowerCase()
    if (KNOWN_EXTERNAL_TABLES.has(ref)) continue
    const known = canonical.get(key)
    if (!known) continue // table created later in history, or genuinely external -- not this script's concern
    if (known.name !== ref) {
      findings.push({
        file: relative(process.cwd(), file),
        line: lineNumberOf(readFileSync(file, 'utf8'), '`' + ref + '`'),
        referenced: ref,
        canonical: known.name,
        canonicalFile: relative(process.cwd(), known.file)
      })
    }
  }
}

if (conflicts.length > 0) {
  console.log(`MIGRATION_CASING_CHECK: CONFLICT (${conflicts.length} table name created with two different casings across migration history)`)
  for (const c of conflicts) {
    console.log(`  '${c.name}' (${relative(process.cwd(), c.file)}) vs '${c.existingName}' (${relative(process.cwd(), c.existingFile)})`)
  }
  process.exit(1)
}

if (findings.length === 0) {
  console.log(`MIGRATION_CASING_CHECK: PASS (${files.length} migration files, ${canonical.size} tables, 0 casing mismatches)`)
  process.exit(0)
}

console.log(`MIGRATION_CASING_CHECK: FAIL (${findings.length} casing mismatch(es) found)`)
for (const f of findings) {
  console.log(`  ${f.file}:${f.line ?? '?'}  references '${f.referenced}' but the table was created as '${f.canonical}' (${f.canonicalFile})`)
}
console.log('\nMySQL/MariaDB on Linux (production) is case-sensitive for table')
console.log('identifiers; local Windows/macOS dev is not, so this class of bug is')
console.log('invisible until it reaches production. Fix the migration.sql to use')
console.log('the exact casing shown above.')
process.exit(1)
