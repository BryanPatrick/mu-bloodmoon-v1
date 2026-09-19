#!/usr/bin/env node
// Phase 20A -- idempotent sync of the laboratory (WZ_SetCoin / CashShopData), live
// Agent/D1 (read-only) and preservation findings into the vendor-sweep machine
// artifacts: adds CLAIM-139..148, amends CLAIM-127/136/138 in place (visibly, with a
// [20A] marker in notes), updates the verification queue, graph and checkpoint.
// Same pattern as phase18d/phase20 scripts. Run from the repository root, then re-run
// the three generators.
//
// Evidence: references/game-data/sql-discovery/phase-20a-wz-setcoin-cashshopdata-lab-20260919/
//           references/game-data/sql-discovery/phase-20a-live-agent-d1-readonly-20260919/
//           docs/gamebridge/worker-extension-preservation-manifest.md (branch gamebridge/preserve-command-extension)
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

const LAB = 'references/game-data/sql-discovery/phase-20a-wz-setcoin-cashshopdata-lab-20260919'
const D1 = 'references/game-data/sql-discovery/phase-20a-live-agent-d1-readonly-20260919'
const BAK = '570d225ade6455755965c912039128864bdfd7167f6b0f5a52e12d90631db682'
const LABSRC = `lab restore (bloodmoon_gameserver_raw_analysis, local SQL Server 2022) of the 2026-07-16 production backup MuOnline_COPY_ONLY.bak (sha256 ${BAK}); read-only catalog reads on 2026-09-19; nothing executed, no row selected`
const C = (o) => ({ season: null, providerVersion: null, verificationTargets: [], notes: null, ...o })
const SQLREAD = { sourceId: 'real-config-read', sourceAuthority: 'REAL_BLOODMOON_SQL', bloodMoonStatus: 'BLOODMOON_CONFIRMED', verificationStatus: 'CONFIRMED_BY_SCHEMA' }
const LABCONF = 'CONFIRMED_RUNTIME (lab restore of the 2026-07-16 production backup; the procedure/table was NOT re-read on production and nothing was executed)'

