#!/usr/bin/env node
// Phase 20A -- idempotent update of the remaining knowledge docs: gap re-evaluation
// (GAP-P20-01..05 and friends), conflicts, GameBridge disambiguation (deployment status +
// future cleanup list), legacy-catalog banner status, integration map, master index, registry.
// Additive with visible corrections; no gap is closed merely because Option B was accepted.
import { readFileSync, writeFileSync } from 'node:fs'

const LAB = 'references/game-data/sql-discovery/phase-20a-wz-setcoin-cashshopdata-lab-20260919/'
const D1 = 'references/game-data/sql-discovery/phase-20a-live-agent-d1-readonly-20260919/'

function patch(file, reps, append) {
	let t = readFileSync(file, 'utf8')
	for (const [from, to] of reps) {
		if (t.includes(to)) continue
		if (!t.includes(from)) throw new Error(`${file}: anchor not found: ${from.slice(0, 80)}`)
		t = t.replace(from, () => to)
	}
	if (append && !t.includes(append.mark)) t = t.replace(/\s*$/, '\n') + append.text
	writeFileSync(file, t)
	console.log('updated ' + file)
}

// ------------------------------------------------------------------ gaps
patch('docs/knowledge/KNOWLEDGE_GAPS.md', [
	[
		'it is **not yet applied** to the other worktree (a separate branch, currently clean — applying it is a one-file commit there) |',
		'~~it is **not yet applied** to the other worktree~~ **APPLIED 2026-09-19 (Phase 20A)** as a banner-only commit `e92d85a0` on `feature/legacy-catalog-control-plane` in `mu-bloodmoon-legacy-catalog` (not pushed) |'
	],
	[
		'What remains open is not the naming but the Portal side: GAP-P20-01. |',
		'What remains open is not the naming but the Portal side: GAP-P20-01. **Phase 20A upgrade:** the pairs Gold↔WCoinP and PcPoint↔GoblinPoint are now **CONFIRMED** too, from the vendor procedures\' own labels and their Season 4 variants (CLAIM-139..142). |'
	],
	['| P1 | OPEN — decision |', '| P1 | **OPEN — future-scope decision (re-evaluated 2026-09-19).** Bryan reconfirmed Portal WC is **UNRESOLVED** and put game-currency delivery **out of scope for the initial Beta** (CLAIM-147); nothing was mapped, nothing closed. |'],
	[
		'read-only heartbeat/`bm-sql` check; a governance action to commit the Worker extension | P1 | OPEN |',
		'read-only heartbeat/`bm-sql` check; a governance action to commit the Worker extension | P1 | **PARTIAL (re-evaluated 2026-09-19).** Done: the Worker extension is preserved on `gamebridge/preserve-command-extension` (byte-identical, tsc 0 errors, Worker suite 55/55; CLAIM-146); remote D1 read-only — migrations 0001–0003 only, `game_command` still CREATE-only, 2 commands ever, Agent heartbeat live, command polling active (CLAIM-145). **Still open:** the VPS-side task/binary/version (the read-only SSH inspection was blocked by the permission classifier and not retried); the four SQL procedures are still untracked in openbeta (GAP-P20-10); runbooks annotated but not re-verified against the VPS. |'
	],
	[
		'design + local SQL Server test (`GAME_CURRENCY_DELIVERY_ANALYSIS.md` Part 5) | P1 | OPEN |',
		'design + local SQL Server test (`GAME_CURRENCY_DELIVERY_ANALYSIS.md` Part 5) | P1 | **OPEN (re-evaluated 2026-09-19).** The lab read confirms the need: the vendor\'s `WZ_SetCoin` and every sibling are additive with **no** idempotency, lock, transaction or audit (CLAIM-139/141), so nothing in the game database can be reused for exactly-once. Accepting Option B does not build it. |'
	],
	[
		'lab GameServer test (if one exists) or engine evidence; production must not be used | P1 | OPEN |',
		'lab GameServer test (if one exists) or engine evidence; production must not be used | P1 | **OPEN (re-evaluated 2026-09-19).** Canonical distinction recorded: `SQL_ACK` (procedure committed) is all the transport proves; `GAME_ACK` does not exist. Visibility is still **UNKNOWN**: no runnable lab GameServer, ODBC source or client exists (only a staged file copy), so no test was performed; a test design is ready (Analysis Part 14.3). DB-side evidence (additive vendor deltas, one credits online players) weakens the overwrite hypothesis without settling it (CLAIM-143). |'
	],
	[
		'read-only lookup in the lab DB (needs authorization) | P1 | OPEN |',
		'read-only lookup in the lab DB (needs authorization) | P1 | **RESOLVED for the database side (2026-09-19, Phase 20A; authorised by Bryan).** Body, DDL, add-vs-set (additive, positive-only), missing-row behaviour (WZ_SetCoin inserts, siblings silently no-op), transaction/lock/idempotency (none) are read and preserved with hashes (`' + LAB + '`; CLAIM-139..144). **Not answered by it, and left open under GAP-P20-04:** how the GameServer debits (no procedure exists), whether it caches balances, and who creates a `CashShopData` row in production. |'
	],
	[
		'a docs-only cleanup phase | P3 | OPEN |',
		'a docs-only cleanup phase | P3 | **PARTIAL (2026-09-19).** The four "never deployed" runbook statements were annotated (visible strikethrough + dated note) and seven certain-meaning references were clarified with canonical names; the rest is listed in `GAMEBRIDGE_DISAMBIGUATION.md` Part 7 for a future cleanup. |'
	]
], {
	mark: '| GAP-P20-10 |',
	text: `
| GAP-P20-10 | GAMEBRIDGE | The four stored procedures and grants of the GameBridge extension (\`references/game-data/sql-discovery/gamebridge-extension-20260830/derived/*.sql\`, 11 files) exist **only untracked** in \`mu-bloodmoon-v1-openbeta\`; one file, \`local-writer-login.sql\`, is flagged \`SQL_LAB_SECRET_REVIEW_REQUIRED\`. Not in Bryan's 2026-09-19 preservation scope, so **not moved** | Loss risk for the SQL half of an extension whose Worker half was just preserved | a separate, secret-reviewed preservation step | P1 | OPEN |
`
})

