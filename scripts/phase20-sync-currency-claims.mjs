#!/usr/bin/env node
// Phase 20 -- one-time, idempotent sync of the currency-semantics and
// command-channel findings into the vendor-sweep machine artifacts
// (CLAIM-125..138). Same pattern as scripts/phase18d-sync-buyvip-claims.mjs:
// claims are agent-authored from direct reads (there is no automated claim
// extractor), then the three generators are re-run.
//
// Evidence order: real Blood Moon config > vendor documentation > current
// code/documents > inference. Nothing here is stronger than what was read;
// second-hand evidence is marked UNVERIFIED.
//
// Touches: atomic-claims.json, knowledge-graph.json, verification-queue.json,
// checkpoint.json. Does NOT touch knowledge-index.json (no new KI source: the
// sources are configs, code and documents, not registered videos) or the
// generator-owned files (transcript-inventory, priority-queues,
// canonical-facts, provenance-report) -- re-run those generators afterwards.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'

const REPO = process.cwd()
const ROOT = join(REPO, 'knowledge', 'vendor-sweep')
const MU_ROOT = resolve(REPO, '..')
const now = new Date().toISOString()
const load = (n) => JSON.parse(readFileSync(join(ROOT, n), 'utf8'))
const save = (n, d) => writeFileSync(join(ROOT, n), JSON.stringify(d, null, 2) + '\n')

const claimsDoc = load('atomic-claims.json')
const graph = load('knowledge-graph.json')
const queue = load('verification-queue.json')
const checkpoint = load('checkpoint.json')

// sha256 of the exact preserved files that were read; skipped (not invented) if the
// research tree is not on this machine.
const sha = (rel) => {
	const p = join(MU_ROOT, rel)
	return existsSync(p) ? createHash('sha256').update(readFileSync(p)).digest('hex') : 'file not present on this machine'
}
const AUCTION = 'RemoteData/Phase6/CustomEventAuction.txt'
const MSG = 'RemoteData/Phase10/Message.utf8.txt'
const CMD = 'RemoteData/Phase11/GameServerInfo - Command.readable.txt'
const ONLINE = 'RemoteData/Phase11/CustomCoinsOnline.readable.txt'
const AUCTION_SHA = sha(AUCTION)
const MSG_SHA = sha(MSG)
const CMD_SHA = sha(CMD)
const ONLINE_SHA = sha(ONLINE)

const REAL = 'real-config-read'
const CODE = 'code-read-2026-09-18'
const DOCX = 'internal-doc-cross-reference'
const C = (o) => ({ season: null, providerVersion: null, verificationTargets: [], notes: null, ...o })
const SNAP = 'preserved snapshot, read 2026-09-18; not re-read live'

