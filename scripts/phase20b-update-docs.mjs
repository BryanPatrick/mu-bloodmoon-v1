#!/usr/bin/env node
// Phase 20B -- idempotent update of the knowledge docs (and a handful of certain-meaning
// documentation clarifications and dated annotations) for: the read-only VPS verification, the
// preserved SQL artifacts, the command deployment matrix, and Bryan's 2026-09-21 decisions.
// Additive with visible corrections; documentation only; nothing under context/preservation/**.
import { readFileSync, writeFileSync } from 'node:fs'

const EV = 'references/game-data/sql-discovery/phase-20b-live-agent-verification-20260921/'
const DIS = 'docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md'
const VPSFACT = 'one Agent process running since 2026-08-25, task state Ready, binary 0.1.0+20a0d71c built 2026-08-24 (before the extension existed)'

function read(f) { const t = readFileSync(f, 'utf8'); return { t: t.includes('\r\n') ? t.replace(/\r\n/g, '\n') : t, crlf: t.includes('\r\n') } }
function write(f, o, t) { writeFileSync(f, o.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8'); console.log('updated ' + f) }
function patch(f, reps, appends = []) {
	const o = read(f); let t = o.t
	for (const [from, to] of reps) {
		if (t.includes(to)) continue
		if (!t.includes(from)) throw new Error(`${f}: anchor not found: ${from.slice(0, 90)}`)
		t = t.replace(from, () => to)
	}
	for (const a of appends) if (!t.includes(a.mark)) t = t.replace(/\s*$/, '\n') + a.text
	write(f, o, t)
}
function gapCell(f, id, fn) {
	const o = read(f); const lines = o.t.split('\n'); const i = lines.findIndex((l) => l.startsWith(`| ${id} |`))
	if (i < 0) throw new Error(`no row ${id}`)
	const m = lines[i].match(/^(.*\| P\d \| )(.*?)( \|)$/); if (!m) throw new Error(`row shape ${id}`)
	const next = fn(m[2]); if (next === null) { console.log(`SKIP gap ${id}`); return }
	lines[i] = m[1] + next + m[3]; write(f, o, lines.join('\n'))
}

// ---------------------------------------------------------------- disambiguation
patch(DIS, [
	[
		'that string exists in **no** code,\n   script or config. The code has `AgentOptions.GrantVipEnabled` (bool,\n   default `false`). How the option is fed (env binding name) was not traced\n   here.',
		'those strings appear **only in comments and\n   documents** — no code or script reads an environment variable of that name. The real switch is\n   `AgentOptions.GrantVipEnabled` (bool, default `false`), bound from the `Agent` configuration section; `Program.cs`\n   also reads environment variables with the prefix `BLOODMOON_AGENT_`, so the variable is\n   `BLOODMOON_AGENT_Agent__GrantVipEnabled` (and `…SyncVipTierEnabled`, `…AnonymizeEnabled`, `…PurgeEnabled`).\n   The tracked template `deploy/game-bridge/Start-GameBridgeAgent.ps1` sets `BLOODMOON_AGENT_Agent__*` for the\n   ids, URLs, secrets and paths but **none** of the four switches (the production copy was not read).\n   *(Traced in Phase 20B, CLAIM-155; the earlier "exists in no code" wording is corrected.)*'
	],
	[
		'VPS-side task/binary/version still unverified)**',
		'~~VPS-side task/binary/version still unverified~~ — Phase 20B, 2026-09-21: VPS side verified read-only: ' + VPSFACT + ')**'
	],
	[
		'(the inspection to run is described in `GAME_CURRENCY_DELIVERY_ANALYSIS.md` Part 14.4).',
		'(the inspection to run is described in `GAME_CURRENCY_DELIVERY_ANALYSIS.md` Part 14.4). **Update 2026-09-21 (Phase 20B): the VPS half was then inspected read-only and verified — `' + EV + '`; ~~still unverified~~. See Part 8 below.**'
	]
], [
	{
		mark: '## Part 8 — Command deployment matrix',
		text: `
## Part 8 — Command deployment matrix (Phase 20B, 2026-09-21)

Each column is a **different layer**; a command is deployed only if every layer is. "Installed on production SQL"
comes from documents (ADR-0002, \`docs/security/game-write-boundary.md\`, the review package) — production SQL
Server was **not** contacted in Phase 20B.

| Command | Portal type | Worker | D1 schema (remote) | Agent | SQL procedure (source) | Installed on prod SQL | Prod tested | Status |
|---|---|---|---|---|---|---|---|---|
| \`CREATE_GAME_ACCOUNT\` | yes | **committed + deployed** | **yes** (0003; CHECK = this type only) | **deployed** (0.1.0+20a0d71c, built 2026-08-24) | \`dbo.DmN_CreateGameAccount\` (\`references/…/phase-3c-write-schema-verification-20260824/derived/\`) | **yes** | **yes** — 2 QA commands + replay/restart tests | **DEPLOYED, ACTIVE polling; traffic idle since 2026-08-25** |
| \`GRANT_VIP\` | yes | routing **only on the preservation branch** | **no** (0004 not applied) | handler in committed source; **not** in the deployed build; switch default off | \`bm_GrantVip\` (preserved) | no | no | **IMPLEMENTED_NOT_DEPLOYED** |
| \`SYNC_VIP_TIER\` | yes | same | no | same | \`bm_SyncVipTier\` | no | no | **IMPLEMENTED_NOT_DEPLOYED** |
| \`ANONYMIZE_GAME_ACCOUNT\` | yes | same | no | same | \`bm_AnonymizeGameAccount\` | no | no | **IMPLEMENTED_NOT_DEPLOYED** |
| \`PURGE_GAME_ACCOUNT\` | yes | same | no | same | \`bm_PurgeGameAccount\` | no | no | **IMPLEMENTED_NOT_DEPLOYED** |
| \`CREDIT_GAME_CURRENCY\` | **no** | **no** | **no** | **no** | **none** | — | — | **DOES_NOT_EXIST** (CLAIM-153) |

The SQL artifacts, their classification and the excluded credential-bearing file are documented in
\`PRESERVATION-MANIFEST.md\` on the branch \`gamebridge/preserve-command-extension\` (CLAIM-152).

### Live state, kept apart (2026-09-21)

| Side | State | Evidence |
|---|---|---|
| **Cloudflare** | **ACTIVE** — heartbeat 23 s old, ≈52 signed claim polls / 10 min, migrations 0001–0003, no command since 2026-08-25 | \`${EV}raw/d1-*\` (CLAIM-151) |
| **VPS** | **ACTIVE** — one process since 2026-08-25T01:33Z, task \`Ready\`, binary sha256 \`5BED7747…B33C\`, 0.1.0+20a0d71c | \`${EV}raw/vps-01-agent-state.json\` (CLAIM-149) |
| **End to end** | **ACTIVE for \`CREATE_GAME_ACCOUNT\`** (polling live on both ends), **traffic idle**; no command was sent, so a fresh round trip was not demonstrated | — |
| Extensions | **NOT_DEPLOYED** at the Agent build, Worker code, D1 schema and SQL layers | CLAIM-150, CLAIM-153 |

Timeline, never collapsed: **2026-08-24** deployed (historical, Phase 3D-A) → **2026-08-25** Agent restarted, last command →
**2026-09-19** Cloudflare half verified, VPS blocked → **2026-09-21** both halves verified. Unexplained and recorded as
open in GAP-P20-02: the task is \`Ready\` while the process runs (task triggers and start script were deliberately not read).
`
	},
	{
		mark: '## Part 9 — Terminology cleanup: Phase 20B additions',
		text: `
## Part 9 — Terminology cleanup: Phase 20B additions (2026-09-21, documentation only, meaning certain)

Fixed: \`docs/environment/development-environment.md:25\` (path to \`docs/gamebridge/gamebridge-local-testing.md\`);
\`docs/marketplace.md:52\` ("game bridge worker" = \`MARKETPLACE_DELIVERY_WORKER\`);
\`docs/vip/wz-setaccountlevel-coexistence.md:163\` (dated note: the Portal caller exists since Phase O);
\`docs/gamebridge/gamebridge-local-testing.md\` and \`gamebridge-agent-extension-plan.md:577\` (kill-switch names).
The remaining items above stay a **documentation-only, non-blocking** list (Bryan, 2026-09-21); code comments
(\`schema.prisma\`, \`launcher.service.ts\`, \`index.vue\`) were deliberately not touched.
`
	}
])

// ---------------------------------------------------------------- analysis doc
const AN = 'docs/knowledge/GAME_CURRENCY_DELIVERY_ANALYSIS.md'
patch(AN, [
	[
		'| **UNVERIFIED** — the read-only SSH inspection was blocked by the session\'s permission classifier ("Production Reads") and was **not** retried or worked around |',
		'| ~~**UNVERIFIED** — the read-only SSH inspection was blocked by the session\'s permission classifier ("Production Reads") and was **not** retried or worked around~~ **VERIFIED 2026-09-21 (Phase 20B):** ' + VPSFACT + ' (Part 15.2) |'
	],
	[
		'It needs Bryan to allow that action, or to run it.',
		'~~It needs Bryan to allow that action, or to run it.~~ **Done 2026-09-21 (Part 15.2).**'
	],
	[
		'| **PARTIAL** — extension preserved and tests re-run (14.9); 0004 not applied; Agent deploy path untested; SQL procedures still untracked |',
		'| **PARTIAL** — Worker extension **and** SQL artifacts preserved (Phase 20B; 11 of 12 SQL files), tests re-run; 0004 not applied; Agent deploy path untested (the running Agent build predates the extension) |'
	],
	[
		'| **PARTIAL** — Cloudflare half done, VPS half blocked (14.4) |',
		'| ~~PARTIAL — Cloudflare half done, VPS half blocked~~ **DONE 2026-09-21** — both halves verified read-only (Part 15.2) |'
	],
	[
		'Remaining loss risk: the four SQL procedures (`references/game-data/sql-discovery/gamebridge-extension-20260830/`,\n11 files, one flagged for secret review) are still untracked in the same worktree (GAP-P20-02, GAP-P20-10).',
		'~~Remaining loss risk: the four SQL procedures (`references/game-data/sql-discovery/gamebridge-extension-20260830/`,\n11 files, one flagged for secret review) are still untracked in the same worktree (GAP-P20-02, GAP-P20-10).~~\n**(Phase 20B, 2026-09-21)** the SQL artifacts are now preserved as well (11 of 12 files, commit `2d0f6106`, manifest\n`ddf50640`); only `local-writer-login.sql` remains untracked and excluded as SECRET_BEARING (GAP-P20-11).'
	]
], [{
	mark: '## Part 15 — Phase 20B (2026-09-21)',
	text: `
## Part 15 — Phase 20B (2026-09-21): decisions, live verification and preservation

Nothing here implements, enables, deploys, installs or sends anything. No SQL was executed.

### 15.1 Decisions recorded (Bryan, 2026-09-21)

| Decision | Recorded value |
|---|---|
| Phase 20A into \`main\` | done — fast-forward \`c1b34062\` → \`90450060\`, no merge commit, no push |
| Extension SQL | preserved on \`gamebridge/preserve-command-extension\` **except** \`local-writer-login.sql\`, excluded until a dedicated secret review (CLAIM-152) |
| VPS read-only verification | authorised and **done** (15.2) |
| Lab GameServer | **not to be built now** → \`GAME_CURRENCY_VISIBILITY = UNKNOWN\` — currency delivery is out of scope for the initial Beta, no runnable lab exists, and a closed-source runtime is not worth introducing only for this evidence now |
| \`CREDIT_GAME_CURRENCY\` | **not to be implemented**; recorded as \`DOES_NOT_EXIST\` — no placeholder created (CLAIM-153) |
| Terminology cleanup | documentation-only, non-blocking (Part 7 of \`GAMEBRIDGE_DISAMBIGUATION.md\`) |
| Unchanged | \`BETA_INITIAL_GAME_CURRENCY_DELIVERY = OUT_OF_SCOPE\` · \`PORTAL_WC_TARGET_GAME_CURRENCY = UNRESOLVED\` · \`GAME_CURRENCY_DELIVERY_DIRECTION = OPTION_B\` · \`GAME_CURRENCY_DELIVERY_IMPLEMENTATION_APPROVED = NO\` (CLAIM-154) |

The Part 14.3 visibility test design stays on file, **parked**: nobody is to build the lab for it now.

### 15.2 Live state — verified on both halves (\`${EV}\`)

| Side | State | Key facts |
|---|---|---|
| Cloudflare | **ACTIVE** | migrations 0001–0003 (**0004 not applied**); \`game_command\` still CREATE-only; 2 commands ever, none since 2026-08-25; heartbeat 23 s old; ≈52 claim polls / 10 min |
| VPS | **ACTIVE** | scheduled task \`BloodMoonGameBridgeAgent\` **Ready**; one \`BloodMoonGameBridgeAgent.exe\` (PID 10388) running since **2026-08-25T01:33Z**; single binary sha256 \`5BED7747A6A9636C250B98C8DA575E2F27981C16576C588771E8349AB02AB33C\`, version \`0.1.0+20a0d71c…\` |
| End to end | **ACTIVE for \`CREATE_GAME_ACCOUNT\`, traffic idle** | no command was sent; a fresh round trip is not demonstrated |

What the version tells us: the binary embeds commit \`20a0d71c\` (2026-08-24 12:49 −0300) — which has **no** \`GameCommandWorker.cs\` —
and was built at 14:49 −0300, five minutes **before** the transport commit \`7b4fed13\` (14:55). So it was built from
the parent commit plus uncommitted changes (the same pre-commit pattern as the Worker upload), and, because the
extension handlers date from 2026-08-30, the running Agent **cannot** contain them (inference by chronology, CLAIM-150;
the binary was not string-scanned). **Implication for any future extension deploy:** it needs a **new Agent build**;
the deploy path for a new build has never been exercised (P5).

Not established: why the task is \`Ready\` while the process runs (triggers and the start script were not read), so
**reboot persistence of the Agent is unverified**; whether the Agent's logs show errors (not read).

### 15.3 Prerequisites after Phase 20B

P2 **done** · P9 **done** · P5 **partial** (Worker and SQL preserved; 0004 not applied; new-build deploy untested) ·
P1, P3, P4, P6, P7, P8 **open**. Accepting Option B as a direction, and this phase's evidence, closed no gap
that the direction decision left open (Part 14.1).

### 15.4 Extension preservation state

Worker: \`gamebridge/preserve-command-extension\` (\`3e69937e\` + manifest \`6003c59a\`). SQL: \`2d0f6106\` (11 files, byte-identical) +
manifest \`ddf50640\`. **Not merged, not deployed, not canonical.** Excluded: \`local-writer-login.sql\` (SECRET_BEARING; original still
untracked in openbeta; GAP-P20-11). The command deployment matrix is Part 8 of \`GAMEBRIDGE_DISAMBIGUATION.md\`.
`
}])

// ---------------------------------------------------------------- gaps
const G = 'docs/knowledge/KNOWLEDGE_GAPS.md'
gapCell(G, 'GAP-P20-02', (c) => c.includes('Phase 20B') ? null : '**PARTIAL — more precise (re-evaluated 2026-09-21, Phase 20B).** Done: Worker extension and SQL artifacts preserved on `gamebridge/preserve-command-extension` (11 of 12 SQL files; one SECRET_BEARING file excluded); remote D1 0001–0003 only with the CREATE-only CHECK; Agent verified live on **both** halves (VPS process running since 2026-08-25, binary 0.1.0+20a0d71c built 2026-08-24 — before the extension existed; heartbeat and claim polling live); command deployment matrix recorded (only CREATE_GAME_ACCOUNT deployed; four extension commands IMPLEMENTED_NOT_DEPLOYED; CREDIT_GAME_CURRENCY does not exist); runbooks annotated. **Still open:** why the task is `Ready` while the process runs, and reboot persistence (task triggers not read); whether the Agent logs show errors (not read); no string-scan of the binary (CLAIM-150 is an inference); Worker/SQL/0004 are undeployed by design; the deploy path for a *new* Agent build is untested.')
gapCell(G, 'GAP-P20-10', (c) => c.includes('Phase 20B') ? null : '**RESOLVED for the 11 safe files (2026-09-21, Phase 20B):** preserved byte-identical on `gamebridge/preserve-command-extension` (`2d0f6106`, manifest `ddf50640`) after a redacting secret review; the one SECRET_BEARING file is excluded and tracked as GAP-P20-11. (Original status: not in scope, not moved.)')
gapCell(G, 'GAP-P20-04', (c) => c.includes('parked') ? null : c + ' **Phase 20B decision (2026-09-21): deliberately parked** — no lab GameServer is to be built now (currency delivery is out of Beta scope); `GAME_CURRENCY_VISIBILITY = UNKNOWN` stays. Not closed.')
gapCell(G, 'GAP-P20-08', (c) => c.includes('Phase 20B') ? null : c + ' **Phase 20B:** five more certain-meaning documentation items fixed (broken link, marketplace worker name, VIP-caller note, kill-switch names ×2); the rest is a documentation-only, non-blocking list (Bryan, 2026-09-21).')
patch(G, [], [{
	mark: '| GAP-P20-11 |',
	text: '\n| GAP-P20-11 | SECURITY | `derived/local-writer-login.sql` (2964 bytes) contains a `CREATE LOGIN` with a `PASSWORD` literal; it is excluded from preservation as SECRET_BEARING and remains untracked in `mu-bloodmoon-v1-openbeta`. The folder README says the value is a placeholder — **unverified** (only its shape was checked; the value was never printed) | Residual loss risk (low impact: a disposable local-test login, regenerable from the grants pattern) and an unreviewed credential-shaped file in an untracked worktree | a dedicated human secret review; then commit unchanged (if verifiably a placeholder) or a redacted copy | P2 | OPEN |\n'
}])

// ---------------------------------------------------------------- conflicts
patch('docs/knowledge/CONFLICTS.md', [
	[
		'(SSH inspection blocked, not retried).',
		'(SSH inspection blocked, not retried).\n- **Update 2026-09-21 (Phase 20B):** the VPS half was then inspected read-only — ' + VPSFACT + '. Claim A is wrong for `CREATE_GAME_ACCOUNT`; the runbook annotations were extended with these facts (`' + EV + '`). Still unexplained: task `Ready` while the process runs (GAP-P20-02).'
	],
	[
		'so the database also rejects the four types.',
		'so the database also rejects the four types. **Update 2026-09-21:** the SQL half is now preserved too (11 of 12 files; `local-writer-login.sql` excluded as SECRET_BEARING) and the deployed Agent build (2026-08-24) predates the extension — the extension is undeployed at the Agent-build, Worker-code, D1-schema and SQL layers.'
	]
])

// ---------------------------------------------------------------- master index
patch('docs/knowledge/KNOWLEDGE_MASTER_INDEX.md', [
	[
		'Cloudflare side verified 2026-09-19 (heartbeat live; migrations 0001–0003; 0004 **not** applied); VPS side **unverified**; CLAIM-145',
		'**verified on both halves 2026-09-21** — Cloudflare (heartbeat live, migrations 0001–0003, 0004 **not** applied) and VPS (process running since 2026-08-25, task `Ready`, binary 0.1.0+20a0d71c built 2026-08-24, predating the extension); evidence `' + EV + '`; CLAIM-149..151'
	],
	[
		'(deployed 2026-08-24; state not re-verified)',
		'(deployed 2026-08-24; **verified running 2026-09-21**, traffic idle)'
	],
	[
		'CLAIM-146 |',
		'CLAIM-146 |\n| "Where is the SQL for the four extension procedures? Which command types are deployed?" | branch `gamebridge/preserve-command-extension`: `references/game-data/sql-discovery/gamebridge-extension-20260830/` + `PRESERVATION-MANIFEST.md` (11 of 12 files; `local-writer-login.sql` excluded as SECRET_BEARING); deployment matrix: `GAMEBRIDGE_DISAMBIGUATION.md` Part 8 — only `CREATE_GAME_ACCOUNT` is deployed; `CREDIT_GAME_CURRENCY` does not exist; CLAIM-152/153 |'
	]
])

// ---------------------------------------------------------------- integration map
patch('docs/knowledge/CASH_VIP_INTEGRATION_MAP.md', [[
	'(2026-08-24 evidence, current state not re-checked);',
	'(2026-08-24 evidence; ~~current state not re-checked~~ verified running 2026-09-21);'
]])

// ---------------------------------------------------------------- registry
const q = JSON.parse(readFileSync('knowledge/vendor-sweep/verification-queue.json', 'utf8')).summary
const cf = JSON.parse(readFileSync('knowledge/vendor-sweep/canonical-facts.json', 'utf8')).canonicalFactCount
patch('docs/knowledge/SOURCE_REGISTRY.md', [
	[
		'| Atomic claims | **148** (99 before Phase 18D; +CLAIM-100..124 in 18D; +CLAIM-125..138 in Phase 20; +CLAIM-139..148 in Phase 20A), of which 93 are canonical facts (`CONFIRMED_BY_*`) |',
		`| Atomic claims | **155** (99 before Phase 18D; +CLAIM-100..124 in 18D; +CLAIM-125..138 in Phase 20; +CLAIM-139..148 in Phase 20A; +CLAIM-149..155 in Phase 20B), of which ${cf} are canonical facts (\`CONFIRMED_BY_*\`) |`
	],
	[
		'| Verification queue | 78 items: 58 DONE, 4 QUEUED, 16 BLOCKED |',
		`| Verification queue | ${q.total} items: ${q.done} DONE, ${q.queued} QUEUED, ${q.blocked} BLOCKED |`
	]
], [{
	mark: '### Phase 20B evidence folders',
	text: `
### Phase 20B evidence folders (2026-09-21)

| Folder / branch | Kind | What | Notes |
|---|---|---|---|
| \`${EV.slice(0, -1)}\` | **RAW**, read-only | one audited read-only VPS inspection (scheduled task, process, binary sha256/version) + SELECT-only remote D1 and Worker deployment list | the exact script is in \`tools/\`; no secrets folder, no command line, no file contents read; no command sent |
| branch \`gamebridge/preserve-command-extension\` (\`2d0f6106\`, \`ddf50640\`) | preserved source | 11 SQL artifacts (byte-identical) + \`PRESERVATION-MANIFEST.md\` | \`local-writer-login.sql\` excluded (SECRET_BEARING); not merged, not deployed |
`
}])

// ---------------------------------------------------------------- certain-meaning documentation clarifications
patch('docs/environment/development-environment.md', [[
	'ver `docs/environment/gamebridge-local-testing.md` para o papel',
	'ver ~~`docs/environment/gamebridge-local-testing.md`~~ `docs/gamebridge/gamebridge-local-testing.md` *(caminho corrigido em 2026-09-21, Fase 20B)* para o papel'
]])
patch('docs/marketplace.md', [[
	'The game bridge worker processes the resulting',
	'The game bridge worker **[= `MARKETPLACE_DELIVERY_WORKER`, Phase 20B]** processes the resulting'
]])
patch('docs/vip/wz-setaccountlevel-coexistence.md', [[
	'**GRANT_VIP has no real, wired production caller anywhere in the Portal\ntoday**',
	'**GRANT_VIP has no real, wired production caller anywhere in the Portal\ntoday** *(Phase 20B annotation, 2026-09-21: true when written; since Phase O the Portal has a real caller, `GameBridgeVipGateway` in `game-bridge-vip.gateway.ts`, gated by `VIP_DELIVERY_WORKER_ENABLED`, documented as always off in production — and the command still cannot flow end to end because the Worker, D1 schema and deployed Agent build do not support it)*'
]])
patch('docs/gamebridge/gamebridge-local-testing.md', [[
	'kill switches, `AgentOptions`, all default `false`);',
	'kill switches, `AgentOptions`, all default `false` — **Phase 20B note:** these `GAME_BRIDGE_*_ENABLED` names are documentation names; no code reads them. The real options are `AgentOptions.GrantVipEnabled`/`SyncVipTierEnabled`/`AnonymizeEnabled`/`PurgeEnabled`, set through `BLOODMOON_AGENT_Agent__<Option>`);'
]])
patch('docs/gamebridge/gamebridge-agent-extension-plan.md', [[
	'- **`GAME_BRIDGE_GRANT_VIP_ENABLED`** — checked by',
	'- **`GAME_BRIDGE_GRANT_VIP_ENABLED`** *(Phase 20B note: documentation name; the code option is `AgentOptions.GrantVipEnabled`, environment variable `BLOODMOON_AGENT_Agent__GrantVipEnabled`)* — checked by'
]])

// bump lastVerified
for (const f of [DIS, AN, G, 'docs/knowledge/CONFLICTS.md', 'docs/knowledge/KNOWLEDGE_MASTER_INDEX.md', 'docs/knowledge/SOURCE_REGISTRY.md', 'docs/knowledge/CASH_VIP_INTEGRATION_MAP.md']) {
	const o = read(f); if (o.t.includes('lastVerified: 2026-09-19')) write(f, o, o.t.replace('lastVerified: 2026-09-19', 'lastVerified: 2026-09-21'))
}
