#!/usr/bin/env node
// Phase 20B -- idempotent sync of the live-verification, SQL-preservation and decision findings
// into the vendor-sweep machine artifacts: adds CLAIM-149..155, amends CLAIM-134/145 in place
// (visible [20B] marker), updates the verification queue, graph and checkpoint.
// Same pattern as the phase18d/20/20a scripts. Run from the repository root, then re-run the generators.
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

const EV = 'references/game-data/sql-discovery/phase-20b-live-agent-verification-20260921'
const C = (o) => ({ season: null, providerVersion: null, verificationTargets: [], notes: null, ...o })
const RUNTIME = { sourceId: 'internal-doc-cross-reference', sourceAuthority: 'REAL_BLOODMOON_RUNTIME', bloodMoonStatus: 'BLOODMOON_CONFIRMED', verificationStatus: 'CONFIRMED_BY_RUNTIME' }
const CODE = { sourceId: 'code-read-2026-09-18', sourceAuthority: 'CURRENT_CODE', bloodMoonStatus: 'BLOODMOON_CONFIRMED', verificationStatus: 'CONFIRMED_BY_CONFIG' }
const DECISION = { sourceId: 'internal-doc-cross-reference', sourceAuthority: 'INTERNAL_DECISION', bloodMoonStatus: 'BLOODMOON_CONFIRMED', verificationStatus: 'NOT_APPLICABLE' }