const newClaims = [
	C({
		claimId: 'CLAIM-125',
		statement: 'Blood Moon\'s real CustomEventAuction.txt documents its CoinType column as 0 = zen, 1 = Cash/WCoinc, 2 = Gold/WCoinP, 3 = PcPoint/GoblonPoint, 4 = Item -- an explicit pairing of the two currency name sets, slot for slot, written in the file itself (which spells "WCoinc" and "GoblonPoint"; who authored the comment is not established, it reads like the vendor\'s template).',
		sourceId: REAL,
		sourceAuthority: 'REAL_BLOODMOON_CONFIG',
		sourceLocation: `${AUCTION} lines 11-16 (sha256 ${AUCTION_SHA}); ${SNAP} (Phase 6 download, 2026-08-27)`,
		entityTypes: ['SYSTEM', 'CURRENCY', 'CONFIG'],
		entities: ['CustomEventAuction', 'WCoinC', 'WCoinP', 'GoblinPoint', 'Cash', 'Gold', 'PcPoint'],
		topic: 'systems',
		bloodMoonStatus: 'BLOODMOON_CONFIRMED',
		verificationStatus: 'CONFIRMED_BY_CONFIG',
		verificationTargets: [{ type: 'file_read', path: AUCTION }],
		confidence: `CONFIRMED_RUNTIME (${SNAP})`,
		notes: 'The strongest single source for GAP-P18-11. Note the indexing: this file numbers the slots 1-3 with 0 = zen (CLAIM-128). The comment is part of Blood Moon\'s live config file; who wrote it (vendor template vs an edit) is not established, but either way it is the server\'s own statement of the equivalence. Resolves GAP-P18-11 together with CLAIM-126/127. Analysis: docs/knowledge/CURRENCY_TERMINOLOGY.md.'
	}),
	C({
		claimId: 'CLAIM-126',
		statement: 'Blood Moon\'s real message table uses both currency label families for the same triple of balances -- "WCoinC/WCoinP/GoblinPoint" (ids 632, 780, 819) and "Cash/Gold/PcPoint" (ids 980, 1033, 1145), with both names in one string in id 1140 ("Cash/WCoinC") -- and the native /util command names its three coin operands Cash, Gold and PcPoint (disabled: CommandUtilSwitch = 0); no preserved Blood Moon file, searched vendor document or repository document treats the two name sets as different balances.',
		sourceId: REAL,
		sourceAuthority: 'REAL_BLOODMOON_CONFIG',
		sourceLocation: `${MSG} ids 632, 780, 819, 980, 1033, 1140, 1145 (sha256 ${MSG_SHA}); ${CMD} lines 691, 706-710 (sha256 ${CMD_SHA}); ${SNAP} (Phase 10 download 2026-08-28, Phase 11 download 2026-08-29)`,
		entityTypes: ['SYSTEM', 'CURRENCY', 'CONFIG', 'COMMAND'],
		entities: ['Message.txt', 'CommandUtil', 'WCoinC', 'WCoinP', 'GoblinPoint', 'Cash', 'Gold', 'PcPoint'],
		topic: 'systems',
		bloodMoonStatus: 'BLOODMOON_CONFIRMED',
		verificationStatus: 'CONFIRMED_BY_CONFIG',
		verificationTargets: [{ type: 'file_read', path: `${MSG}; ${CMD}` }],
		confidence: `CONFIRMED_RUNTIME (${SNAP}); the "no source separates them" part is a negative result over the searched scope (RemoteData Phase 6/10/11, the vendor tutorials, repository docs), not a proof`,
		notes: 'Corrects GAP-P18-11\'s earlier sentence that Blood Moon used only the WCoin/GoblinPoint names. Message id 1140 pairs "Cash/WCoinC" in one sentence -- an independent first-hand pairing for slot 1 only.'
	}),
	C({
		claimId: 'CLAIM-127',
		statement: 'The WZ_SetCoin stored procedure\'s own inline comments, as quoted in an earlier phase\'s preserved document, label @Value1 "Cash | WCoinC", @Value2 "Gold | WCoinP" and @Value3 "PcPoints | GoblinPoint", and it writes CashShopData.WCoinC / WCoinP / GoblinPoint respectively; the procedure body itself is not preserved in this repository.',
		sourceId: DOCX,
		sourceAuthority: 'PROVIDER_DOCUMENTATION',
		sourceLocation: 'context/preservation/openbeta-untracked/docs/economy/xshop-commercial-review.md lines 43-52 (quoting a read of the procedure in the local GameServer database lab); stored-procedures.md:88 and cashshop-commercial-review.md:65-75 for the target columns',
		entityTypes: ['SYSTEM', 'CURRENCY', 'DATABASE'],
		entities: ['WZ_SetCoin', 'CashShopData', 'WCoinC', 'WCoinP', 'GoblinPoint'],
		topic: 'systems',
		bloodMoonStatus: 'BLOODMOON_LIKELY',
		verificationStatus: 'UNVERIFIED',
		verificationTargets: [{ type: 'schema_read', path: 'sys.sql_modules for dbo.WZ_SetCoin in the LAB database -- read-only; requires Bryan\'s authorization, not done in Phase 20' }],
		confidence: 'STRONG_EVIDENCE (SECOND-HAND: a preserved document quoting a lab-database read; the raw procedure text was searched for and not found in this repository)',
		notes: 'The comments are procedure source (so almost certainly vendor-written, not confirmed), this phase did not see them first-hand and the lab is not production. Add-vs-set semantics of the procedure are NOT preserved (GAP-P20-05). The first-hand pairing evidence is CLAIM-125/126; this claim is corroboration.'
	}),
	C({
		claimId: 'CLAIM-128',
		statement: 'Currency-slot numbering is not uniform across Blood Moon\'s subsystems: CustomEventAuction.txt CoinType is 1-3 with 0 = zen; CustomCoinsOnline.txt carries CoinType rows 0, 1 and 2 with no legend in the file (inferred 0-based); X-Shop prices are Coin0/Coin1/Coin2; the vendor Lua API uses Coin1/Coin2/Coin3 -- so a raw slot number must never be carried from one subsystem to another.',
		sourceId: REAL,
		sourceAuthority: 'REAL_BLOODMOON_CONFIG',
		sourceLocation: `${AUCTION} lines 11-16; ${ONLINE} rows 0-2 (sha256 ${ONLINE_SHA}); docs/economy/xshop-cashshop-config-field-matrix.md:34 (Coin0/1/2); Research/Vendor/Tutorials/Script Lua Interface Functions.rtf (ObjectGetCoin/AddCoin/SubCoin); ${SNAP}`,
		entityTypes: ['SYSTEM', 'CURRENCY', 'CONFIG'],
		entities: ['CustomEventAuction', 'CustomCoinsOnline', 'CustomXShop', 'ObjectAddCoin'],
		topic: 'systems',
		bloodMoonStatus: 'BLOODMOON_CONFIRMED',
		verificationStatus: 'CONFIRMED_BY_CONFIG',
		verificationTargets: [{ type: 'file_read', path: `${AUCTION}; ${ONLINE}` }],
		confidence: `CONFIRMED_RUNTIME (the numbering as written in the files) / INFERENCE (that CustomCoinsOnline.txt is 0-based -- no legend, GAP-P20-06) (${SNAP})`,
		notes: 'Design consequence recorded in docs/knowledge/GAME_CURRENCY_DELIVERY_ANALYSIS.md Part 4: a future currency command must carry a NAMED currency, not a slot number.'
	}),
	C({
		claimId: 'CLAIM-129',
		statement: 'No recorded decision maps the Portal\'s WCOIN currency to any GameServer currency (WCoinC, WCoinP or otherwise): the Prisma schema calls the engine labels "a different, unreconciled currency domain", the legacy-currency investigation states "no equivalence is assumed and no integration was built", and ADR-0008/0020/0022 define only the R$-to-WC peg; the status is UNRESOLVED, open by earlier decision.',
		sourceId: DOCX,
		sourceAuthority: 'INTERNAL_DECISION',
		sourceLocation: 'apps/api/prisma/schema.prisma:2054-2057; docs/economy/legacy-dmn-cms-and-currency-investigation.md:40; context/preservation/openbeta-untracked/docs/store/store-channel-boundaries.md:28-35; .../decisions/0008-wcoin-1to1-peg-with-brl.md:60-61',
		entityTypes: ['SYSTEM', 'CURRENCY', 'DECISION'],
		entities: ['WCOIN', 'WCoinC', 'WCoinP', 'AccountCurrency'],
		topic: 'systems',
		bloodMoonStatus: 'BLOODMOON_CONFIRMED',
		verificationStatus: 'NOT_APPLICABLE',
		verificationTargets: [],
		confidence: 'CONFIRMED_OPERATOR (recorded decisions/statements; a mapping decision is required from Bryan -- GAP-P20-01)',
		notes: 'NOT_APPLICABLE verification: a decision record (same treatment as CLAIM-122). INFERENCE only, not a decision: the purchasable R$-pegged WC plays the role the legacy web called "WCoin"/"Cash" (WCoinC). ADR-0008:60-61 calls WCoin "the in-game currency GameBridge/the GameServer actually understands" without naming a column.'
	}),
	C({
		claimId: 'CLAIM-130',
		statement: 'Blood Coin is the public, player-facing name (decided 2026-09-05) of the Portal currency whose technical code is GOBLIN_POINT; it is not WC (WCOIN), and whether the Portal\'s GOBLIN_POINT equals the engine\'s GoblinPoint is unconfirmed -- the claim that the GameServer side was renamed to match is unverified and no real game config or message contains "Blood Coin".',
		sourceId: DOCX,
		sourceAuthority: 'INTERNAL_DECISION',
		sourceLocation: 'docs/phases/blood-coin-public-name-completion/phase-manifest.md:4-11,122-139; context/BUSINESS_RULES.md:27; context/domains/game-economy.md:24-34; apps/web/data/management.ts:3-7; RemoteData/Phase6,10,11 (no "Blood Coin" found)',
		entityTypes: ['SYSTEM', 'CURRENCY', 'DECISION'],
		entities: ['GOBLIN_POINT', 'Blood Coin', 'GoblinPoint', 'WCOIN'],
		topic: 'systems',
		bloodMoonStatus: 'BLOODMOON_CONFIRMED',
		verificationStatus: 'NOT_APPLICABLE',
		verificationTargets: [],
		confidence: 'CONFIRMED_OPERATOR (decision recorded); game-side rename UNVERIFIED',
		notes: 'Rule kept: technical GOBLIN_POINT / public Blood Coin; never conflate Blood Coin with WC. Related contradiction (GP earn-only vs sold, HP native vs no analog): CONFLICTS.md item 8, GAP-P20-07.'
	}),
	C({
		claimId: 'CLAIM-131',
		statement: 'The word "GameBridge" names at least six distinct things in this repository -- GAME_COMMAND_TRANSPORT (HMAC to Worker/D1/Queue to Agent to SQL procedure), MARKETPLACE_DELIVERY_WORKER (an always-failing script), PORTAL_BRIDGE_JOB_OUTBOX (the shared GameBridgeJob table), GAME_DATA_TELEMETRY (read-only game-to-cloud ingest and heartbeat), GM_EVENT_EXECUTOR_STUB and a label-only future data dependency -- and a seventh in the vendor Lua "bridge functions" (engine event hooks); the Agent process hosts both GAME_COMMAND_TRANSPORT and GAME_DATA_TELEMETRY.',
		sourceId: CODE,
		sourceAuthority: 'CURRENT_CODE',
		sourceLocation: 'apps/game-bridge-agent/Program.cs:18-22,60-61; apps/api/scripts/process-game-bridge-jobs.mjs; apps/api/prisma/schema.prisma:392-422,3290; apps/game-data-worker/src/index.ts; apps/api/src/modules/gm/event-executors/game-bridge-event-executor.ts; Research/Vendor/Tutorials/Script Lua BridgeFunctions.rtf',
		entityTypes: ['SYSTEM'],
		entities: ['GameBridgeJob', 'GameCommandTransportClient', 'BloodMoon.GameBridgeAgent', 'MU_BRIDGE_ENABLED'],
		topic: 'systems',
		bloodMoonStatus: 'BLOODMOON_CONFIRMED',
		verificationStatus: 'CONFIRMED_BY_CONFIG',
		verificationTargets: [{ type: 'file_read', path: 'apps/ (repository-wide search, ~330 matching files)' }],
		confidence: 'CONFIRMED_STATIC_CODE_READ (this branch; repository-wide term inventory)',
		notes: 'Canonical names and the layering are in docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md. CASH_VIP_INTEGRATION_MAP.md previously distinguished two (CLAIM-122); Phase 20 found the rest.'
	}),
	C({
		claimId: 'CLAIM-132',
		statement: 'GameBridgeJob is a shared Portal-side outbox used by three features (marketplace escrow, VIP delivery via GRANT_VIP, account lifecycle via ANONYMIZE/PURGE), and the marketplace script process-game-bridge-jobs.mjs selects every PENDING job regardless of operation, so with MU_BRIDGE_ENABLED=true it would mark jobs owned by the other dispatchers PROCESSING and then FAILED.',
		sourceId: CODE,
		sourceAuthority: 'CURRENT_CODE',
		sourceLocation: 'apps/api/scripts/process-game-bridge-jobs.mjs:108-160; apps/api/prisma/schema.prisma:392-422,3290; apps/api/src/modules/vip/vip-delivery.service.ts:83-84; apps/api/src/modules/accounts/account-lifecycle-bridge.service.ts:105-106; deploy/docker-compose.production.yml:68-77',
		entityTypes: ['SYSTEM', 'DATABASE'],
		entities: ['GameBridgeJob', 'process-game-bridge-jobs', 'MU_BRIDGE_ENABLED', 'VipDeliveryService'],
		topic: 'systems',
		bloodMoonStatus: 'BLOODMOON_CONFIRMED',
		verificationStatus: 'CONFIRMED_BY_CONFIG',
		verificationTargets: [{ type: 'file_read', path: 'apps/api/scripts/process-game-bridge-jobs.mjs' }],
		confidence: 'CONFIRMED_STATIC_CODE_READ (the selection query was read; the "would fail them" consequence follows from the read code, the flag has never been set true)',
		notes: 'Latent hazard for any new outbox operation (GAP-P20-09). The GameBridgeOperation.CREDIT_CURRENCY enum value means marketplace seller credit and has no producer and no consumer; a Portal-recharge-to-game command must not reuse it.'
	}),
	C({
		claimId: 'CLAIM-133',
		statement: 'The committed Worker (apps/game-data-worker/src/commands.ts, identical blob on all 43 branch refs (39 local + 4 remote-tracking)) accepts only CREATE_GAME_ACCOUNT and its D1 schema.sql still has CHECK (command_type = \'CREATE_GAME_ACCOUNT\'); the Portal client types, the Agent handlers and the D1 migration 0004 exist for GRANT_VIP, SYNC_VIP_TIER, ANONYMIZE_GAME_ACCOUNT and PURGE_GAME_ACCOUNT, but the Worker routing for them exists only as uncommitted changes in the mu-bloodmoon-v1-openbeta worktree -- so those four commands cannot flow end to end from committed code.',
		sourceId: CODE,
		sourceAuthority: 'CURRENT_CODE',
		sourceLocation: 'apps/game-data-worker/src/commands.ts:17,219-230; apps/game-data-worker/db/schema.sql:80; apps/game-data-worker/db/migrations/0004_gamebridge_extension_commands.sql; git rev-parse <ref>:path comparison across all 43 local and remote-tracking branch refs; mu-bloodmoon-v1-openbeta working tree (git diff --stat: commands.ts +189, schema.sql, commands.spec.ts)',
		entityTypes: ['SYSTEM', 'DEPLOYMENT'],
		entities: ['GAME_COMMAND_TRANSPORT', 'GRANT_VIP', 'commands.ts', 'game_command'],
		topic: 'systems',
		bloodMoonStatus: 'BLOODMOON_CONFIRMED',
		verificationStatus: 'CONFIRMED_BY_CONFIG',
		verificationTargets: [{ type: 'file_read', path: 'apps/game-data-worker/src/commands.ts' }],
		confidence: 'CONFIRMED_STATIC_CODE_READ + git blob comparison (2026-09-18); the openbeta working tree may change',
		notes: 'docs/gamebridge/gamebridge-agent-extension-plan.md:625 says the Worker was extended and tested locally -- true only of the uncommitted openbeta copy (CONFLICTS.md item 4). Loss risk: GAP-P20-02. Remote D1 state of migration 0004 is unknown.'
	}),
	C({
		claimId: 'CLAIM-134',
		statement: 'As of the preserved Phase 3D-A evidence (2026-08-24), the production command transport was deployed and active for CREATE_GAME_ACCOUNT only: the Worker, Queue and D1 (migration 0003) existed, the VPS task BloodMoonGameBridgeAgent was running, one real QA account was created with exactly the two authorised MU rows, and a response-loss / Agent-restart / lease-expiry replay wrote nothing twice; the production writer login\'s only permission is EXECUTE on dbo.DmN_CreateGameAccount; the four extension commands were not deployed and several later runbooks nevertheless say the Agent was never deployed.',
		sourceId: DOCX,
		sourceAuthority: 'REAL_BLOODMOON_RUNTIME',
		sourceLocation: 'references/game-data/sql-discovery/phase-3d-a-production-command-transport-20260824/raw/02-real-resources-and-deployment.txt, 03-real-qa-lifecycle.txt, 04-response-loss-restart-replay.txt; docs/security/game-write-boundary.md:7-14,27-33; docs/operations/provisioning-health.md:70-72; contradicted by docs/operations/deployment-rollback-runbook.md:125 (CONFLICTS.md item 3)',
		entityTypes: ['SYSTEM', 'DEPLOYMENT'],
		entities: ['BloodMoonGameBridgeAgent', 'bloodmoon_writer', 'DmN_CreateGameAccount', 'game_command'],
		topic: 'operations',
		bloodMoonStatus: 'BLOODMOON_CONFIRMED',
		verificationStatus: 'CONFIRMED_BY_RUNTIME',
		verificationTargets: [{ type: 'runtime_observation', path: 'read-only Agent heartbeat (GET /admin/game-data/status) or bm-sql -- to confirm the CURRENT state; not done in Phase 20' }],
		confidence: 'CONFIRMED_RUNTIME (preserved 2026-08-24 evidence, read 2026-09-18; current state NOT re-verified -- GAP-P20-02)',
		notes: 'Point-in-time. The raw evidence outranks later summaries (source-authority.md), but it is a snapshot.'
	}),
	C({
		claimId: 'CLAIM-135',
		statement: 'No currency-credit command exists in the command transport, and none of its idempotency layers is sufficient for an additive credit: the Worker, claim lease and Agent SQLite ledger are keyed by transport ids, the existing procedures are repeatable by nature (MAX rule, state checks, credential-hash replay), the SQL audit table\'s CommandId index is non-unique and no procedure consults it, and after a crash between a SQL commit and the ledger completion the ledger re-acquires the command after 30 seconds and calls the writer again.',
		sourceId: CODE,
		sourceAuthority: 'CURRENT_CODE',
		sourceLocation: 'apps/game-bridge-agent/Commands/GameCommandProcessor.cs:9-117; ProvisioningLedger.cs:33-49; GameCommandWorker.cs:188-195; apps/game-data-worker/src/commands.ts:31-67,87-122; mu-bloodmoon-v1-openbeta references/game-data/sql-discovery/gamebridge-extension-20260830/derived/proposed-bm-gamebridge-audit-table.sql:53 and proposed-bm-grant-vip-procedure.sql',
		entityTypes: ['SYSTEM', 'DATABASE'],
		entities: ['ProvisioningLedger', 'GameCommandProcessor', 'bm_GameBridgeAudit', 'bm_GrantVip'],
		topic: 'systems',
		bloodMoonStatus: 'BLOODMOON_CONFIRMED',
		verificationStatus: 'CONFIRMED_BY_CONFIG',
		verificationTargets: [{ type: 'file_read', path: 'apps/game-bridge-agent/Commands/ProvisioningLedger.cs' }],
		confidence: 'CONFIRMED_STATIC_CODE_READ; the crash-window behaviour is read from code and was not executed (no test of that window was found in the Agent test files searched)',
		notes: 'The reason a currency command needs a SQL-side business key in the same transaction (docs/knowledge/GAME_CURRENCY_DELIVERY_ANALYSIS.md Part 5). The VIP gateway mints a new commandId after FAILED_FINAL/EXPIRED -- safe only because of the MAX rule.'
	}),
	C({
		claimId: 'CLAIM-136',
		statement: 'No preserved evidence establishes whether an external write to CashShopData is visible to the GameServer on the next CashShop/X-Shop interaction, only after re-login, map change or window reopen, or is overwritten by the GameServer\'s in-memory value; the only precedent for an external write to a GameServer-owned field (MEMB_INFO.AccountLevel) is that the native WZ_GetAccountLevel procedure reverted it at the next login.',
		sourceId: 'synthesis-across-currency-evidence',
		sourceAuthority: 'INTERNAL_INFERENCE',
		sourceLocation: 'docs/vip/wz-setaccountlevel-coexistence.md (the AccountLevel reversion, reproduced in the lab); Research/Vendor/Tutorials/Script Lua Interface Functions.rtf (ObjectGetCoin/AddCoin on a player index); docs/knowledge/LEGACY_SUPPLIER_INDEX.md (the earlier unsupported "live" statement, corrected in Phase 20)',
		entityTypes: ['SYSTEM', 'CURRENCY', 'DATABASE'],
		entities: ['CashShopData', 'WZ_SetCoin', 'ObjectAddCoin', 'WZ_GetAccountLevel'],
		topic: 'systems',
		bloodMoonStatus: 'UNKNOWN',
		verificationStatus: 'UNVERIFIED',
		verificationTargets: [{ type: 'runtime_observation', path: 'a controlled test on a NON-production GameServer (a lab instance if one exists); production must not be used' }],
		confidence: 'UNKNOWN (absence of evidence, plus one adverse precedent; the "in-memory copy" hypothesis is INFERENCE only)',
		notes: 'Also: a credit must cope with a missing CashShopData row (4 of 8 accounts had one in the 3D-A evidence; the legacy PHP had an INSERT fallback). Do not propagate reload behaviour of config files (CLAIM-110/117) to database-row visibility: different subsystem. GAP-P20-04, GAP-P20-05.'
	}),
	C({
		claimId: 'CLAIM-137',
		statement: 'The vendor Lua scripting interface documents ObjectGetCoin/ObjectAddCoin/ObjectSubCoin on a player index, SQLConnect(ODBC name, user, password) and SQLQuery(query string) (plus async variants), and engine hook functions OnTimerThread, OnCharacterEntry and OnSQLAsyncResult; Blood Moon\'s data root contains Data\\Script\\ScriptMain.lua, Script\\TemplateScript.lua and Script\\WelcomeMessage.lua -- whether Blood Moon uses these hooks, and whether its build supports the async functions marked NEW, is not evidenced.',
		sourceId: 'vendor-tutorial-normalization',
		sourceAuthority: 'PROVIDER_DOCUMENTATION',
		sourceLocation: 'Research/Vendor/Tutorials/Script Lua Interface Functions.rtf (lines ~154, 170-189, 1436-1462, 1621-1650); Script Lua BridgeFunctions.rtf; RemoteData/Phase10/data-root-inventory.json (script file names)',
		entityTypes: ['SYSTEM', 'CURRENCY'],
		entities: ['Lua', 'ObjectAddCoin', 'SQLQuery', 'OnTimerThread', 'OnCharacterEntry'],
		topic: 'systems',
		bloodMoonStatus: 'BLOODMOON_LIKELY',
		verificationStatus: 'UNVERIFIED',
		verificationTargets: [{ type: 'file_read', path: 'Data/Script/ScriptMain.lua on the lab copy (contents not read in Phase 20)' }],
		confidence: 'CONFIRMED_VENDOR_DOC (the API exists) / UNKNOWN (Blood Moon usage and build support)',
		notes: 'Substrate of "Option C" in the currency-delivery analysis -- as a possible LAST HOP, not a transport: a Lua consumer would still need something to write its outbox table into SQL Server. SQLQuery takes a raw string and a script would hold a SQL credential: not treated as safer.'
	}),
	C({
		claimId: 'CLAIM-138',
		statement: 'The only acknowledgement the command transport can give is that the stored procedure returned and committed: the Agent talks only to SQL Server, has no channel to the GameServer process, writes succeed whether the GameServer is online or offline, and the Worker/D1 result carries a status and result code, not proof that the game sees the change.',
		sourceId: CODE,
		sourceAuthority: 'CURRENT_CODE',
		sourceLocation: 'apps/game-bridge-agent/GameDatabase/IGameDatabaseWriter.cs; apps/game-bridge-agent/Commands/GameCommandWorker.cs:86-95; apps/game-data-worker/src/commands.ts:124-169; docs/game-data/deployment-topology.md',
		entityTypes: ['SYSTEM'],
		entities: ['GameCommandWorker', 'IGameDatabaseWriter', 'game_command'],
		topic: 'systems',
		bloodMoonStatus: 'BLOODMOON_CONFIRMED',
		verificationStatus: 'CONFIRMED_BY_CONFIG',
		verificationTargets: [{ type: 'file_read', path: 'apps/game-bridge-agent/GameDatabase/IGameDatabaseWriter.cs' }],
		confidence: 'CONFIRMED_STATIC_CODE_READ',
		notes: 'Answers the "GameServer ACK semantics" question: there is none beyond SQL commit (GAP-P20-04).'
	})
]

