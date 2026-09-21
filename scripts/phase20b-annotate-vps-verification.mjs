#!/usr/bin/env node
// Phase 20B -- idempotent, non-destructive annotation of the runbook / context
// documents that Phase 20A annotated with "the VPS-side task and binary were not
// inspected". Phase 20B inspected them read-only (2026-09-21). Each 20A sentence
// is kept (struck through) and a dated 20B sentence follows it -- the project's
// "corrections stay visible" rule. Run from the repository root.
//
// Evidence: references/game-data/sql-discovery/phase-20b-live-agent-verification-20260921/
// What stays UNVERIFIED (carried into the annotation, not hidden): the scheduled
// task reads `Ready` although the process runs; the task's triggers (reboot
// persistence), the Agent's logs and the binary's contents were not read.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const EV = 'references/game-data/sql-discovery/phase-20b-live-agent-verification-20260921/'

const OLD_A = 'the VPS-side task and binary were not inspected.'
const NEW_A =
	'~~the VPS-side task and binary were not inspected~~ **[Phase 20B, 2026-09-21: inspected read-only — process ' +
	'`BloodMoonGameBridgeAgent.exe` running since 2026-08-25, task state `Ready`, binary sha256 `5BED7747…AB33C` ' +
	'(`0.1.0+20a0d71c`, built 2026-08-24), which predates the extension handlers; heartbeat still live; the four ' +
	'extension commands are not deployed; task triggers, Agent logs and binary contents were not read. Evidence: `' + EV + '`]**.'

const OLD_B = 'the VPS-side task/binary was not inspected;'
const NEW_B =
	'~~the VPS-side task/binary was not inspected~~ **[Phase 20B, 2026-09-21: inspected read-only — Agent process running since ' +
	'2026-08-25, binary `0.1.0+20a0d71c` built 2026-08-24, extension handlers not deployed; ' + EV + ']**;'

const edits = [
	{ file: 'docs/operations/deployment-rollback-runbook.md', pairs: [[OLD_A, NEW_A]] },
	{ file: 'docs/operations/incident-response-runbook.md', pairs: [[OLD_A, NEW_A]] },
	{ file: 'docs/operations/phase-aa-ops-hardening-report.md', pairs: [[OLD_A, NEW_A]] },
	{ file: 'context/CURRENT_STATE.md', pairs: [[OLD_B, NEW_B]] }
]

let changed = 0
for (const e of edits) {
	const p = join(ROOT, e.file)
	let text = readFileSync(p, 'utf8')
	const crlf = text.includes('\r\n')
	if (crlf) text = text.replace(/\r\n/g, '\n')
	let touched = false
	for (const [from, to] of e.pairs) {
		if (text.includes(to)) continue // already applied
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