// ------------------------------------------------------------------ conflicts
patch('docs/knowledge/CONFLICTS.md', [
	[
		'live state was **not** re-verified in Phase 20. Tracked: GAP-P20-02.',
		'live state was **not** re-verified in Phase 20. Tracked: GAP-P20-02.\n- **Update 2026-09-19 (Phase 20A):** the Cloudflare half was re-verified read-only — heartbeat ≈14 s old, ≈52 command-claim polls in 10 minutes, 2 commands ever (`' + D1 + '`); Claim A is therefore wrong for `CREATE_GAME_ACCOUNT`. The seven documents that repeated it were **annotated** (strikethrough + dated note, nothing deleted). The VPS-side task/binary/version is still **unverified** (SSH inspection blocked, not retried).'
	],
	[
		'GAP-P20-02.\n\n### 5.',
		'GAP-P20-02. **Update 2026-09-19:** the extension is now preserved byte-identically on `gamebridge/preserve-command-extension` (not merged, not deployed); remote D1 has migrations 0001–0003 only and `game_command` still has `CHECK (command_type = \'CREATE_GAME_ACCOUNT\')`, so the database also rejects the four types.\n\n### 5.'
	]
], {
	mark: '### 9. Was WZ_SetCoin additive?',
	text: `
### 9. Was WZ_SetCoin additive? (Phase 20A, 2026-09-19)

Not a contradiction between sources but a **gap closed against an assumption**: Phase 20 wrote that whether
\`WZ_SetCoin\` adds or sets "is not preserved". The lab read shows it **adds**, ignores values ≤ 0, inserts a
missing row and has no idempotency/lock/transaction — and that every other balance-changing vendor procedure
is additive too (\`${LAB}\`). The earlier "unknown" was accurate for the repository at the time; it is now
superseded, not wrong.
`
})