// -------------------------------------------------------------- apply: claims
let addedClaims = 0
const claimIds = new Set(claimsDoc.claims.map((c) => c.claimId))
for (const c of newClaims) {
	if (claimIds.has(c.claimId)) { console.log(`SKIP claim ${c.claimId}`); continue }
	claimsDoc.claims.push(c)
	addedClaims++
}

// -------------------------------------------------------------- apply: graph
const nodeIds = new Set(graph.nodes.map((n) => n.id))
const edgeKey = (e) => `${e.from}|${e.type}|${e.to}`
const edgeKeys = new Set(graph.edges.map(edgeKey))
let addedNodes = 0
let addedEdges = 0
const addNode = (n) => { if (!nodeIds.has(n.id)) { graph.nodes.push(n); nodeIds.add(n.id); addedNodes++ } }
const addEdge = (e) => { if (!edgeKeys.has(edgeKey(e))) { graph.edges.push(e); edgeKeys.add(edgeKey(e)); addedEdges++ } }

addNode({ id: 'SYS-game-command-transport', type: 'SYSTEM', name: 'GAME_COMMAND_TRANSPORT (Portal HMAC -> Worker/D1/Queue -> Agent -> SQL procedure)', bloodMoonStatus: 'BLOODMOON_CONFIRMED', note: 'deployed and active for CREATE_GAME_ACCOUNT only as of 2026-08-24 (CLAIM-134); other command types not deployed and not runnable from committed code (CLAIM-133); no currency command (CLAIM-135)' })
addNode({ id: 'SYS-marketplace-delivery-worker', type: 'SYSTEM', name: 'MARKETPLACE_DELIVERY_WORKER (process-game-bridge-jobs.mjs)', bloodMoonStatus: 'BLOODMOON_CONFIRMED', note: 'always-failing scaffold, MU_BRIDGE_ENABLED=false (CLAIM-132)' })
addNode({ id: 'SYS-portal-bridge-job-outbox', type: 'SYSTEM', name: 'PORTAL_BRIDGE_JOB_OUTBOX (GameBridgeJob table)', bloodMoonStatus: 'BLOODMOON_CONFIRMED', note: 'shared by marketplace, VIP delivery and account lifecycle (CLAIM-132)' })
addNode({ id: 'SYS-game-data-telemetry', type: 'SYSTEM', name: 'GAME_DATA_TELEMETRY (read-only ingest + heartbeat)', bloodMoonStatus: 'BLOODMOON_CONFIRMED', note: 'separate from the command transport but hosted in the same Agent process (CLAIM-131)' })
addNode({ id: 'CURRENCY-slot1-cash-wcoinc', type: 'CURRENCY', name: 'Cash = WCoinC (CashShopData.WCoinC)', bloodMoonStatus: 'BLOODMOON_CONFIRMED', note: 'CONFIRMED pairing (CLAIM-125, CLAIM-126)' })
addNode({ id: 'CURRENCY-slot2-gold-wcoinp', type: 'CURRENCY', name: 'Gold = WCoinP (CashShopData.WCoinP)', bloodMoonStatus: 'BLOODMOON_CONFIRMED', note: 'STRONGLY_SUPPORTED pairing (CLAIM-125, CLAIM-127)' })
addNode({ id: 'CURRENCY-slot3-pcpoint-goblinpoint', type: 'CURRENCY', name: 'PcPoint = GoblinPoint (CashShopData.GoblinPoint)', bloodMoonStatus: 'BLOODMOON_CONFIRMED', note: 'STRONGLY_SUPPORTED pairing (CLAIM-125, CLAIM-127)' })
addNode({ id: 'SRC-real-config-currency', type: 'SOURCE', name: 'real CustomEventAuction.txt + Message.utf8.txt + Command.dat /util block + CustomCoinsOnline.txt (preserved Phase 6/10/11 downloads, read 2026-09-18)', sourceAuthority: 'REAL_BLOODMOON_CONFIG' })

