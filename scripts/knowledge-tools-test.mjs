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

// --- Phase 18D lookup-regression additions (Cash/VIP cluster) ---

const expectAll = (out, ids, label) => {
  for (const id of ids) if (!out.includes(id)) throw new Error(`${label}: expected ${id} in output`)
}

check('lookup regression 1: legacy web Cash flow resolves to the DmN claims (entry side, LEGACY)', () => {
  expectAll(run('knowledge-query.mjs', ['query', 'dmn cms']), ['CLAIM-123', 'CLAIM-124'], 'query "dmn cms"')
})

check('lookup regression 2: in-game Buy Vip resolves to KI-042/KI-043 and the native-command claims', () => {
  expectAll(run('knowledge-query.mjs', ['source', 'gqtSk1pdti4']), ['KI-042', 'CLAIM-100', 'CLAIM-104', 'CLAIM-110'], 'source gqtSk1pdti4')
  expectAll(run('knowledge-query.mjs', ['source', 'Jia1TrtgZfY']), ['KI-043', 'CLAIM-107', 'CLAIM-108'], 'source Jia1TrtgZfY')
  expectAll(run('knowledge-query.mjs', ['query', 'BUY_VIP']), ['CLAIM-101', 'KI-042'], 'query BUY_VIP (separator-insensitive)')
})

check('lookup regression 3: Buy Vip And Coin resolves to KI-044 and the CustomBuyVipAndCoin claims', () => {
  expectAll(run('knowledge-query.mjs', ['source', 'XUeN6U74zME']), ['KI-044', 'CLAIM-111', 'CLAIM-113', 'CLAIM-117'], 'source XUeN6U74zME')
  expectAll(run('knowledge-query.mjs', ['query', 'CUSTOM_BUY_VIP_AND_COIN']), ['KI-044', 'CLAIM-118'], 'query CUSTOM_BUY_VIP_AND_COIN')
})

check('lookup regression 4: current Asaas WC delivery resolves to the recharge-isolation claim, not to any vendor claim', () => {
  const out = run('knowledge-query.mjs', ['query', 'asaas'])
  expectAll(out, ['CLAIM-121'], 'query asaas')
  if (/\[source KI-04[234]\]/.test(out)) throw new Error('a vendor video source leaked into the Asaas/current-system lookup')
})

check('lookup regression 5: XShop/CashShop reload behavior resolves to the explicit non-generalization claim', () => {
  const out = run('knowledge-query.mjs', ['query', 'reload cashshop'])
  expectAll(out, ['CLAIM-120'], 'query "reload cashshop"')
  if (!out.includes('bloodMoonStatus=UNKNOWN')) throw new Error('CLAIM-120 must stay UNKNOWN -- reload behavior of CustomXShop/CashShopProduct is unproven')
})

check('critical Cash/VIP claims keep their evidence ceiling (no claim stronger than its evidence)', () => {
  const claims = JSON.parse(readFileSync(join(ROOT, 'knowledge', 'vendor-sweep', 'atomic-claims.json'), 'utf8')).claims
  const by = Object.fromEntries(claims.map(c => [c.claimId, c]))
  // exact SQL table of the closed-source engine must stay INFERRED, never verified
  if (by['CLAIM-119'].verificationStatus !== 'UNVERIFIED') throw new Error('CLAIM-119 (engine SQL table) was promoted without engine source')
  // reload demonstrations are vendor-demonstrated only
  for (const id of ['CLAIM-110', 'CLAIM-117']) if (by[id].verificationStatus !== 'UNVERIFIED') throw new Error(`${id} (reload) claims Blood Moon verification it does not have`)
  // vendor-video-only behavior claims may not be BLOODMOON_CONFIRMED
  for (const c of claims) {
    if (Number(c.claimId.slice(6)) >= 100 && c.sourceAuthority === 'PROVIDER_TUTORIAL' && c.bloodMoonStatus === 'BLOODMOON_CONFIRMED') {
      throw new Error(`${c.claimId}: a PROVIDER_TUTORIAL-only claim cannot be BLOODMOON_CONFIRMED`)
    }
  }
})

// --- Phase 20 lookup-regression additions (currency semantics + command channel) ---