// ------------------------------------------------------------------ disambiguation
patch('docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md', [
	[
		'**DEPLOYED_ACTIVE as of 2026-08-24** (current state **not re-verified** in Phase 20)',
		'**DEPLOYED_ACTIVE as of 2026-08-24** ~~(current state **not re-verified** in Phase 20)~~ **(Phase 20A, 2026-09-19: Cloudflare side re-verified read-only — heartbeat ≈14 s old, ≈52 command-claim polls per 10 minutes, 2 commands ever; VPS-side task/binary/version still unverified)**'
	],
	[
		'state should be confirmed read-only (Agent heartbeat via the existing\n`GET /admin/game-data/status`, or the read-only `bm-sql` bridge) before any\ndesign that depends on it — **not done here** (no production contact in Phase 20).',
		'state should be confirmed read-only (Agent heartbeat via the existing\n`GET /admin/game-data/status`, or the read-only `bm-sql` bridge) before any\ndesign that depends on it — ~~**not done here** (no production contact in Phase 20)~~ **done in Phase 20A for the Cloudflare half** (`' + D1 + '`); the VPS half — scheduled-task state, process start, binary SHA-256, version — is **still unverified** because the read-only SSH inspection was blocked by the session\'s permission classifier and was not retried (the inspection to run is described in `GAME_CURRENCY_DELIVERY_ANALYSIS.md` Part 14.4).'
	]
], {
	mark: '## Part 7 — Future terminology cleanup list',
	text: `
## Part 7 — Future terminology cleanup list (Phase 20A, 2026-09-19)

Done in Phase 20A (meaning **certain**, additive canonical-name brackets or dated annotations, nothing rewritten):
\`context/ARCHITECTURE.md:19\`, \`context/INFRASTRUCTURE.md:27\`, \`context/CURRENT_STATE.md:58,60-62\`, \`docs/README.md:16-17\`,
\`apps/game-bridge-agent/README.md:58\`, \`docs/game-data/architecture.md\` ("Read-only, absolutely"),
\`docs/game-data/deployment-topology.md\` (superseded-snapshot note), \`docs/architecture/control-plane-domain-audit.md:306-313\`,
and the "never deployed" statements in \`docs/operations/{deployment-rollback-runbook,incident-response-runbook,pre-beta-go-no-go-checklist,phase-aa-ops-hardening-report}.md\`.

**Not touched — to do in a docs-only cleanup** (highest risk first; the suggested wording uses the canonical names):

| Where | Says | Suggested |
|---|---|---|
| \`apps/api/prisma/schema.prisma:781\` (comment) | "No GameBridge command is implemented yet (Phase 3C+)" | stale: five envelope types exist; say \`GAME_COMMAND_TRANSPORT\` |
| \`apps/api/prisma/schema.prisma:42, 3867\` (comments) | "dispatched to GameBridge"; "MU_BRIDGE_ENABLED=false … no game link" | first = \`GAME_COMMAND_TRANSPORT\`; second = \`MARKETPLACE_DELIVERY_WORKER\` flag, not proof the GM has no link |
| \`apps/api/src/modules/launcher/launcher.service.ts:102\`, \`apps/web/pages/index.vue:152\`, \`launcher/README.md:11\` | "No GameBridge integration exists yet" | means a live game-server-status source; the heartbeat is \`GAME_DATA_TELEMETRY\` and is *not* that |
| \`docs/payments/payment-next-phase-requirements.md:35\` | GameBridgeJob "zero real consumers" | stale since Phase O; the consumers are \`vip-delivery\` and \`account-lifecycle-bridge\` |
| \`docs/vip/wz-setaccountlevel-coexistence.md:163\` | "GRANT_VIP has no real, wired production caller" | stale since \`game-bridge-vip.gateway.ts\`; still undeployed |
| \`docs/marketplace.md:52\`, \`docs/marketplace-game-bridge.md\` | "the game bridge worker" | \`MARKETPLACE_DELIVERY_WORKER\` |
| \`docs/environment/development-environment.md:25\` | links \`docs/environment/gamebridge-local-testing.md\` | file is \`docs/gamebridge/gamebridge-local-testing.md\` |
| \`docs/gamebridge/*\` and \`docs/manuals/**\` | \`GAME_BRIDGE_GRANT_VIP_ENABLED\` etc. | the switch is \`AgentOptions.GrantVipEnabled\`; env-binding name not traced |
| \`docs/guild-product-backlog.md\` (31 hits) | \`GAMEBRIDGE_DEPENDENCY\` | \`GAME_DATA_DEPENDENCY\` |
| \`context/preservation/**\` | byte copies of the originals | **never edit** (hash-verified archive) |

\`admin.game-bridge.manage\` guarding two systems and the marketplace script's missing operation filter are
code issues (GAP-P20-09), not wording.
`
})