addEdge({ from: 'SYS-portal-bridge-job-outbox', type: 'RELATED_TO', to: 'SYS-game-command-transport' })
addEdge({ from: 'SYS-portal-bridge-job-outbox', type: 'RELATED_TO', to: 'SYS-marketplace-delivery-worker' })
addEdge({ from: 'SYS-game-data-telemetry', type: 'SIBLING_SYSTEM_OF', to: 'SYS-game-command-transport' })
addEdge({ from: 'CURRENCY-slot1-cash-wcoinc', type: 'RELATED_TO', to: 'CURRENCY-slot2-gold-wcoinp' })
addEdge({ from: 'CURRENCY-slot2-gold-wcoinp', type: 'RELATED_TO', to: 'CURRENCY-slot3-pcpoint-goblinpoint' })
for (const c of newClaims) {
	if ((c.sourceId || '') === 'real-config-read') addEdge({ from: 'SRC-real-config-currency', type: 'SUPPORTS_CLAIM', to: c.claimId })
}
addEdge({ from: 'CLAIM-125', type: 'RELATED_TO', to: 'CLAIM-126' })
addEdge({ from: 'CLAIM-127', type: 'RELATED_TO', to: 'CLAIM-125' })
addEdge({ from: 'CLAIM-128', type: 'RELATED_TO', to: 'CLAIM-125' })
addEdge({ from: 'CLAIM-129', type: 'RELATED_TO', to: 'CLAIM-121' })
addEdge({ from: 'CLAIM-131', type: 'RELATED_TO', to: 'CLAIM-122' })
addEdge({ from: 'CLAIM-133', type: 'RELATED_TO', to: 'CLAIM-134' })
addEdge({ from: 'CLAIM-135', type: 'RELATED_TO', to: 'CLAIM-134' })
addEdge({ from: 'CLAIM-136', type: 'RELATED_TO', to: 'CLAIM-120' })