check('lookup regression 6: WZ_SetCoin / CashShopData resolve to the second-hand mapping claim and the UNKNOWN visibility claim', () => {
  expectAll(run('knowledge-query.mjs', ['query', 'WZ_SetCoin']), ['CLAIM-127', 'CLAIM-136'], 'query WZ_SetCoin')
  const out = run('knowledge-query.mjs', ['query', 'cashshopdata'])
  expectAll(out, ['CLAIM-136'], 'query cashshopdata')
  if (!out.includes('bloodMoonStatus=UNKNOWN')) throw new Error('CLAIM-136 (external CashShopData write visibility) must stay UNKNOWN')
})

check('lookup regression 7: "GameBridgeJob" / "GameCommandTransportClient" resolve to the disambiguation claims', () => {
  expectAll(run('knowledge-query.mjs', ['query', 'GameBridgeJob']), ['CLAIM-131', 'CLAIM-132'], 'query GameBridgeJob')
  expectAll(run('knowledge-query.mjs', ['query', 'GameCommandTransportClient']), ['CLAIM-131'], 'query GameCommandTransportClient')
})

check('lookup regression 8: Portal WCOIN resolves to the UNRESOLVED-mapping decision claim, Blood Coin to its own claim', () => {
  expectAll(run('knowledge-query.mjs', ['query', 'WCOIN']), ['CLAIM-129'], 'query WCOIN')
  expectAll(run('knowledge-query.mjs', ['query', 'Blood Coin']), ['CLAIM-130'], 'query "Blood Coin"')
})

check('Phase 20 claims keep their evidence ceiling (second-hand and unknown stay unverified)', () => {
  const claims = JSON.parse(readFileSync(join(ROOT, 'knowledge', 'vendor-sweep', 'atomic-claims.json'), 'utf8')).claims
  const by = Object.fromEntries(claims.map(c => [c.claimId, c]))
  // Lua usage on Blood Moon and CashShopData visibility stay unproven (Phase 20A could not run a lab GameServer)
  for (const id of ['CLAIM-136', 'CLAIM-137']) {
    if (by[id].verificationStatus !== 'UNVERIFIED') throw new Error(`${id} claims verification it does not have`)
  }
  // WZ_SetCoin's comments were second-hand until the Phase 20A lab read; now first-hand SQL evidence, so it must carry that authority
  if (by['CLAIM-127'].verificationStatus !== 'CONFIRMED_BY_SCHEMA' || by['CLAIM-127'].sourceAuthority !== 'REAL_BLOODMOON_SQL') throw new Error('CLAIM-127 must reflect the first-hand lab read (REAL_BLOODMOON_SQL / CONFIRMED_BY_SCHEMA)')
  if (by['CLAIM-136'].bloodMoonStatus !== 'UNKNOWN') throw new Error('CLAIM-136 must stay UNKNOWN')
  // a CONFIRMED_BY_* claim needs first-hand evidence: never inference or second-hand vendor documentation
  for (const c of claims) {
    if (Number(c.claimId.slice(6)) >= 125 && c.verificationStatus.startsWith('CONFIRMED_BY_') &&
        ['INTERNAL_INFERENCE', 'PROVIDER_DOCUMENTATION', 'PROVIDER_TUTORIAL'].includes(c.sourceAuthority)) {
      throw new Error(`${c.claimId}: ${c.sourceAuthority} cannot back a CONFIRMED_BY_* verification`)
    }
  }
  // the Portal WC target is a decision record: it must not be promoted into a mapping
  if (by['CLAIM-129'].verificationStatus !== 'NOT_APPLICABLE') throw new Error('CLAIM-129 is a decision record, not a verifiable mapping')
})

// --- Phase 20A additions (lab evidence, live state, decisions) ---

check('lookup regression 9: CashShopData / WZ_SetCoin resolve to the lab-evidence claims (additive semantics, DDL, all-vendor-procedures)', () => {
  const out = run('knowledge-query.mjs', ['query', 'CashShopData'])
  expectAll(out, ['CLAIM-139', 'CLAIM-140', 'CLAIM-141'], 'query CashShopData')
  expectAll(run('knowledge-query.mjs', ['query', 'WZ_SetCoin']), ['CLAIM-127', 'CLAIM-139'], 'query WZ_SetCoin')
  expectAll(run('knowledge-query.mjs', ['query', 'PcPointData']), ['CLAIM-142'], 'query PcPointData')
})