const newClaims = [
	C({
		claimId: 'CLAIM-139', ...SQLREAD,
		statement: 'In the lab restore of the 2026-07-16 production backup, dbo.WZ_SetCoin(@Account, @Name, @Value1, @Value2, @Value3) ADDS each positive value to CashShopData (WCoinC = WCoinC + @Value1, WCoinP = WCoinP + @Value2, GoblinPoint = GoblinPoint + @Value3), ignores zero and negative values so it cannot subtract, inserts a row holding only that column when the account has none (the other columns take their default 0), uses no BEGIN TRAN (XACT_ABORT is ON but each statement autocommits and the three blocks are not atomic together), takes no lock (IF EXISTS then INSERT is racy: a concurrent first credit fails on the primary key), never uses @Name, and has no idempotency key, ledger, audit or return code, so calling it twice credits twice.',
		sourceLocation: `${LAB}/raw/01-WZ_SetCoin.definition.sql (sha256 d0094f7b29022838863a9eb52bfdcbd09ab622a3bd484c6bf13afc5e95323c5c; SQL-side UTF-16 hash FBE6AD49194B200BC4F495DDC29D73E32CAFADC7D79F4FA5AAE83CDB89B3F8C2); ${LABSRC}`,
		entityTypes: ['SYSTEM', 'CURRENCY', 'DATABASE'],
		entities: ['WZ_SetCoin', 'CashShopData', 'WCoinC', 'WCoinP', 'GoblinPoint'],
		topic: 'systems',
		verificationTargets: [{ type: 'schema_read', path: `${LAB}/raw/01-WZ_SetCoin.definition.sql` }],
		confidence: LABCONF,
		notes: 'Answers the Phase 20A questions: additive (not set), positive-only, insert-if-missing for this procedure, no transaction, no locking, no idempotency. The name SetCoin is misleading. The procedure was created/modified 2026-04-22 in the database. GAP-P20-05 evidence; a future credit command cannot rely on it for exactly-once (GAME_CURRENCY_DELIVERY_ANALYSIS.md Part 5).'
	}),
	C({
		claimId: 'CLAIM-140', ...SQLREAD,
		statement: 'In the lab restore, dbo.CashShopData is (AccountID varchar(10) NOT NULL with collation Latin1_General_CI_AS, WCoinC int NOT NULL DEFAULT 0, WCoinP int NOT NULL DEFAULT 0, GoblinPoint int NOT NULL DEFAULT 0) with a clustered primary key PK_TempCashShop on AccountID as its only index, and no CHECK constraint, no foreign key in either direction and no trigger, so negative balances are representable and rows can exist for accounts that are absent from MEMB_INFO.',
		sourceLocation: `${LAB}/raw/03-CashShopData.columns.txt, raw/04-CashShopData.keys-indexes-constraints.txt; ${LABSRC}`,
		entityTypes: ['DATABASE', 'CURRENCY'],
		entities: ['CashShopData', 'PK_TempCashShop', 'WCoinC', 'WCoinP', 'GoblinPoint'],
		topic: 'systems',
		verificationTargets: [{ type: 'schema_read', path: `${LAB}/raw/03-CashShopData.columns.txt` }],
		confidence: LABCONF,
		notes: 'Authoritative DDL for GAP-P20-05. Balances are 32-bit signed: a credit must check overflow. The case-insensitive collation means account comparison is case-insensitive. 4 rows in the restored copy (approximate).'
	}),
	C({
		claimId: 'CLAIM-141', ...SQLREAD,
		statement: 'Every stored procedure in the restored GameServer database that changes CashShopData balances is additive (col = col + value) -- WZ_SetCoin, WZ_SetExchangeReward, WZ_SetKD, WZ_CustomMonsterReward, WZ_SetRewardCastleSiege and WZ_SetRankingDay/Mon/Wek -- while three ranking procedures only run the no-op UPDATE GoblinPoint = GoblinPoint; no procedure sets an absolute balance, none subtracts (no debit procedure exists), and only WZ_SetCoin inserts a missing row: the others silently credit nothing to an account that has no row.',
		sourceLocation: `${LAB}/raw/05-modules-referencing-CashShopData.txt, raw/06-related-vendor-procedures.definitions.txt, raw/10-ranking-reward-procedures.definitions.txt; ${LABSRC}`,
		entityTypes: ['SYSTEM', 'CURRENCY', 'DATABASE'],
		entities: ['WZ_SetCoin', 'WZ_SetExchangeReward', 'WZ_SetKD', 'WZ_CustomMonsterReward', 'WZ_SetRewardCastleSiege', 'WZ_SetRankingDay', 'CashShopData'],
		topic: 'systems',
		verificationTargets: [{ type: 'schema_read', path: `${LAB}/raw/06-related-vendor-procedures.definitions.txt` }],
		confidence: LABCONF,
		notes: 'Eleven modules reference the table (sys.sql_expression_dependencies). How the closed-source GameServer itself debits a balance is NOT visible: no procedure does it, so it must use SQL text from the engine or memory. Vendor mechanisms are delta-based, which is the model an external credit should follow.'
	}),
	C({
		claimId: 'CLAIM-142', ...SQLREAD,
		statement: 'The vendor procedures label the same three balances Cash | WCoinC, Gold | WCoinP and PcPoints | GoblinPoint and keep commented Season 4 alternatives that write MEMB_INFO.Cash, MEMB_INFO.Gold and PcPointData.PcPoint instead of CashShopData.WCoinC, WCoinP and GoblinPoint (WZ_SetCoin, WZ_SetExchangeReward, WZ_SetKD for Cash and Gold, WZ_SetRewardCastleSiege, WZ_SetRankingDay/Mon/Wek), confirming first-hand that Cash/Gold/PcPoint are the Season 4 names of the balances that Season 6/8 store as WCoinC/WCoinP/GoblinPoint, slot for slot.',
		sourceLocation: `${LAB}/raw/01-WZ_SetCoin.definition.sql, raw/06-related-vendor-procedures.definitions.txt, raw/10-ranking-reward-procedures.definitions.txt; ${LABSRC}`,
		entityTypes: ['SYSTEM', 'CURRENCY'],
		entities: ['Cash', 'Gold', 'PcPoint', 'WCoinC', 'WCoinP', 'GoblinPoint', 'PcPointData', 'WZ_SetExchangeReward'],
		topic: 'systems',
		verificationTargets: [{ type: 'schema_read', path: `${LAB}/raw/06-related-vendor-procedures.definitions.txt` }],
		confidence: LABCONF,
		notes: 'Upgrades GAP-P18-11 pairs Gold<->WCoinP and PcPoint<->GoblinPoint from STRONGLY_SUPPORTED to CONFIRMED (several independent first-hand procedures plus CLAIM-125/126). Says nothing about what Portal WC is: PORTAL_WC_TARGET_GAME_CURRENCY stays UNRESOLVED (CLAIM-129).'
	}),
	C({
		claimId: 'CLAIM-143', ...SQLREAD,
		statement: 'The vendor procedure WZ_SetRewardCastleSiege selects the guild members to reward through MEMB_STAT.ConnectStat = 1 (players who are online) and credits them WCoinC/WCoinP/GoblinPoint by a plain additive SQL UPDATE on CashShopData; nothing in the database shows whether the GameServer keeps its own in-memory copy of a balance.',
		sourceLocation: `${LAB}/raw/06-related-vendor-procedures.definitions.txt (WZ_SetRewardCastleSiege); ${LABSRC}`,
		entityTypes: ['SYSTEM', 'CURRENCY', 'DATABASE'],
		entities: ['WZ_SetRewardCastleSiege', 'MEMB_STAT', 'CashShopData'],
		topic: 'systems',
		verificationTargets: [{ type: 'schema_read', path: `${LAB}/raw/06-related-vendor-procedures.definitions.txt` }],
		confidence: LABCONF,
		notes: 'INFERENCE, kept out of the statement: the vendor itself applies additive SQL credits to online players, which makes an engine that flushes a stale in-memory balance over them at logout less likely -- but this is NOT proof and CLAIM-136 (visibility/overwrite of an external write) stays UNKNOWN.'
	}),
	C({
		claimId: 'CLAIM-144', ...SQLREAD,
		statement: 'In the lab restore, dbo.CustomPlayToEarn(Account varchar(10) NOT NULL, WCoinC int, WCoinP int, GoblinPoint int, each NOT NULL DEFAULT 0, clustered primary key PK_CustomPlayToEarn on Account) is a second table holding the same three balances; it has 0 rows and is referenced by no stored procedure, view or trigger, so its role is unknown.',
		sourceLocation: `${LAB}/raw/07-CustomPlayToEarn.catalog.txt; ${LABSRC}`,
		entityTypes: ['DATABASE', 'CURRENCY'],
		entities: ['CustomPlayToEarn', 'WCoinC', 'WCoinP', 'GoblinPoint'],
		topic: 'systems',
		verificationTargets: [{ type: 'schema_read', path: `${LAB}/raw/07-CustomPlayToEarn.catalog.txt` }],
		confidence: LABCONF,
		notes: 'Any design that assumes CashShopData is the only balance store must first rule this table out (probably a play-to-earn accrual read by the engine directly -- INFERENCE).'
	}),
	C({
		claimId: 'CLAIM-145',
		sourceId: DOCX_ID(), sourceAuthority: 'REAL_BLOODMOON_RUNTIME', bloodMoonStatus: 'BLOODMOON_CONFIRMED', verificationStatus: 'CONFIRMED_BY_RUNTIME',
		statement: 'Read-only queries on 2026-09-19 show that the production D1 bloodmoon-game-data has migrations 0001, 0002 and 0003 applied and not 0004, that its game_command table still has CHECK (command_type = CREATE_GAME_ACCOUNT) with NOT NULL credential columns (so the database itself rejects the four extension command types), that it holds exactly 2 commands ever (both CREATE_GAME_ACCOUNT, SUCCEEDED, last activity 2026-08-25), that the Agent gamebridge-agent-01 heartbeat was 14 seconds old with an empty buffer, that about 52 signed command:claim requests fell in the preceding 10 minutes, and that no Worker code version was uploaded after 2026-08-24T17:52Z (every later version is a Secret Change); the VPS-side task, process and binary were not inspected.',
		sourceLocation: `${D1}/raw/01..08 (captured 2026-09-19 ~14:10 UTC via the local authenticated wrangler session, SELECT-only); the VPS-side SSH inspection was blocked by the session permission classifier and not retried`,
		entityTypes: ['SYSTEM', 'DEPLOYMENT'],
		entities: ['GAME_COMMAND_TRANSPORT', 'game_command', 'agent_heartbeats', 'bloodmoon-game-data', 'gamebridge-agent-01'],
		topic: 'operations',
		verificationTargets: [{ type: 'runtime_observation', path: 'read-only SSH inspection of the VPS scheduled task BloodMoonGameBridgeAgent, process start time and binary sha256 -- not done (needs permission)' }],
		confidence: 'CONFIRMED_RUNTIME (Cloudflare side, 2026-09-19); VPS side UNVERIFIED',
		notes: 'Supersedes the "current state not re-verified" caveat of CLAIM-134 for the Cloudflare half; the Agent version/hash is still unknown. Point-in-time: heartbeat age changes by the second.'
	}),
	C({
		claimId: 'CLAIM-146',
		sourceId: CODE_ID(), sourceAuthority: 'CURRENT_CODE', bloodMoonStatus: 'BLOODMOON_CONFIRMED', verificationStatus: 'CONFIRMED_BY_CONFIG',
		statement: 'The only copy of the Worker code for GRANT_VIP, SYNC_VIP_TIER, ANONYMIZE_GAME_ACCOUNT and PURGE_GAME_ACCOUNT (src/commands.ts blob 66f5fe17, db/schema.sql 48ffcf6d, test/commands.spec.ts 53ea1b5a, +313/-43 over main) was uncommitted in the mu-bloodmoon-v1-openbeta worktree; on 2026-09-19 it was preserved byte-identically on the branch gamebridge/preserve-command-extension (commits 3e69937e and 6003c59a, based on main c1b34062, not merged and not deployed), where tsc reports 0 errors and the Worker suite passes 55/55 (commands.spec 25/25); the four SQL procedures of the extension remain untracked in that worktree.',
		sourceLocation: 'branch gamebridge/preserve-command-extension; docs/gamebridge/worker-extension-preservation-manifest.md on that branch; git hash-object comparison source vs preserved; vitest and tsc run 2026-09-19',
		entityTypes: ['SYSTEM', 'DEPLOYMENT'],
		entities: ['GAME_COMMAND_TRANSPORT', 'commands.ts', 'GRANT_VIP', 'gamebridge/preserve-command-extension'],
		topic: 'systems',
		verificationTargets: [{ type: 'file_read', path: 'docs/gamebridge/worker-extension-preservation-manifest.md (on gamebridge/preserve-command-extension)' }],
		confidence: 'CONFIRMED_STATIC_CODE_READ + a real test run (Worker only; the Agent .NET suite and SQL integration tests were not re-run)',
		notes: 'Preservation does not make the code current or canonical. Remaining loss risk: references/game-data/sql-discovery/gamebridge-extension-20260830/ (11 SQL files, one flagged for secret review) is still untracked in openbeta (GAP-P20-02).'
	}),
	C({
		claimId: 'CLAIM-147',
		sourceId: DOCX_ID(), sourceAuthority: 'INTERNAL_DECISION', bloodMoonStatus: 'BLOODMOON_CONFIRMED', verificationStatus: 'NOT_APPLICABLE',
		statement: 'Bryan decided on 2026-09-19 that the initial Beta does not require automatic Portal WC to game-currency delivery (BETA_INITIAL_GAME_CURRENCY_DELIVERY = OUT_OF_SCOPE): the Beta product path stays BRL to provider to Portal WC to Portal-side products and VIP, automatic game-currency credit is future scope, existing VIP commercial decisions are unchanged, and the Portal WC target game currency remains UNRESOLVED and must not be silently mapped to WCoinC.',
		sourceLocation: 'Phase 20A brief (2026-09-19), decisions 2-3; docs/knowledge/GAME_CURRENCY_DELIVERY_ANALYSIS.md Part 14',
		entityTypes: ['SYSTEM', 'CURRENCY', 'DECISION'],
		entities: ['WCOIN', 'WCoinC', 'BETA_INITIAL_GAME_CURRENCY_DELIVERY'],
		topic: 'systems',
		verificationTargets: [],
		confidence: 'CONFIRMED_OPERATOR (recorded decision)',
		notes: 'NOT_APPLICABLE verification: a decision record (same treatment as CLAIM-122/129). Relaxes nothing in CLAIM-129 and closes no gap: GAP-P20-01 stays open as a future-scope decision.'
	}),
	C({
		claimId: 'CLAIM-148',
		sourceId: DOCX_ID(), sourceAuthority: 'INTERNAL_DECISION', bloodMoonStatus: 'BLOODMOON_CONFIRMED', verificationStatus: 'NOT_APPLICABLE',
		statement: 'Bryan accepted on 2026-09-19 Option B -- the controlled GAME_COMMAND_TRANSPORT boundary rather than apps/api writing the game database directly -- as the preferred architectural DIRECTION for a future game-currency delivery mechanism (GAME_CURRENCY_DELIVERY_DIRECTION = OPTION_B); this is not implementation approval (GAME_CURRENCY_DELIVERY_IMPLEMENTATION_APPROVED = NO), prerequisites P1-P9 remain mandatory, and the chargeback-after-game-delivery policy is unresolved and blocks any public currency-delivery enablement.',
		sourceLocation: 'Phase 20A brief (2026-09-19), decisions 4 and 9; docs/knowledge/GAME_CURRENCY_DELIVERY_ANALYSIS.md Parts 11-14',
		entityTypes: ['SYSTEM', 'DECISION'],
		entities: ['GAME_COMMAND_TRANSPORT', 'CREDIT_GAME_CURRENCY', 'GAME_CURRENCY_DELIVERY_DIRECTION'],
		topic: 'systems',
		verificationTargets: [],
		confidence: 'CONFIRMED_OPERATOR (recorded decision; direction only)',
		notes: 'NOT_APPLICABLE verification: a decision record. It does not close GAP-P20-01/02/03/04: accepting a direction does not answer the target-currency, deployment, idempotency or visibility questions.'
	})
]
function DOCX_ID() { return 'internal-doc-cross-reference' }
function CODE_ID() { return 'code-read-2026-09-18' }