// ---------------------------------------------------- apply: verification queue
const qIds = new Set(queue.items.map((i) => i.claimId))
const SAFE = 'local read of already-preserved files and repository code in Phase 20; no production, RemoteOps or SQL access'
const doneItems = [
	['CLAIM-125', 'HIGH', 'file_read', 'CustomEventAuction.txt CoinType comment', 'CONFIRMED_BY_CONFIG -- 0 = zen, 1 = Cash/WCoinc, 2 = Gold/WCoinP, 3 = PcPoint/GoblonPoint, 4 = Item read directly.', [AUCTION, `sha256:${AUCTION_SHA}`]],
	['CLAIM-126', 'HIGH', 'file_read', 'message ids 632/780/819/980/1033/1140/1145 and /util operand names', 'CONFIRMED_BY_CONFIG -- both label families used for the same triple; id 1140 pairs Cash/WCoinC.', [MSG, `sha256:${MSG_SHA}`, CMD, `sha256:${CMD_SHA}`]],
	['CLAIM-128', 'MEDIUM', 'file_read', 'CoinType numbering in CustomEventAuction.txt and CustomCoinsOnline.txt', 'CONFIRMED_BY_CONFIG for the numbering as written; 0-based reading of CustomCoinsOnline.txt is inference (no legend).', [AUCTION, ONLINE, `sha256:${ONLINE_SHA}`]],
	['CLAIM-131', 'MEDIUM', 'file_read', 'repository-wide GameBridge term inventory', 'CONFIRMED_BY_CONFIG (static read) -- six repository concepts plus the vendor Lua bridge functions.', ['docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md']],
	['CLAIM-132', 'HIGH', 'file_read', 'selection query of process-game-bridge-jobs.mjs and the outbox consumers', 'CONFIRMED_BY_CONFIG (static read) -- no operation filter in the marketplace script.', ['apps/api/scripts/process-game-bridge-jobs.mjs']],
	['CLAIM-133', 'HIGH', 'file_read', 'Worker commands.ts / schema.sql on committed branches vs the openbeta working tree', 'CONFIRMED_BY_CONFIG -- committed blob accepts CREATE_GAME_ACCOUNT only on all 43 branch refs (39 local + 4 remote-tracking); extension only uncommitted in mu-bloodmoon-v1-openbeta.', ['apps/game-data-worker/src/commands.ts']],
	['CLAIM-134', 'HIGH', 'file_read', 'Phase 3D-A preserved production evidence', 'CONFIRMED_BY_RUNTIME (preserved 2026-08-24 evidence read; CURRENT state not re-verified).', ['references/game-data/sql-discovery/phase-3d-a-production-command-transport-20260824/raw/02-real-resources-and-deployment.txt']],
	['CLAIM-135', 'HIGH', 'file_read', 'idempotency layers of the command transport', 'CONFIRMED_BY_CONFIG (static read); the crash-window behaviour was not executed.', ['apps/game-bridge-agent/Commands/ProvisioningLedger.cs']],
	['CLAIM-138', 'MEDIUM', 'file_read', 'acknowledgement path of the command transport', 'CONFIRMED_BY_CONFIG (static read) -- SQL commit is the only acknowledgement.', ['apps/game-bridge-agent/Commands/GameCommandWorker.cs']]
]
const openItems = [
	['CLAIM-127', 'HIGH', 'schema_read', 'dbo.WZ_SetCoin body and CashShopData DDL/defaults in the LAB database (read-only)', 'QUEUED', 'read-only sys.sql_modules / sys.columns lookup in the lab database -- requires Bryan\'s authorization; NOT done in Phase 20 (no vendor SQL executed)', 'QUEUED -- second-hand today; would also settle add-vs-set semantics (GAP-P20-05).'],
	['CLAIM-136', 'HIGH', 'runtime_observation', 'visibility/overwrite of an external CashShopData write while the player is online', 'BLOCKED', 'a controlled test on a non-production GameServer; none is known to exist for this purpose', 'BLOCKED -- no non-production GameServer instance is known; production must not be used (GAP-P20-04).'],
	['CLAIM-137', 'LOW', 'file_read', 'contents of Data/Script/ScriptMain.lua and which bridge hooks Blood Moon uses', 'QUEUED', 'read the lab copy of the script files (not read in Phase 20)', 'QUEUED -- only the file names are known.']
]
let addedQ = 0
for (const [claimId, priority, verificationType, target, result, evidenceRefs] of doneItems) {
	if (qIds.has(claimId)) continue
	queue.items.push({ claimId, priority, verificationType, target, safeMethod: SAFE, status: 'DONE', result, evidenceRefs })
	addedQ++
}
for (const [claimId, priority, verificationType, target, status, safeMethod, result] of openItems) {
	if (qIds.has(claimId)) continue
	queue.items.push({ claimId, priority, verificationType, target, safeMethod, status, result, evidenceRefs: [] })
	addedQ++
}
const count = (s) => queue.items.filter((i) => i.status === s).length
queue.generatedAt = now
// Deterministic Phase 20 sentence (idempotent: rebuilt from final state on every run).
const p20 = queue.items.filter((i) => Number(i.claimId.replace('CLAIM-', '')) >= 125)
const baseNote = queue.summary.note.split(' Phase 20 (2026-09-18)')[0]
queue.summary = {
	...queue.summary,
	total: queue.items.length,
	done: count('DONE'),
	queued: count('QUEUED'),
	blocked: count('BLOCKED'),
	inProgress: count('IN_PROGRESS'),
	note: `${baseNote} Phase 20 (2026-09-18) added ${p20.length} items for CLAIM-125 and above (${p20.filter((i) => i.status === 'DONE').length} DONE from local reads of preserved files and repository code; ${p20.filter((i) => i.status === 'QUEUED').length} QUEUED awaiting Bryan's authorization for a read-only lab lookup; ${p20.filter((i) => i.status === 'BLOCKED').length} BLOCKED because no non-production GameServer is known to exist).`
}