const newClaims = [
	C({
		claimId: 'CLAIM-149', ...RUNTIME,
		statement: 'On 2026-09-21 a read-only inspection of the production VPS showed the scheduled task BloodMoonGameBridgeAgent in state Ready (last run 2026-08-25T01:33:33Z, last task result 259, no missed runs) and exactly one BloodMoonGameBridgeAgent.exe process (PID 10388) running since 2026-08-25T01:33:22Z, from a single-file binary with sha256 5BED7747A6A9636C250B98C8DA575E2F27981C16576C588771E8349AB02AB33C (81,101,804 bytes, modified 2026-08-24T17:49:41Z, FileVersion 0.1.0.0, ProductVersion 0.1.0+20a0d71cda82b94c5bb492e3aa863c554831c65b); the secrets folder, logs, start script, task triggers and process command line were not read.',
		sourceLocation: `${EV}/raw/vps-01-agent-state.json (captured 2026-09-21T12:28:02Z via the audited RemoteOps wrapper, script ${EV}/tools/vps-readonly-inspection.ps1; one call)`,
		entityTypes: ['SYSTEM', 'DEPLOYMENT'],
		entities: ['BloodMoonGameBridgeAgent', 'GAME_COMMAND_TRANSPORT', 'WIN-K82J9TU944D'],
		topic: 'operations',
		verificationTargets: [{ type: 'runtime_observation', path: `${EV}/README.md` }],
		confidence: 'CONFIRMED_RUNTIME (read-only, 2026-09-21); task-vs-process relationship and reboot persistence NOT verified',
		notes: 'Task state Ready with a live process is unexplained by what was read (the start script and triggers were deliberately not opened). Historical deployment (2026-08-24) and this current observation are kept as separate events.'
	}),
	C({
		claimId: 'CLAIM-150',
		sourceId: 'synthesis-across-live-agent-and-git-history', sourceAuthority: 'INTERNAL_INFERENCE', bloodMoonStatus: 'BLOODMOON_LIKELY', verificationStatus: 'UNVERIFIED',
		statement: 'The deployed Agent binary was built on 2026-08-24 at 14:49:41 -0300 from the working tree one commit behind the transport commit 7b4fed13 (committed 14:55:10) plus its uncommitted changes -- its embedded commit 20a0d71c has no GameCommandWorker.cs although the running Agent polls for commands -- and because the extension handlers were first written on 2026-08-30 (e90c29df) the deployed Agent cannot contain GRANT_VIP, SYNC_VIP_TIER, ANONYMIZE_GAME_ACCOUNT or PURGE_GAME_ACCOUNT handlers (inference by chronology; the binary itself was not inspected).',
		sourceLocation: `${EV}/README.md; git log/show of 20a0d71c, 7b4fed13, e90c29df; CLAIM-149`,
		entityTypes: ['SYSTEM', 'DEPLOYMENT'],
		entities: ['BloodMoonGameBridgeAgent', 'GameCommandWorker', 'GRANT_VIP', '20a0d71c'],
		topic: 'operations',
		verificationTargets: [{ type: 'file_read', path: 'a read-only copy of the deployed executable, scanned for the extension command-type strings (not done: outside the authorised inspection list)' }],
		confidence: 'STRONG INFERENCE (chronology + git history); the binary was not disassembled or string-scanned',
		notes: 'Also explains why the four extension commands are not deployed even at the Agent: the Agent that is running predates them, in addition to the Worker code and the remote D1 CHECK rejecting them.'
	}),
	C({
		claimId: 'CLAIM-151', ...RUNTIME,
		statement: 'On 2026-09-21 the production D1 bloodmoon-game-data still had migrations 0001, 0002 and 0003 only and the CREATE-only game_command CHECK, still held exactly 2 commands (last activity 2026-08-25), showed the Agent heartbeat 23 seconds old with an empty buffer and 52 signed command:claim requests in the preceding ten minutes, and had received no Worker code upload since 2026-08-24T17:52Z; together with the VPS process running since 2026-08-25 the transport is live end to end for CREATE_GAME_ACCOUNT, with command traffic idle since 2026-08-25.',
		sourceLocation: `${EV}/raw/d1-01..06 (SELECT-only, captured 2026-09-21 about 12:29-12:31 UTC); ${EV}/raw/vps-01-agent-state.json`,
		entityTypes: ['SYSTEM', 'DEPLOYMENT'],
		entities: ['GAME_COMMAND_TRANSPORT', 'game_command', 'agent_heartbeats', 'bloodmoon-game-data'],
		topic: 'operations',
		verificationTargets: [{ type: 'runtime_observation', path: `${EV}/raw/` }],
		confidence: 'CONFIRMED_RUNTIME (2026-09-21); no command was sent, so a fresh command round trip was NOT demonstrated',
		notes: 'Re-confirms CLAIM-145 (2026-09-19) unchanged and adds the VPS half. Classification: CLOUDFLARE_SIDE ACTIVE, VPS_SIDE ACTIVE, END_TO_END_TRANSPORT ACTIVE (idle traffic); extensions NOT_DEPLOYED.'
	}),
	C({
		claimId: 'CLAIM-152', ...CODE,
		statement: 'The 12-file SQL extension folder (references/game-data/sql-discovery/gamebridge-extension-20260830/), never committed on any branch, was preserved on 2026-09-21 on the branch gamebridge/preserve-command-extension: 11 files byte-identical (commit 2d0f6106 artifacts, ddf50640 manifest) after a redacting secret review, while derived/local-writer-login.sql (a CREATE LOGIN with a PASSWORD literal; 2964 bytes, sha256 ce81991a92f0b8089cb423d353c562156d79d981bab76c0e63e1c05cdb15169f) was classified SECRET_BEARING and excluded; it stays untracked in the openbeta worktree; none of the SQL is installed on production.',
		sourceLocation: 'branch gamebridge/preserve-command-extension: references/game-data/sql-discovery/gamebridge-extension-20260830/PRESERVATION-MANIFEST.md; source mu-bloodmoon-v1-openbeta (untracked)',
		entityTypes: ['SYSTEM', 'DATABASE', 'DEPLOYMENT'],
		entities: ['bm_GrantVip', 'bm_SyncVipTier', 'bm_AnonymizeGameAccount', 'bm_PurgeGameAccount', 'bm_GameBridgeAudit', 'local-writer-login.sql'],
		topic: 'systems',
		verificationTargets: [{ type: 'file_read', path: 'PRESERVATION-MANIFEST.md on gamebridge/preserve-command-extension' }],
		confidence: 'CONFIRMED_STATIC_CODE_READ + sha256 comparison; "not installed on production" is documented, not re-verified against production SQL',
		notes: 'The password value of the excluded file was never printed (only its shape was checked; the folder README says it is a placeholder -- unverified). The phase-K review package procedure hashes are stale (files edited in Phase L). GAP-P20-10 resolved for the 11 preserved files; GAP-P20-11 tracks the excluded file.'
	}),
	C({
		claimId: 'CLAIM-153', ...CODE,
		statement: 'CREDIT_GAME_CURRENCY does not exist: there is no Portal command type, Worker route, D1 support, Agent handler or SQL procedure for it anywhere in the repository or the preserved material; of the four extension commands only their Portal types and, in committed source, their Agent handlers exist on main -- the Worker routing exists only on the preservation branch, the remote D1 rejects them and no procedure is installed -- so CREATE_GAME_ACCOUNT is the only deployed command type.',
		sourceLocation: `docs/gamebridge/worker-extension-preservation-manifest.md and references/.../gamebridge-extension-20260830/PRESERVATION-MANIFEST.md (on gamebridge/preserve-command-extension); ${EV}/raw/d1-02-game_command-ddl.json; apps/api/src/modules/game-account-identity/game-command-transport.client.ts`,
		entityTypes: ['SYSTEM', 'DEPLOYMENT'],
		entities: ['CREDIT_GAME_CURRENCY', 'GRANT_VIP', 'SYNC_VIP_TIER', 'ANONYMIZE_GAME_ACCOUNT', 'PURGE_GAME_ACCOUNT', 'CREATE_GAME_ACCOUNT'],
		topic: 'systems',
		verificationTargets: [{ type: 'file_read', path: 'apps/api/src/modules/game-account-identity/game-command-transport.client.ts' }],
		confidence: 'CONFIRMED_STATIC_CODE_READ (repository-wide search, this phase) + remote D1 DDL',
		notes: 'The Prisma GameBridgeOperation.CREDIT_CURRENCY value is the marketplace seller credit (no producer/consumer) and is unrelated. No placeholder implementation was created (decision recorded in CLAIM-154).'
	}),
	C({
		claimId: 'CLAIM-154', ...DECISION,
		statement: 'Bryan decided on 2026-09-21: Phase 20A is merged fast-forward into local main; the remaining untracked SQL is preserved except local-writer-login.sql, which stays excluded until a dedicated secret review; no lab GameServer is to be built now and GAME_CURRENCY_VISIBILITY stays UNKNOWN (currency delivery is out of scope for the initial Beta, no runnable lab exists, and introducing a closed-source runtime only for this evidence is not worth it now); CREDIT_GAME_CURRENCY must not be implemented; the remaining GameBridge terminology cleanup is documentation-only and non-blocking.',
		sourceLocation: 'Phase 20B brief (2026-09-21), decisions 1-8; docs/knowledge/GAME_CURRENCY_DELIVERY_ANALYSIS.md Part 15',
		entityTypes: ['SYSTEM', 'DECISION'],
		entities: ['GAME_CURRENCY_VISIBILITY', 'CREDIT_GAME_CURRENCY', 'local-writer-login.sql'],
		topic: 'systems',
		verificationTargets: [],
		confidence: 'CONFIRMED_OPERATOR (recorded decision)',
		notes: 'NOT_APPLICABLE verification: a decision record. It leaves CLAIM-129/147/148 unchanged (Portal WC target UNRESOLVED, Beta out of scope, Option B a direction only).'
	}),
	C({
		claimId: 'CLAIM-155', ...CODE,
		statement: 'The Agent kill switches are AgentOptions.GrantVipEnabled, SyncVipTierEnabled, AnonymizeEnabled and PurgeEnabled (all default false), bound from the Agent configuration section, which Program.cs also reads from environment variables carrying the prefix BLOODMOON_AGENT_ (for example BLOODMOON_AGENT_Agent__GrantVipEnabled); the names GAME_BRIDGE_GRANT_VIP_ENABLED and its siblings that the documents use appear only in comments and documents; no code or script reads an environment variable of that name (the tracked template deploy/game-bridge/Start-GameBridgeAgent.ps1 sets BLOODMOON_AGENT_Agent__* variables but none of the four switches).',
		sourceLocation: 'apps/game-bridge-agent/Program.cs:14-16; apps/game-bridge-agent/Configuration/AgentOptions.cs (SectionName = "Agent", the four switches); docs/gamebridge/gamebridge-agent-extension-plan.md:577-580; deploy/game-bridge/Start-GameBridgeAgent.ps1 (tracked template); comments at apps/api/prisma/schema.prisma:416 and apps/api/src/modules/vip-sync/vip-sync.service.ts:68',
		entityTypes: ['SYSTEM', 'CONFIG'],
		entities: ['AgentOptions', 'GrantVipEnabled', 'BLOODMOON_AGENT_', 'GAME_BRIDGE_GRANT_VIP_ENABLED'],
		topic: 'systems',
		verificationTargets: [{ type: 'file_read', path: 'apps/game-bridge-agent/Program.cs' }],
		confidence: 'CONFIRMED_STATIC_CODE_READ (the standard .NET double-underscore section separator; not exercised)',
		notes: 'Resolves the "env binding name not traced" note of GAMEBRIDGE_DISAMBIGUATION Part 3. Whether the production copy of Start-GameBridgeAgent.ps1 sets any switch was not read (only the tracked template was); the deployed build predates the switches anyway (CLAIM-150).'
	})
]