// ------------------------------------------------------------- claims: add + amend
let added = 0
const ids = new Set(claimsDoc.claims.map((c) => c.claimId))
for (const c of newClaims) {
	if (ids.has(c.claimId)) { console.log(`SKIP claim ${c.claimId}`); continue }
	claimsDoc.claims.push(c); added++
}
const byId = () => Object.fromEntries(claimsDoc.claims.map((c) => [c.claimId, c]))
let amended = 0
const amend = (id, fn) => { const c = byId()[id]; if (!c) throw new Error(`no ${id}`); if ((c.notes || '').includes('[20A]')) { console.log(`SKIP amend ${id}`); return } fn(c); amended++ }

amend('CLAIM-127', (c) => {
	c.statement = 'The dbo.WZ_SetCoin stored procedure labels its first value Cash | WCoinC, its second Gold | WCoinP and its third PcPoints | GoblinPoint (comments "Tipo 1/2/3: Update ..."), and writes CashShopData.WCoinC / WCoinP / GoblinPoint respectively -- read first-hand from the lab restore of the 2026-07-16 production backup since Phase 20A, and quoted second-hand from an earlier phase document before that.'
	c.sourceAuthority = 'REAL_BLOODMOON_SQL'
	c.bloodMoonStatus = 'BLOODMOON_CONFIRMED'
	c.verificationStatus = 'CONFIRMED_BY_SCHEMA'
	c.sourceLocation = `${LAB}/raw/01-WZ_SetCoin.definition.sql; ${LABSRC}; originally quoted in context/preservation/openbeta-untracked/docs/economy/xshop-commercial-review.md lines 43-52`
	c.verificationTargets = [{ type: 'schema_read', path: `${LAB}/raw/01-WZ_SetCoin.definition.sql` }]
	c.confidence = LABCONF
	c.notes = '[20A] Amended 2026-09-19: was UNVERIFIED and second-hand (the body was not preserved in the repository); the lab read was authorized by Bryan and the body is now preserved with hashes. The earlier quote paraphrased the comments; the exact text is "-- Tipo 1: Update Cash | WCoinC" etc. Semantics of the procedure (additive, positive-only, no idempotency): CLAIM-139. ' + (c.notes || '')
})
amend('CLAIM-136', (c) => {
	c.notes = '[20A] Phase 20A added first-hand DB-side evidence (CLAIM-139/141/143): the vendor procedures are additive deltas and one of them credits online players by plain SQL, which weakens -- but does not remove -- the hypothesis that the GameServer overwrites an external credit from an in-memory copy. Visibility timing (immediate / reopen / relog / map change / reload) remains UNKNOWN: the lab has no runnable GameServer, ODBC DSN or client (only a staged file copy at MU-Server/Lab/drop-validation/MuServer-stage), so no test was performed. ' + (c.notes || '')
})
amend('CLAIM-138', (c) => {
	c.notes = '[20A] Canonical distinction (2026-09-19): SQL_ACK = the stored procedure committed; GAME_ACK = the GameServer/client observed or applied the effect. GAME_COMMAND_TRANSPORT proves SQL_ACK only; GAME_ACK is not claimed anywhere and no mechanism for it exists. ' + (c.notes || '')
})