// ------------------------------------------------------------ apply: checkpoint
if (!checkpoint.phase20Completed) {
	checkpoint.phase20Completed = [
		'Phase 20 (2026-09-18): resolved GAP-P18-11 from Blood Moon\'s own files (CustomEventAuction.txt comment, message table, /util operands) -- CLAIM-125..128; recorded that the Portal WC target is unresolved and Blood Coin is GOBLIN_POINT (CLAIM-129/130); split the word "GameBridge" (CLAIM-131/132); audited the command transport, its deployment state and its idempotency (CLAIM-133..135, 138); recorded the unknown game-side visibility of external CashShopData writes (CLAIM-136) and the vendor Lua substrate (CLAIM-137).',
		'No KI source was added (the evidence is configs, code and documents, not registered videos); claim total 124 -> 138. Extraction was agent-authored, as always for this sweep.',
		'Re-run the three generators after any claim edit: knowledge-transcript-inventory.mjs, knowledge-canonical-facts.mjs --write, knowledge-provenance-report.mjs --write.'
	]
}
checkpoint.lastUpdatedUtc = now

// ------------------------------------------------------------------- write out
claimsDoc.generatedAt = now
graph.generatedAt = now
save('atomic-claims.json', claimsDoc)
save('knowledge-graph.json', graph)
save('verification-queue.json', queue)
save('checkpoint.json', checkpoint)

console.log(`Added: ${addedClaims} claims, ${addedNodes} graph nodes, ${addedEdges} graph edges, ${addedQ} verification-queue items.`)
