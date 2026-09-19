#!/usr/bin/env node
// Phase 20A -- one-time, idempotent annotation of the documents that say the
// GameBridge Agent was "never deployed". Non-destructive: each original sentence
// is kept (struck through) and a dated annotation is added, following the
// project's "corrections stay visible" rule. Run from the repository root.
//
// Evidence for the annotation:
//   history : references/game-data/sql-discovery/phase-3d-a-production-command-transport-20260824/raw/02..04
//   current : read-only Cloudflare D1 queries on 2026-09-19 (heartbeat, command-claim nonces, migration list)
// What was NOT verified: the VPS-side scheduled task / binary hash (the read-only SSH inspection was
// blocked by the session's permission classifier and left undone).
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const MARK = 'Phase 20A'
const EV = 'references/game-data/sql-discovery/phase-3d-a-production-command-transport-20260824/'
const SHORT =
	'the Agent has run on the game VPS as a scheduled task (`BloodMoonGameBridgeAgent`, SYSTEM, at startup) since ' +
	'2026-08-24 executing only `CREATE_GAME_ACCOUNT`; the four extension command types were never deployed. ' +
	'Verified read-only through Cloudflare D1 on 2026-09-19: heartbeat `gamebridge-agent-01` seen 21 s earlier and ' +
	'53 signed command-claim polls in the preceding 10 minutes; the VPS-side task and binary were not inspected. ' +
	'See `docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md` Part 5.'

const edits = [
	{
		file: 'docs/operations/deployment-rollback-runbook.md',
		replace: [
			[
				'- **Has never been deployed to production** — confirmed this phase and',
				'- ~~**Has never been deployed to production**~~ **(annotation 2026-09-19, ' + MARK + ': incorrect for `CREATE_GAME_ACCOUNT` — see the note after this bullet)** — confirmed this phase and'
			],
			[
				'phase). There is currently nothing live to roll back.',
				'phase). ~~There is currently nothing live to roll back.~~\n\n  > **Annotation (2026-09-19, ' + MARK + '):** ' + SHORT + ' Historical evidence: `' + EV + '`. No rollback path for the Agent binary has been tested; the four extension procedures are not installed on production.'
			],
			[
				'| GameBridge Agent | N/A — never deployed | N/A | N/A |',
				'| GameBridge Agent | ~~N/A — never deployed~~ **(annotation 2026-09-19: deployed 2026-08-24; no tested rollback path — see above)** | N/A | N/A |'
			]
		]
	},
	{
		file: 'docs/operations/incident-response-runbook.md',
		replace: [
			[
				'back (the Agent has never been deployed to production as a persistent\n  service in the first place — `docs/game-data/deployment-topology.md`).',
				'back (~~the Agent has never been deployed to production as a persistent\n  service in the first place~~ **annotation 2026-09-19, ' + MARK + ':** ' + SHORT + ' `docs/game-data/deployment-topology.md` describes the Phase 2C state of 2026-08-20, not the current one).'
			]
		]
	},
	{
		file: 'docs/operations/pre-beta-go-no-go-checklist.md',
		replace: [
			[
				'the Agent itself has never been deployed as a persistent service |',
				'~~the Agent itself has never been deployed as a persistent service~~ **(annotation 2026-09-19, ' + MARK + ': it runs as a scheduled task since 2026-08-24 and its heartbeat was verified live through D1 on 2026-09-19; only the four extension command types are undeployed — `docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md` Part 5)** |'
			]
		]
	},
	{
		file: 'docs/operations/phase-aa-ops-hardening-report.md',
		replace: [
			[
				'the GameBridge Agent has never been deployed at all) that this',
				'~~the GameBridge Agent has never been deployed at all~~ **[annotation 2026-09-19, ' + MARK + ': contradicted by the 2026-08-24 Phase 3D-A evidence and by `provisioning-health.md` from this same phase — ' + SHORT + ']**) that this'
			]
		]
	},
	{
		file: 'context/CURRENT_STATE.md',
		replace: [
			[
				'— not yet deployed against real infrastructure.',
				'— ~~not yet deployed against real infrastructure~~ **(annotation 2026-09-19, ' + MARK + ': the Worker, D1 and Agent run against real infrastructure — Phase 2D end-to-end PASS 2026-08-20, Phase 3D-A production command path 2026-08-24, heartbeat verified live through D1 on 2026-09-19; the VPS-side task/binary was not inspected; see `docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md` Part 5)**.'
			]
		]
	},
	{
		file: 'docs/game-data/deployment-topology.md',
		replace: [
			[
				'# Deployment topology and secure SQL connectivity (Phase 2C)\n',
				'# Deployment topology and secure SQL connectivity (Phase 2C)\n\n> **Annotation (2026-09-19, ' + MARK + ') — this document is a 2026-08-20 snapshot and is superseded on deployment state.** Its statements that the Agent is "still undeployed", has no Windows Service and that Cloudflare was "blocked, not attempted" were true on 2026-08-20. Since then: real Worker, D1 and Queue were provisioned (Phase 2D, 2026-08-20; D1 migration 0003 applied 2026-08-24) and the Agent was installed on the VPS as a scheduled task on 2026-08-24 (Phase 3D-A, `' + EV + '`). The Windows-Service-readiness table below still describes real, unimplemented hardening (log bounding, least-privilege OS user). Current verified state: `docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md` Part 5.\n'
			]
		]
	},
	{
		file: 'docs/architecture/control-plane-domain-audit.md',
		replace: [
			[
				'(placeholder D1 `database_id`), the one real SQL Server connection proof\nwas a throwaway probe, not a deployed service.',
				'(placeholder D1 `database_id`), the one real SQL Server connection proof\nwas a throwaway probe, not a deployed service. **[Annotation 2026-09-19, ' + MARK + ': stale on infrastructure — the real D1 `database_id` is in `wrangler.toml`, Phase 2D passed end to end on 2026-08-20 and the Agent has run in production since 2026-08-24 (`CREATE_GAME_ACCOUNT` only). The statement that the extension commands are not wired through the Worker remains true of every committed branch; the extension exists only as preserved, undeployed code (`gamebridge/preserve-command-extension`).]**'
			]
		]
	}
]

let changed = 0
for (const e of edits) {
	const p = join(ROOT, e.file)
	let text = readFileSync(p, 'utf8')
	const crlf = text.includes('\r\n')
	if (crlf) text = text.replace(/\r\n/g, '\n')
	let touched = false
	for (const [from, to] of e.replace) {
		if (text.includes(to)) { continue } // already applied
		if (!text.includes(from)) throw new Error(`${e.file}: anchor not found: ${from.slice(0, 60)}`)
		text = text.replace(from, () => to)
		touched = true
	}
	if (touched) {
		writeFileSync(p, crlf ? text.replace(/\n/g, '\r\n') : text, 'utf8')
		changed++
		console.log(`annotated ${e.file}`)
	} else console.log(`already annotated ${e.file}`)
}
console.log(`files changed: ${changed}`)