// ------------------------------------------------------------- graph
const nodeIds = new Set(graph.nodes.map((n) => n.id))
const edgeKey = (e) => `${e.from}|${e.type}|${e.to}`
const edgeKeys = new Set(graph.edges.map(edgeKey))
let addedNodes = 0, addedEdges = 0
const addNode = (n) => { if (!nodeIds.has(n.id)) { graph.nodes.push(n); nodeIds.add(n.id); addedNodes++ } }
const addEdge = (e) => { if (!edgeKeys.has(edgeKey(e))) { graph.edges.push(e); edgeKeys.add(edgeKey(e)); addedEdges++ } }
addNode({ id: 'SYS-wz-setcoin', type: 'SYSTEM', name: 'dbo.WZ_SetCoin (vendor stored procedure)', bloodMoonStatus: 'BLOODMOON_CONFIRMED', note: 'additive, positive-only, insert-if-missing, no transaction/lock/idempotency (CLAIM-139)' })
addNode({ id: 'SYS-cashshopdata', type: 'SYSTEM', name: 'dbo.CashShopData (WCoinC/WCoinP/GoblinPoint per account)', bloodMoonStatus: 'BLOODMOON_CONFIRMED', note: 'DDL CLAIM-140; eleven modules reference it (CLAIM-141)' })
addNode({ id: 'SRC-lab-cashshop-procedures', type: 'SOURCE', name: 'lab restore of the 2026-07-16 production backup: WZ_SetCoin, CashShopData DDL and related procedures (Phase 20A, read-only)', sourceAuthority: 'REAL_BLOODMOON_SQL' })
addNode({ id: 'SRC-d1-live-readonly-20260919', type: 'SOURCE', name: 'read-only remote D1 / Worker deployment state, 2026-09-19', sourceAuthority: 'REAL_BLOODMOON_RUNTIME' })
addEdge({ from: 'SYS-wz-setcoin', type: 'CONFIGURED_BY', to: 'SYS-cashshopdata' })
addEdge({ from: 'SYS-wz-setcoin', type: 'RELATED_TO', to: 'SYS-game-command-transport' })
for (const id of ['CLAIM-139', 'CLAIM-140', 'CLAIM-141', 'CLAIM-142', 'CLAIM-143', 'CLAIM-144', 'CLAIM-127']) addEdge({ from: 'SRC-lab-cashshop-procedures', type: 'SUPPORTS_CLAIM', to: id })
addEdge({ from: 'SRC-d1-live-readonly-20260919', type: 'SUPPORTS_CLAIM', to: 'CLAIM-145' })
for (const [a, b] of [['CLAIM-139', 'CLAIM-127'], ['CLAIM-141', 'CLAIM-139'], ['CLAIM-142', 'CLAIM-125'], ['CLAIM-143', 'CLAIM-136'], ['CLAIM-145', 'CLAIM-134'], ['CLAIM-146', 'CLAIM-133'], ['CLAIM-147', 'CLAIM-129'], ['CLAIM-148', 'CLAIM-135']]) addEdge({ from: a, type: 'RELATED_TO', to: b })