let added = 0
const ids = new Set(claimsDoc.claims.map((c) => c.claimId))
for (const c of newClaims) { if (ids.has(c.claimId)) { console.log(`SKIP claim ${c.claimId}`); continue } claimsDoc.claims.push(c); added++ }
const by = () => Object.fromEntries(claimsDoc.claims.map((c) => [c.claimId, c]))
let amended = 0
const amend = (id, fn) => { const c = by()[id]; if (!c) throw new Error('no ' + id); if ((c.notes || '').includes('[20B]')) { console.log(`SKIP amend ${id}`); return } fn(c); amended++ }
amend('CLAIM-145', (c) => { c.notes = '[20B] The VPS half that this claim leaves unverified was inspected read-only on 2026-09-21 (CLAIM-149) and the Cloudflare half re-verified unchanged (CLAIM-151); this claim stays as the 2026-09-19 point-in-time record. ' + (c.notes || '') })
amend('CLAIM-134', (c) => { c.notes = '[20B] Current state now verified on both halves (CLAIM-149, CLAIM-151); the deployed Agent build predates the extension (CLAIM-150). ' + (c.notes || '') })

// graph
const nodeIds = new Set(graph.nodes.map((n) => n.id)); const edgeKeys = new Set(graph.edges.map((e) => `${e.from}|${e.type}|${e.to}`))
let addedNodes = 0, addedEdges = 0
const addNode = (n) => { if (!nodeIds.has(n.id)) { graph.nodes.push(n); nodeIds.add(n.id); addedNodes++ } }
const addEdge = (e) => { const k = `${e.from}|${e.type}|${e.to}`; if (!edgeKeys.has(k)) { graph.edges.push(e); edgeKeys.add(k); addedEdges++ } }
addNode({ id: 'SYS-bloodmoon-gamebridge-agent-vps', type: 'SYSTEM', name: 'BloodMoonGameBridgeAgent on the game VPS (scheduled task + process)', bloodMoonStatus: 'BLOODMOON_CONFIRMED', note: 'running since 2026-08-25; build predates the extension (CLAIM-149/150)' })
addNode({ id: 'SRC-vps-d1-readonly-20260921', type: 'SOURCE', name: 'read-only VPS inspection + SELECT-only remote D1, 2026-09-21', sourceAuthority: 'REAL_BLOODMOON_RUNTIME' })
addNode({ id: 'SRC-sql-extension-preservation', type: 'SOURCE', name: 'gamebridge/preserve-command-extension: SQL artifacts + manifest (Phase 20B)', sourceAuthority: 'CURRENT_CODE' })
addEdge({ from: 'SYS-bloodmoon-gamebridge-agent-vps', type: 'RELATED_TO', to: 'SYS-game-command-transport' })
for (const id of ['CLAIM-149', 'CLAIM-151']) addEdge({ from: 'SRC-vps-d1-readonly-20260921', type: 'SUPPORTS_CLAIM', to: id })
for (const id of ['CLAIM-152', 'CLAIM-153']) addEdge({ from: 'SRC-sql-extension-preservation', type: 'SUPPORTS_CLAIM', to: id })
for (const [a, b] of [['CLAIM-150', 'CLAIM-149'], ['CLAIM-151', 'CLAIM-145'], ['CLAIM-152', 'CLAIM-146'], ['CLAIM-153', 'CLAIM-133'], ['CLAIM-154', 'CLAIM-148'], ['CLAIM-155', 'CLAIM-135']]) addEdge({ from: a, type: 'RELATED_TO', to: b })