// ------------------------------------------------------------------ legacy supplier index
patch('docs/knowledge/LEGACY_SUPPLIER_INDEX.md', [
	[
		'**Prepared warning — NOT yet applied.** The worktree is a separate git',
		'**Prepared warning — ~~NOT yet applied~~ APPLIED 2026-09-19 (Phase 20A):** banner-only commit\n`e92d85a0` on `feature/legacy-catalog-control-plane` in `mu-bloodmoon-legacy-catalog` (README.md +14 lines, not\npushed; wording matches the text below with the heading "STALE / HISTORICAL REFERENCE"). The original note follows.\nThe worktree is a separate git'
	]
])

// ------------------------------------------------------------------ integration map
patch('docs/knowledge/CASH_VIP_INTEGRATION_MAP.md', [
	[
		'| Cash/Gold/PcPoint vs WCoinC/WCoinP/GoblinPoint (GAP-P18-11) | Cash↔WCoinC **CONFIRMED**; Gold↔WCoinP and PcPoint↔GoblinPoint **STRONGLY_SUPPORTED**; slot numbering differs by subsystem |',
		'| Cash/Gold/PcPoint vs WCoinC/WCoinP/GoblinPoint (GAP-P18-11) | Cash↔WCoinC **CONFIRMED**; ~~Gold↔WCoinP and PcPoint↔GoblinPoint STRONGLY_SUPPORTED~~ **all three CONFIRMED (Phase 20A — vendor procedures read first-hand)**; slot numbering differs by subsystem |'
	],
	[
		'| Recommendation | conditional Option B; decision-ready for the *mechanism* only |',
		'| Recommendation | conditional Option B; decision-ready for the *mechanism* only — **(Phase 20A) Bryan accepted Option B as the DIRECTION on 2026-09-19; implementation NOT approved; initial Beta game-currency delivery OUT_OF_SCOPE; Portal WC target UNRESOLVED** |'
	]
], {
	mark: '## Part 9 — Phase 20A: game-side facts now known',
	text: `
## Part 9 — Phase 20A: game-side facts now known

Read first-hand in the lab (\`${LAB}\`): \`WZ_SetCoin\` and every other balance-changing vendor procedure
**add** (\`col = col + value\`); \`WZ_SetCoin\` ignores values ≤ 0 and inserts a missing row, the others only
update; nothing is idempotent, locked, transactional or audited; \`CashShopData\` has a clustered PK on
\`AccountID\`, three \`int NOT NULL DEFAULT 0\` balances and no CHECK/FK/trigger; no debit procedure exists.
This corrects the "legacy Flow A" wording above only in detail: the legacy PHP's \`col = col + :credits\`
matches the vendor's own delta model. **Still unknown:** when an external credit becomes visible in game
(\`GAME_CURRENCY_VISIBILITY = UNKNOWN\`; \`SQL_ACK\` ≠ \`GAME_ACK\`). Full analysis: \`GAME_CURRENCY_DELIVERY_ANALYSIS.md\` Part 14.
`
})