// ------------------------------------------------------------- verification queue
const q = Object.fromEntries(queue.items.map((i) => [i.claimId, i]))
const SAFE = 'read-only catalog reads of the local lab restore / SELECT-only remote D1 in Phase 20A; nothing executed, no production write'
let addedQ = 0, updatedQ = 0
if (q['CLAIM-127'] && q['CLAIM-127'].status !== 'DONE') {
	Object.assign(q['CLAIM-127'], { status: 'DONE', safeMethod: SAFE, result: 'CONFIRMED_BY_SCHEMA -- body read first-hand from the lab restore and preserved with hashes (raw/01); comments confirm Cash|WCoinC, Gold|WCoinP, PcPoints|GoblinPoint (Phase 20A, authorized by Bryan).', evidenceRefs: [`${LAB}/raw/01-WZ_SetCoin.definition.sql`] })
	updatedQ++
}
if (q['CLAIM-136'] && !String(q['CLAIM-136'].result).includes('[20A]')) {
	q['CLAIM-136'].result = '[20A] BLOCKED -- no runnable lab GameServer, ODBC DSN or client (MU-Server/Lab/drop-validation/MuServer-stage is a staged file copy only, no GameServer process); production must not be used. A test design is recorded in GAME_CURRENCY_DELIVERY_ANALYSIS.md Part 8. ' + q['CLAIM-136'].result
	updatedQ++
}
const done = [
	['CLAIM-139', 'HIGH', 'schema_read', 'WZ_SetCoin body semantics', 'CONFIRMED_BY_SCHEMA -- additive, positive-only, insert-if-missing, no transaction/lock/idempotency.', [`${LAB}/raw/01-WZ_SetCoin.definition.sql`]],
	['CLAIM-140', 'HIGH', 'schema_read', 'CashShopData DDL', 'CONFIRMED_BY_SCHEMA -- PK PK_TempCashShop, defaults 0, no constraints/FK/trigger.', [`${LAB}/raw/03-CashShopData.columns.txt`, `${LAB}/raw/04-CashShopData.keys-indexes-constraints.txt`]],
	['CLAIM-141', 'HIGH', 'schema_read', 'all modules touching CashShopData', 'CONFIRMED_BY_SCHEMA -- eight additive procedures, three no-op placeholders, no set-absolute and no debit procedure.', [`${LAB}/raw/05-modules-referencing-CashShopData.txt`, `${LAB}/raw/06-related-vendor-procedures.definitions.txt`, `${LAB}/raw/10-ranking-reward-procedures.definitions.txt`]],
	['CLAIM-142', 'HIGH', 'schema_read', 'Cash/Gold/PcPoint vs WCoinC/WCoinP/GoblinPoint in vendor procedure comments', 'CONFIRMED_BY_SCHEMA -- slot-for-slot naming, Season 4 vs Season 6/8.', [`${LAB}/raw/06-related-vendor-procedures.definitions.txt`]],
	['CLAIM-143', 'MEDIUM', 'schema_read', 'WZ_SetRewardCastleSiege online selection', 'CONFIRMED_BY_SCHEMA (procedure text); the in-memory-copy interpretation is inference only.', [`${LAB}/raw/06-related-vendor-procedures.definitions.txt`]],
	['CLAIM-144', 'LOW', 'schema_read', 'CustomPlayToEarn catalog', 'CONFIRMED_BY_SCHEMA -- 0 rows, unreferenced.', [`${LAB}/raw/07-CustomPlayToEarn.catalog.txt`]],
	['CLAIM-145', 'HIGH', 'runtime_observation', 'remote D1 migrations, game_command DDL/aggregate, heartbeat, nonce activity, Worker versions', 'CONFIRMED_BY_RUNTIME (Cloudflare side, 2026-09-19, SELECT-only); VPS side UNVERIFIED.', [`${D1}/raw/02-d1-migrations-applied.json`, `${D1}/raw/05-agent_heartbeats.json`]],
	['CLAIM-146', 'HIGH', 'file_read', 'preserved Worker extension: hashes, tsc, vitest', 'CONFIRMED_BY_CONFIG -- byte-identical preservation; tsc 0 errors; Worker suite 55/55.', ['docs/gamebridge/worker-extension-preservation-manifest.md (on gamebridge/preserve-command-extension)']]
]
for (const [claimId, priority, verificationType, target, result, evidenceRefs] of done) {
	if (q[claimId]) continue
	queue.items.push({ claimId, priority, verificationType, target, safeMethod: SAFE, status: 'DONE', result, evidenceRefs }); addedQ++
}
const count = (s) => queue.items.filter((i) => i.status === s).length
queue.generatedAt = now
const p20a = queue.items.filter((i) => Number(i.claimId.replace('CLAIM-', '')) >= 139)
const baseNote = queue.summary.note.split(' Phase 20A (2026-09-19)')[0]
queue.summary = {
	...queue.summary, total: queue.items.length, done: count('DONE'), queued: count('QUEUED'), blocked: count('BLOCKED'), inProgress: count('IN_PROGRESS'),
	note: `${baseNote} Phase 20A (2026-09-19) added ${p20a.length} items for CLAIM-139 and above (all DONE from read-only lab catalog reads, SELECT-only remote D1 and a preserved-code test run) and closed the CLAIM-127 item; the CLAIM-136 item stays BLOCKED because no runnable lab GameServer exists.`
}

// ------------------------------------------------------------- checkpoint
if (!checkpoint.phase20aCompleted) {
	checkpoint.phase20aCompleted = [
		'Phase 20A (2026-09-19): read-only lab evidence for WZ_SetCoin/CashShopData (CLAIM-139..144, CLAIM-127 amended to first-hand), SELECT-only remote D1 state (CLAIM-145), Worker extension preservation (CLAIM-146), and Bryan\'s Beta-scope and Option B direction decisions (CLAIM-147/148). Claim total 138 -> 148.',
		'Re-run the three generators after any claim edit: knowledge-transcript-inventory.mjs, knowledge-canonical-facts.mjs --write, knowledge-provenance-report.mjs --write.'
	]
}
checkpoint.lastUpdatedUtc = now

claimsDoc.generatedAt = now
graph.generatedAt = now
save('atomic-claims.json', claimsDoc)
save('knowledge-graph.json', graph)
save('verification-queue.json', queue)
save('checkpoint.json', checkpoint)
console.log(`Added: ${added} claims, amended ${amended}, ${addedNodes} graph nodes, ${addedEdges} graph edges, ${addedQ} queue items added, ${updatedQ} updated.`)
