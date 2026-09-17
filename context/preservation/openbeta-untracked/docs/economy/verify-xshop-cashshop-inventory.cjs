// Phase R (2026-09-02) -- standalone verification for the X-Shop/CashShop
// inventory + decision-table documents. Not part of the apps/api Jest
// suite (this is docs tooling, not application code) -- run directly:
//   node docs/economy/verify-xshop-cashshop-inventory.js
// Exits non-zero and prints which assertion failed on any violation.
const fs = require('fs')
const path = require('path')

const DIR = __dirname
let failures = 0
function assert(cond, message) {
  if (!cond) { failures++; console.error(`FAIL: ${message}`) } else { console.log(`PASS: ${message}`) }
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0)
  const header = splitLine(lines[0])
  return lines.slice(1).map((line) => {
    const cells = splitLine(line)
    const row = {}
    header.forEach((h, i) => { row[h] = cells[i] ?? '' })
    return row
  })
}
function splitLine(line) {
  const out = []; let cur = ''; let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { inQuotes = !inQuotes; continue }
    if (c === ',' && !inQuotes) { out.push(cur); cur = ''; continue }
    cur += c
  }
  out.push(cur)
  return out
}

// XSHOP_TOTAL_168 / NO_XSHOP_ENTRY_LOST
const rawXshop = parseCsv(fs.readFileSync(path.join(DIR, 'xshop-full-inventory.csv'), 'utf8'))
assert(rawXshop.length === 168, `raw X-Shop inventory has 168 rows (got ${rawXshop.length})`)
const rawIds = new Set(rawXshop.map((r) => r.idx))
assert(rawIds.size === 168, `raw X-Shop inventory has 168 distinct idx values (got ${rawIds.size})`)

const decisionXshop = parseCsv(fs.readFileSync(path.join(DIR, 'xshop-bryan-decision-table.csv'), 'utf8'))
assert(decisionXshop.length === 168, `X-Shop decision table has 168 rows (got ${decisionXshop.length})`)
const decisionIds = new Set(decisionXshop.map((r) => r.ID))
assert(decisionIds.size === 168, `X-Shop decision table has 168 distinct IDs (got ${decisionIds.size})`)
const missingFromDecisionTable = [...rawIds].filter((id) => !decisionIds.has(id))
assert(missingFromDecisionTable.length === 0, `no raw X-Shop idx missing from the decision table (missing: ${missingFromDecisionTable.join(',') || 'none'})`)

// Every row has a non-empty preliminary classification and BRYAN_DECISION=PENDING
const badClassification = decisionXshop.filter((r) => !r.PRELIMINARY_CLASSIFICATION)
assert(badClassification.length === 0, `every X-Shop decision row has a non-empty classification (${badClassification.length} missing)`)
const notPending = decisionXshop.filter((r) => r.BRYAN_DECISION !== 'PENDING')
assert(notPending.length === 0, `every X-Shop decision row is BRYAN_DECISION=PENDING (${notPending.length} are not)`)

// Unknown entries preserved, not discarded
const unknownRows = decisionXshop.filter((r) => r.PRELIMINARY_CLASSIFICATION === 'UNKNOWN_DATA_GAP')
assert(unknownRows.length === 3, `exactly 3 UNKNOWN_DATA_GAP rows preserved (got ${unknownRows.length})`)
const unknownIds = unknownRows.map((r) => r.TECHNICAL_ID).sort()
assert(JSON.stringify(unknownIds) === JSON.stringify(['type=1,index=10', 'type=1,index=11', 'type=1,index=9']), `the 3 unknown rows are exactly the Axes 9/10/11 (got ${unknownIds.join(' | ')})`)

// Classification counts match the documented, deterministic result
const counts = decisionXshop.reduce((acc, r) => { acc[r.PRELIMINARY_CLASSIFICATION] = (acc[r.PRELIMINARY_CLASSIFICATION] || 0) + 1; return acc }, {})
assert(counts.RED_INCOMPATIBLE_WITH_CURRENT_POLICY === 153, `153 RED rows (got ${counts.RED_INCOMPATIBLE_WITH_CURRENT_POLICY})`)
assert(counts.YELLOW_REQUIRES_DECISION === 12, `12 YELLOW rows (got ${counts.YELLOW_REQUIRES_DECISION})`)
assert(counts.UNKNOWN_DATA_GAP === 3, `3 UNKNOWN rows (got ${counts.UNKNOWN_DATA_GAP})`)
assert(!counts.GREEN_CANDIDATE, `0 GREEN rows in X-Shop (got ${counts.GREEN_CANDIDATE || 0})`)
assert(153 + 12 + 3 === 168, 'classification counts sum to 168')

// Determinism: category -> classification is a pure function of CATEGORY + ITEM resolution status
const byCategory = {}
let deterministic = true
for (const row of decisionXshop) {
  const rawRow = rawXshop.find((r) => r.idx === row.ID)
  const key = `${rawRow.CATEGORY}|${rawRow.ITEM === 'NOT_AVAILABLE'}`
  if (byCategory[key] && byCategory[key] !== row.PRELIMINARY_CLASSIFICATION) deterministic = false
  byCategory[key] = row.PRELIMINARY_CLASSIFICATION
}
assert(deterministic, 'classification is deterministic (same category+resolution -> same classification for every row)')

// CASHSHOP_TOTAL_12 / NO_CASHSHOP_ENTRY_LOST -- CashShop has no CSV, verify against the markdown decision table directly
const cashshopMd = fs.readFileSync(path.join(DIR, 'cashshop-bryan-decision-table.md'), 'utf8')
const cashshopRowLines = cashshopMd.split('\n').filter((l) => /^\| \d+ \|/.test(l))
assert(cashshopRowLines.length === 12, `CashShop decision table has 12 item rows (got ${cashshopRowLines.length})`)
const cashshopIds = cashshopRowLines.map((l) => l.split('|')[1].trim())
assert(new Set(cashshopIds).size === 12, 'CashShop decision table has 12 distinct IDs')
const cashshopPending = cashshopRowLines.filter((l) => l.trim().endsWith('| PENDING |'))
assert(cashshopPending.length === 12, `all 12 CashShop rows are BRYAN_DECISION=PENDING (got ${cashshopPending.length})`)
const cashshopGreen = cashshopRowLines.filter((l) => l.includes('| GREEN_CANDIDATE |')).length
const cashshopYellow = cashshopRowLines.filter((l) => l.includes('| YELLOW_REQUIRES_DECISION |')).length
assert(cashshopGreen === 3, `3 GREEN CashShop rows (got ${cashshopGreen})`)
assert(cashshopYellow === 9, `9 YELLOW CashShop rows (got ${cashshopYellow})`)

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`)
process.exit(failures === 0 ? 0 : 1)