// queue
const q = Object.fromEntries(queue.items.map((i) => [i.claimId, i]))
const SAFE = 'read-only VPS inspection through the audited wrapper (one call), SELECT-only remote D1, local git and file reads in Phase 20B; nothing executed, no command sent, no production write'
const done = [
	['CLAIM-149', 'HIGH', 'runtime_observation', 'Agent scheduled task, process and binary on the VPS', 'CONFIRMED_BY_RUNTIME (2026-09-21).', [`${EV}/raw/vps-01-agent-state.json`]],
	['CLAIM-151', 'HIGH', 'runtime_observation', 'remote D1 state and live polling', 'CONFIRMED_BY_RUNTIME (2026-09-21); no fresh command round trip demonstrated.', [`${EV}/raw/d1-04-agent_heartbeats.json`]],
	['CLAIM-152', 'HIGH', 'file_read', 'SQL extension inventory, secret review, preservation', 'CONFIRMED_BY_CONFIG -- 11 files byte-identical, 1 excluded as SECRET_BEARING.', ['PRESERVATION-MANIFEST.md on gamebridge/preserve-command-extension']],
	['CLAIM-153', 'HIGH', 'file_read', 'command deployment matrix; CREDIT_GAME_CURRENCY absence', 'CONFIRMED_BY_CONFIG -- only CREATE_GAME_ACCOUNT deployed; CREDIT_GAME_CURRENCY does not exist.', ['apps/api/src/modules/game-account-identity/game-command-transport.client.ts']],
	['CLAIM-155', 'LOW', 'file_read', 'kill-switch option names and environment binding', 'CONFIRMED_BY_CONFIG (static read).', ['apps/game-bridge-agent/Program.cs']]
]
let addedQ = 0
for (const [claimId, priority, verificationType, target, result, evidenceRefs] of done) { if (q[claimId]) continue; queue.items.push({ claimId, priority, verificationType, target, safeMethod: SAFE, status: 'DONE', result, evidenceRefs }); addedQ++ }
if (!q['CLAIM-150']) { queue.items.push({ claimId: 'CLAIM-150', priority: 'MEDIUM', verificationType: 'file_read', target: 'extension command-type strings inside a read-only copy of the deployed executable', safeMethod: 'download a read-only copy of BloodMoonGameBridgeAgent.exe (RemoteOps `bm-remote download`) and string-scan it locally -- not done: outside the Phase 20B authorised inspection list', status: 'QUEUED', result: 'QUEUED -- chronology already makes the conclusion strong; a string scan would make it proven.', evidenceRefs: [] }); addedQ++ }
const count = (s) => queue.items.filter((i) => i.status === s).length
queue.generatedAt = now
const p20b = queue.items.filter((i) => Number(i.claimId.replace('CLAIM-', '')) >= 149)
const baseNote = queue.summary.note.split(' Phase 20B (2026-09-21)')[0]
queue.summary = { ...queue.summary, total: queue.items.length, done: count('DONE'), queued: count('QUEUED'), blocked: count('BLOCKED'), inProgress: count('IN_PROGRESS'),
	note: `${baseNote} Phase 20B (2026-09-21) added ${p20b.length} items for CLAIM-149 and above (${p20b.filter((i) => i.status === 'DONE').length} DONE from a read-only VPS inspection, SELECT-only remote D1 and local reads; ${p20b.filter((i) => i.status === 'QUEUED').length} QUEUED: a string scan of a read-only copy of the deployed executable).` }

if (!checkpoint.phase20bCompleted) checkpoint.phase20bCompleted = [
	'Phase 20B (2026-09-21): Phase 20A merged fast-forward into local main; live Agent verified read-only on both halves (CLAIM-149..151); the extension SQL preserved except local-writer-login.sql (CLAIM-152); command deployment matrix and CREDIT_GAME_CURRENCY = DOES_NOT_EXIST (CLAIM-153); decisions (CLAIM-154); kill-switch binding traced (CLAIM-155). Claim total 148 -> 155.',
	'Re-run the three generators after any claim edit: knowledge-transcript-inventory.mjs, knowledge-canonical-facts.mjs --write, knowledge-provenance-report.mjs --write.'
]
checkpoint.lastUpdatedUtc = now
claimsDoc.generatedAt = now; graph.generatedAt = now
save('atomic-claims.json', claimsDoc); save('knowledge-graph.json', graph); save('verification-queue.json', queue); save('checkpoint.json', checkpoint)
console.log(`Added: ${added} claims, amended ${amended}, ${addedNodes} nodes, ${addedEdges} edges, ${addedQ} queue items.`)
