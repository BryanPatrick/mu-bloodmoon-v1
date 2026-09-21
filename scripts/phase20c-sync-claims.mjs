#!/usr/bin/env node
// Phase 20C -- idempotent sync of Bryan's 2026-09-21 closure decisions into the vendor-sweep machine
// artifacts: adds CLAIM-156 (local-writer-login.sql stays excluded as a standing policy) and CLAIM-157
// (the two optional read-only follow-ups are deferred), amends CLAIM-152/154 and the CLAIM-150 queue item
// with a visible [20C] marker, and updates the graph and checkpoint.
// Same pattern as the phase18d/20/20a/20b scripts. Run from the repository root, then re-run the generators.
// No credential material is read or written by this script.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(process.cwd(), 'knowledge', 'vendor-sweep')
const now = new Date().toISOString()
const load = (n) => JSON.parse(readFileSync(join(ROOT, n), 'utf8'))
const save = (n, d) => writeFileSync(join(ROOT, n), JSON.stringify(d, null, 2) + '\n')
const claimsDoc = load('atomic-claims.json')
const graph = load('knowledge-graph.json')
const queue = load('verification-queue.json')
const checkpoint = load('checkpoint.json')

const C = (o) => ({ season: null, providerVersion: null, verificationTargets: [], notes: null, ...o })
const DECISION = { sourceId: 'internal-doc-cross-reference', sourceAuthority: 'INTERNAL_DECISION', bloodMoonStatus: 'BLOODMOON_CONFIRMED', verificationStatus: 'NOT_APPLICABLE' }

const newClaims = [
	C({
		claimId: 'CLAIM-156', ...DECISION,
		statement: 'Bryan decided on 2026-09-21 (Phase 20C) that the credential-bearing file local-writer-login.sql stays excluded from tracked source as a standing policy (LOCAL_WRITER_LOGIN_POLICY = EXCLUDED_SECRET_BEARING_SOURCE): the original is never copied into a tracked file, and only its path, size, SHA-256 and structural counts remain recorded.',
		sourceLocation: 'Phase 20C brief (2026-09-21), decision 2; PRESERVATION-MANIFEST.md on gamebridge/preserve-command-extension; docs/knowledge/KNOWLEDGE_GAPS.md GAP-P20-11',
		entityTypes: ['SYSTEM', 'DECISION'],
		entities: ['local-writer-login.sql', 'LOCAL_WRITER_LOGIN_POLICY', 'GAP-P20-11'],
		topic: 'systems',
		verificationTargets: [],
		confidence: 'CONFIRMED_OPERATOR (recorded decision)',
		notes: 'NOT_APPLICABLE verification: a decision record; no credential value appears here or in the documents. Phase 20C judgement, not a Bryan decision: no redacted template was created, because the login-creation and grant pattern is already tracked with a non-literal password (phase-3c proposed-writer-login-grants.sql) and the extension grants are preserved (proposed-writer-login-grants-extension.sql), so a template would add no information. The original file stays untouched and untracked in the openbeta worktree.'
	}),
	C({
		claimId: 'CLAIM-157', ...DECISION,
		statement: 'Bryan decided on 2026-09-21 (Phase 20C) not to perform, for now, the two optional read-only follow-ups for the deployed GameBridge Agent -- a string scan of a copy of its binary and a read of the scheduled task triggers and action -- so the residue of GAP-P20-02 stays open and non-blocking and CLAIM-150 stays UNVERIFIED.',
		sourceLocation: 'Phase 20C brief (2026-09-21), decision 3; docs/knowledge/KNOWLEDGE_GAPS.md GAP-P20-02',
		entityTypes: ['SYSTEM', 'DECISION'],
		entities: ['BloodMoonGameBridgeAgent', 'GAP-P20-02', 'CLAIM-150'],
		topic: 'operations',
		verificationTargets: [],
		confidence: 'CONFIRMED_OPERATOR (recorded decision)',
		notes: 'NOT_APPLICABLE verification: a decision record. It changes no evidence: CLAIM-149/151 stay CONFIRMED_BY_RUNTIME, CLAIM-150 stays a chronology inference. Currency delivery stays parked; CLAIM-129/147/148/154 are unchanged.'
	})
]

let added = 0
const ids = new Set(claimsDoc.claims.map((c) => c.claimId))
for (const c of newClaims) { if (ids.has(c.claimId)) { console.log(`SKIP claim ${c.claimId}`); continue } claimsDoc.claims.push(c); added++ }
const by = () => Object.fromEntries(claimsDoc.claims.map((c) => [c.claimId, c]))
let amended = 0
const amend = (id, fn) => { const c = by()[id]; if (!c) throw new Error('no ' + id); if ((c.notes || '').includes('[20C]')) { console.log(`SKIP amend ${id}`); return } fn(c); amended++ }
amend('CLAIM-152', (c) => { c.notes = '[20C] The exclusion of local-writer-login.sql is now a standing policy, not a pending review: see CLAIM-156. ' + (c.notes || '') })
amend('CLAIM-154', (c) => { c.notes = '[20C] The "excluded until a dedicated secret review" wording is superseded by the standing exclusion policy (CLAIM-156); the two optional Agent follow-ups are deferred (CLAIM-157). ' + (c.notes || '') })

// graph
const edgeKeys = new Set(graph.edges.map((e) => `${e.from}|${e.type}|${e.to}`))
let addedEdges = 0
const addEdge = (e) => { const k = `${e.from}|${e.type}|${e.to}`; if (!edgeKeys.has(k)) { graph.edges.push(e); edgeKeys.add(k); addedEdges++ } }
for (const [a, b] of [['CLAIM-156', 'CLAIM-152'], ['CLAIM-157', 'CLAIM-150']]) addEdge({ from: a, type: 'RELATED_TO', to: b })

// queue: the CLAIM-150 binary scan is deferred by the owner, not blocked
const item = queue.items.find((i) => i.claimId === 'CLAIM-150')
let queueTouched = 0
if (item && !item.result.includes('[20C]')) {
	item.result = item.result + ' [20C] Bryan (2026-09-21): not to be done now (CLAIM-157); the item stays QUEUED, non-blocking.'
	queueTouched++
} else console.log('SKIP queue CLAIM-150')

if (!checkpoint.phase20cCompleted) checkpoint.phase20cCompleted = [
	'Phase 20C (2026-09-21): local main fast-forwarded to the full Phase 20B knowledge commit 75d11eac; local-writer-login.sql recorded as a standing exclusion policy (CLAIM-156, GAP-P20-11 RESOLVED_AS_POLICY); the optional binary string scan and scheduled-task trigger read deferred by Bryan (CLAIM-157, GAP-P20-02 residue open and non-blocking); no production contact, no live test.',
	'Re-run the three generators after any claim edit: knowledge-transcript-inventory.mjs, knowledge-canonical-facts.mjs --write, knowledge-provenance-report.mjs --write.'
]
checkpoint.lastUpdatedUtc = now
claimsDoc.generatedAt = now; graph.generatedAt = now; queue.generatedAt = now
save('atomic-claims.json', claimsDoc); save('knowledge-graph.json', graph); save('verification-queue.json', queue); save('checkpoint.json', checkpoint)
console.log(`Added: ${added} claims, amended ${amended}, ${addedEdges} edges, ${queueTouched} queue items touched.`)
