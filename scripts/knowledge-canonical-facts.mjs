#!/usr/bin/env node
// Knowledge Sweep tooling (Part W) -- generates the canonical-fact layer:
// every atomic claim that has been checked against a REAL Blood Moon source
// (config/schema/runtime -- verificationStatus starting with CONFIRMED_BY_).
// A claim resting on PROVIDER_TUTORIAL authority alone, no matter how
// plausible, is NOT canonical until independently verified -- this is
// mechanical, not a judgment call, which is why this is a generator script
// rather than a hand-maintained file (this project has already hit two
// hand-count drift bugs this session; deriving beats copying).
//
// Usage: node scripts/knowledge-canonical-facts.mjs [--write]
//   (no flag) prints to stdout
//   --write   writes knowledge/vendor-sweep/canonical-facts.json
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(process.cwd(), 'knowledge', 'vendor-sweep')
const claims = JSON.parse(readFileSync(join(ROOT, 'atomic-claims.json'), 'utf8')).claims

const canonical = claims
  .filter(c => c.verificationStatus?.startsWith('CONFIRMED_BY_'))
  .map(c => ({
    claimId: c.claimId,
    statement: c.statement,
    evidenceBasis: c.verificationStatus,
    entities: c.entities,
    topic: c.topic,
    confidence: c.confidence,
  }))

const contradicted = claims
  .filter(c => c.verificationStatus?.startsWith('CONTRADICTED_BY_'))
  .map(c => ({ claimId: c.claimId, statement: c.statement, evidenceBasis: c.verificationStatus }))

const output = {
  generatedAt: new Date().toISOString(),
  generatedBy: 'scripts/knowledge-canonical-facts.mjs -- derived mechanically from atomic-claims.json, do not hand-edit, re-run instead',
  rule: 'A claim qualifies as canonical only when verificationStatus starts with CONFIRMED_BY_ (config/schema/runtime evidence). PROVIDER_TUTORIAL or COMMUNITY_TUTORIAL sourceAuthority alone, however plausible, is explicitly insufficient -- see docs/knowledge/source-authority.md.',
  canonicalFactCount: canonical.length,
  totalClaims: claims.length,
  canonicalFacts: canonical,
  explicitlyNotCanonical_contradicted: contradicted,
}

if (process.argv.includes('--write')) {
  writeFileSync(join(ROOT, 'canonical-facts.json'), JSON.stringify(output, null, 2) + '\n')
  console.log(`Wrote ${canonical.length} canonical facts to knowledge/vendor-sweep/canonical-facts.json`)
} else {
  console.log(JSON.stringify(output, null, 2))
}