// ------------------------------------------------------------------ master index
patch('docs/knowledge/KNOWLEDGE_MASTER_INDEX.md', [
	[
		'Cash↔WCoinC CONFIRMED, Gold↔WCoinP and PcPoint↔GoblinPoint STRONGLY_SUPPORTED; Portal WC target **UNRESOLVED**',
		'Cash↔WCoinC, Gold↔WCoinP, PcPoint↔GoblinPoint all **CONFIRMED** (Phase 20A, vendor procedures read first-hand; ~~two were STRONGLY_SUPPORTED~~); Portal WC target **UNRESOLVED**; initial Beta game-currency delivery **OUT_OF_SCOPE**'
	],
	[
		'not safe as-is; conditional recommendation Option B with nine prerequisites; **not a decision** |',
		'not safe as-is; **Option B accepted as the DIRECTION on 2026-09-19, implementation NOT approved**, nine prerequisites (P2 done); Part 14 = decisions + lab evidence |\n| "Does WZ_SetCoin add or set? What is CashShopData\'s DDL?" | `references/game-data/sql-discovery/phase-20a-wz-setcoin-cashshopdata-lab-20260919/` (raw + `derived/findings.md`); CLAIM-139..144 — **additive**, positive-only, insert-if-missing, no idempotency; PK on `AccountID`, no CHECK/FK/trigger |\n| "Is the GameBridge Agent running now? Which migrations does the remote D1 have?" | `references/game-data/sql-discovery/phase-20a-live-agent-d1-readonly-20260919/` — Cloudflare side verified 2026-09-19 (heartbeat live; migrations 0001–0003; 0004 **not** applied); VPS side **unverified**; CLAIM-145 |\n| "Where is the Worker code for GRANT_VIP/SYNC_VIP_TIER/ANONYMIZE/PURGE?" | branch `gamebridge/preserve-command-extension` (not merged, not deployed, not canonical); manifest `docs/gamebridge/worker-extension-preservation-manifest.md` on that branch; CLAIM-146 |'
	]
])

// ------------------------------------------------------------------ source registry
patch('docs/knowledge/SOURCE_REGISTRY.md', [
	['| Atomic claims | **138** (99 before Phase 18D; +CLAIM-100..124 in 18D; +CLAIM-125..138 in Phase 20), of which 84 are canonical facts (`CONFIRMED_BY_*`) |', '| Atomic claims | **148** (99 before Phase 18D; +CLAIM-100..124 in 18D; +CLAIM-125..138 in Phase 20; +CLAIM-139..148 in Phase 20A), of which 93 are canonical facts (`CONFIRMED_BY_*`) |']
], {
	mark: '### Phase 20A evidence folders',
	text: `
### Phase 20A evidence folders (2026-09-19)

| Folder | Kind | What | Notes |
|---|---|---|---|
| \`${LAB}\` | **RAW → DERIVED**, read-only catalog reads | \`WZ_SetCoin\` body, \`CashShopData\` DDL, ten vendor procedures, \`CustomPlayToEarn\`, definition hashes, the guarded query helper | source: lab restore (\`bloodmoon_gameserver_raw_analysis\`) of \`MuOnline_COPY_ONLY.bak\` (sha256 \`570d225a…b682\`, 2026-07-16 production backup); no PII, no row data, nothing executed |
| \`${D1}\` | **RAW**, SELECT-only | remote D1 migrations, \`game_command\` DDL and aggregates, Agent heartbeat, nonce activity, Worker deployment list | captured 2026-09-19 via the local authenticated \`wrangler\`; VPS side not inspected (blocked) |
| branch \`gamebridge/preserve-command-extension\` | preserved source | Worker extension (3 files) + manifest | not merged, not deployed |
`
})

// bump lastVerified on the Phase 20 docs
for (const f of ['docs/knowledge/CURRENCY_TERMINOLOGY.md', 'docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md', 'docs/knowledge/GAME_CURRENCY_DELIVERY_ANALYSIS.md', 'docs/knowledge/KNOWLEDGE_GAPS.md', 'docs/knowledge/CONFLICTS.md', 'docs/knowledge/CASH_VIP_INTEGRATION_MAP.md', 'docs/knowledge/SOURCE_REGISTRY.md', 'docs/knowledge/LEGACY_SUPPLIER_INDEX.md', 'docs/knowledge/KNOWLEDGE_MASTER_INDEX.md']) {
	let t = readFileSync(f, 'utf8')
	if (t.includes('lastVerified: 2026-09-18')) { writeFileSync(f, t.replace('lastVerified: 2026-09-18', 'lastVerified: 2026-09-19')); console.log('lastVerified bumped ' + f) }
}
