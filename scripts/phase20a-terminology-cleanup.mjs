#!/usr/bin/env node
// Phase 20A -- one-time, idempotent terminology clarification for the few
// "GameBridge" statements where the intended system is CERTAIN (the write path is
// GAME_COMMAND_TRANSPORT; the read-only ingest is GAME_DATA_TELEMETRY; the
// marketplace script is MARKETPLACE_DELIVERY_WORKER). Additive only: the original
// wording stays and a canonical name is appended in brackets. Anything whose meaning
// is not certain is NOT touched -- it is listed in docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md
// Part 7 for a future cleanup. Run from the repository root.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const DOC = 'docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md'

const edits = [
	{
		file: 'context/ARCHITECTURE.md',
		replace: [[
			'| GameBridge (existing VIP/account write path) | CURRENT | `docs/gamebridge/` |',
			'| GameBridge (existing VIP/account write path) **[= `GAME_COMMAND_TRANSPORT`; live for `CREATE_GAME_ACCOUNT` only, the VIP/anonymize/purge commands are implemented-not-deployed — see `' + DOC + '`]** | CURRENT | `docs/gamebridge/` |'
		]]
	},
	{
		file: 'context/INFRASTRUCTURE.md',
		replace: [[
			'  GameBridge — `docs/security/game-write-boundary.md`.',
			'  GameBridge — `docs/security/game-write-boundary.md`. **[Writes: `GAME_COMMAND_TRANSPORT`; reads: `GAME_DATA_TELEMETRY` — `' + DOC + '`.]**'
		]]
	},
	{
		file: 'context/CURRENT_STATE.md',
		replace: [[
			'  GameBridge — see [`domains/game-economy.md`](domains/game-economy.md).',
			'  GameBridge **[= `GAME_COMMAND_TRANSPORT` for writes — `' + DOC + '`]** — see [`domains/game-economy.md`](domains/game-economy.md).'
		]]
	},
	{
		file: 'docs/README.md',
		replace: [[
			'Worker), que é o único caminho de escrita para o banco do jogo.',
			'Worker), que é o único caminho de escrita para o banco do jogo **[nomes canônicos (Fase 20A): a escrita é `GAME_COMMAND_TRANSPORT`; o mesmo binário também hospeda a telemetria somente-leitura `GAME_DATA_TELEMETRY` — ver `' + DOC + '`]**.'
		]]
	},
	{
		file: 'apps/game-bridge-agent/README.md',
		replace: [[
			'No writes, ever.',
			'No writes, ever. **[Phase 20A note: this sentence describes the read-only telemetry phase (`GAME_DATA_TELEMETRY`). The same project later gained a write path (`GAME_COMMAND_TRANSPORT`, `Commands/` + `SqlServerGameDatabaseWriter`), running under a separate SQL login — see `' + DOC + '`.]**'
		]]
	},
	{
		file: 'docs/game-data/architecture.md',
		replace: [[
			'## Read-only, absolutely\n',
			'## Read-only, absolutely\n\n> **Phase 20A note:** "read-only" here describes `GAME_DATA_TELEMETRY` only. The same Agent process also hosts the write path `GAME_COMMAND_TRANSPORT` (separate HMAC secrets, separate SQL login, separate local ledger) — see `' + DOC + '`.\n'
		]]
	},
	{
		file: 'docs/knowledge/KNOWLEDGE_MASTER_INDEX.md',
		replace: [[
			'GameBridge worker itself is a deliberate always-fail scaffold',
			'the worker (`MARKETPLACE_DELIVERY_WORKER`) is a deliberate always-fail scaffold'
		]]
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
		if (text.includes(to)) continue
		if (!text.includes(from)) throw new Error(`${e.file}: anchor not found: ${from.slice(0, 70)}`)
		text = text.replace(from, () => to)
		touched = true
	}
	if (touched) { writeFileSync(p, crlf ? text.replace(/\n/g, '\r\n') : text, 'utf8'); changed++; console.log(`clarified ${e.file}`) }
	else console.log(`already clarified ${e.file}`)
}
console.log(`files changed: ${changed}`)