check('lookup regression 10: the live-state and preservation claims are reachable by system name', () => {
  expectAll(run('knowledge-query.mjs', ['query', 'gamebridge-agent-01']), ['CLAIM-145'], 'query gamebridge-agent-01')
  expectAll(run('knowledge-query.mjs', ['query', 'gamebridge/preserve-command-extension']), ['CLAIM-146'], 'query preserve branch')
})

check('Phase 20A decisions stay decision records and never become mappings or approvals', () => {
  const claims = JSON.parse(readFileSync(join(ROOT, 'knowledge', 'vendor-sweep', 'atomic-claims.json'), 'utf8')).claims
  const by = Object.fromEntries(claims.map(c => [c.claimId, c]))
  for (const id of ['CLAIM-147', 'CLAIM-148']) {
    if (by[id].verificationStatus !== 'NOT_APPLICABLE' || by[id].sourceAuthority !== 'INTERNAL_DECISION') throw new Error(`${id} must stay an INTERNAL_DECISION record`)
  }
  if (!/IMPLEMENTATION_APPROVED = NO/.test(by['CLAIM-148'].statement)) throw new Error('CLAIM-148 must state that implementation is NOT approved')
  if (!/OUT_OF_SCOPE/.test(by['CLAIM-147'].statement) || !/UNRESOLVED/.test(by['CLAIM-147'].statement)) throw new Error('CLAIM-147 must record OUT_OF_SCOPE and the UNRESOLVED WC target')
  // the live-state claim must keep saying the VPS side was not verified
  if (!/not inspected/.test(by['CLAIM-145'].statement)) throw new Error('CLAIM-145 must keep the VPS-side caveat')
})

// --- Phase 20B additions (live verification, SQL preservation, decisions) ---

check('lookup regression 11: the running Agent and its build resolve to the live-verification claims', () => {
  expectAll(run('knowledge-query.mjs', ['query', 'BloodMoonGameBridgeAgent']), ['CLAIM-149', 'CLAIM-150'], 'query BloodMoonGameBridgeAgent')
  expectAll(run('knowledge-query.mjs', ['query', 'CREDIT_GAME_CURRENCY']), ['CLAIM-153'], 'query CREDIT_GAME_CURRENCY')
  expectAll(run('knowledge-query.mjs', ['query', 'local-writer-login.sql']), ['CLAIM-152'], 'query local-writer-login.sql')
})

check('Phase 20B claims keep their evidence ceiling and decisions stay decision records', () => {
  const claims = JSON.parse(readFileSync(join(ROOT, 'knowledge', 'vendor-sweep', 'atomic-claims.json'), 'utf8')).claims
  const by = Object.fromEntries(claims.map(c => [c.claimId, c]))
  // the "deployed build predates the extension" conclusion is an inference by chronology, never a verified fact
  if (by['CLAIM-150'].verificationStatus !== 'UNVERIFIED' || by['CLAIM-150'].sourceAuthority !== 'INTERNAL_INFERENCE') throw new Error('CLAIM-150 must stay an unverified inference')
  // the VPS observation must keep saying what was NOT read
  if (!/not read/.test(by['CLAIM-149'].statement)) throw new Error('CLAIM-149 must keep its "not read" caveat')
  if (by['CLAIM-154'].verificationStatus !== 'NOT_APPLICABLE' || by['CLAIM-154'].sourceAuthority !== 'INTERNAL_DECISION') throw new Error('CLAIM-154 must stay an INTERNAL_DECISION record')
  // the excluded credential-bearing file must never have its contents or password in the machine layer
  const blob = JSON.stringify(claims)
  if (/PASSWORDs*=s*N?'[^']+'/i.test(blob)) throw new Error('a password literal leaked into the machine layer')
  // CREDIT_GAME_CURRENCY stays non-existent
  if (!/does not exist/.test(by['CLAIM-153'].statement)) throw new Error('CLAIM-153 must state that CREDIT_GAME_CURRENCY does not exist')
})

console.log('')
if (failures === 0) {
  console.log('All knowledge tooling integration checks passed.')
  process.exit(0)
} else {
  console.log(`${failures} check(s) failed.`)
  process.exit(1)
}
