#!/usr/bin/env node
// Phase 20C -- idempotent update of the knowledge docs for Bryan's 2026-09-21 closure decisions:
// local-writer-login.sql stays excluded as a standing policy (GAP-P20-11 RESOLVED_AS_POLICY), the optional
// Agent follow-ups are deferred (GAP-P20-02 residue open, non-blocking), currency delivery stays parked.
// Additive with visible corrections; documentation only; nothing under context/preservation/**.
// No credential value is read or written. Run from the repository root after the claim sync and generators.
import { readFileSync, writeFileSync } from 'node:fs'

const DIS = 'docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md'
const ANA = 'docs/knowledge/GAME_CURRENCY_DELIVERY_ANALYSIS.md'
const GAPS = 'docs/knowledge/KNOWLEDGE_GAPS.md'
const REG = 'docs/knowledge/SOURCE_REGISTRY.md'
const IDX = 'docs/knowledge/KNOWLEDGE_MASTER_INDEX.md'
const canonical = JSON.parse(readFileSync('knowledge/vendor-sweep/canonical-facts.json', 'utf8'))
const claimTotal = JSON.parse(readFileSync('knowledge/vendor-sweep/atomic-claims.json', 'utf8')).claims.length
const canonicalCount = (canonical.facts || canonical.canonicalFacts || []).length

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

// ---------------------------------------------------------------- gaps
patch(GAPS, [[
	'a dedicated human secret review; then commit unchanged (if verifiably a placeholder) or a redacted copy',
	'~~a dedicated human secret review; then commit unchanged (if verifiably a placeholder) or a redacted copy~~ **(Phase 20C) no review is needed: the exclusion itself is the policy**'
]])
gapCell(GAPS, 'GAP-P20-11', (c) => c.includes('RESOLVED_AS_POLICY')
	? null
	: '~~OPEN~~ **RESOLVED_AS_POLICY (2026-09-21, Phase 20C).** Bryan decided that `local-writer-login.sql` stays excluded from tracked source (`LOCAL_WRITER_LOGIN_POLICY = EXCLUDED_SECRET_BEARING_SOURCE`, CLAIM-156): the original is never copied into a tracked file; only its path, size, SHA-256 and structural counts stay recorded (`PRESERVATION-MANIFEST.md`). No redacted template was created — a Phase 20C judgement, not a Bryan decision: the login-creation and grant pattern is already tracked with a non-literal password (`phase-3c-write-schema-verification-20260824/derived/proposed-writer-login-grants.sql`) and the extension grants are preserved (`proposed-writer-login-grants-extension.sql`), so a template would add no information. **Residual, accepted:** the original stays untouched and untracked in `mu-bloodmoon-v1-openbeta` (low impact: a disposable local-test login, regenerable); whether its password literal is a placeholder was never verified and is not needed. No file with this name has ever been committed on any ref (checked by name, all refs).')
gapCell(GAPS, 'GAP-P20-02', (c) => c.includes('Phase 20C')
	? null
	: c + ' **(Phase 20C, 2026-09-21)** Bryan deferred the two optional read-only follow-ups — the string scan of a copy of the deployed binary and the read of the scheduled task triggers and action — so the residue above is **OPEN, NON_BLOCKING** (CLAIM-157); nothing new was verified in Phase 20C.')

// ---------------------------------------------------------------- analysis
patch(ANA, [
	[
		'**except** `local-writer-login.sql`, excluded until a dedicated secret review (CLAIM-152) |',
		'**except** `local-writer-login.sql`, ~~excluded until a dedicated secret review~~ **(Phase 20C: excluded as a standing policy — CLAIM-156)** (CLAIM-152) |'
	],
	[
		'only `local-writer-login.sql` remains untracked and excluded as SECRET_BEARING (GAP-P20-11).',
		'only `local-writer-login.sql` remains untracked and excluded as SECRET_BEARING (GAP-P20-11 — **resolved as policy in Phase 20C**, see 15.5).'
	],
	[
		'untracked in openbeta; GAP-P20-11). The command deployment matrix is Part 8 of `GAMEBRIDGE_DISAMBIGUATION.md`.',
		'untracked in openbeta; GAP-P20-11, resolved as policy in Phase 20C — 15.5). The command deployment matrix is Part 8 of `GAMEBRIDGE_DISAMBIGUATION.md`.'
	]
], [{
	mark: '### 15.5 Phase 20C',
	text: `
### 15.5 Phase 20C closure (2026-09-21)

Documentation and git bookkeeping only. **No production contact, no live test, no SQL executed, no command sent.**

| Item | Recorded value |
|---|---|
| \`main\` | fast-forwarded \`90450060\` → \`75d11eac\` (the full Phase 20B knowledge commit), no merge commit, not pushed |
| \`local-writer-login.sql\` | \`LOCAL_WRITER_LOGIN_POLICY = EXCLUDED_SECRET_BEARING_SOURCE\` (Bryan; CLAIM-156) — never copied into tracked source; GAP-P20-11 = **RESOLVED_AS_POLICY**. No redacted template created (judgement recorded in GAP-P20-11) |
| Optional Agent follow-ups | binary string scan and scheduled-task trigger/action read **deferred** by Bryan (CLAIM-157) — GAP-P20-02 residue **OPEN, NON_BLOCKING**; CLAIM-150 stays UNVERIFIED |
| Reconfirmed, not re-tested | \`CREATE_GAME_ACCOUNT\` DEPLOYED_ACTIVE · \`GRANT_VIP\`, \`SYNC_VIP_TIER\`, \`ANONYMIZE_GAME_ACCOUNT\`, \`PURGE_GAME_ACCOUNT\` IMPLEMENTED_NOT_DEPLOYED · \`CREDIT_GAME_CURRENCY\` DOES_NOT_EXIST · Cloudflare side ACTIVE · VPS side ACTIVE · end to end ACTIVE for \`CREATE_GAME_ACCOUNT\` only (as observed 2026-09-21) |
| Currency delivery (parked, unchanged) | \`BETA_INITIAL_GAME_CURRENCY_DELIVERY = OUT_OF_SCOPE\` · \`PORTAL_WC_TARGET_GAME_CURRENCY = UNRESOLVED\` · \`GAME_CURRENCY_DELIVERY_DIRECTION = OPTION_B\` · \`GAME_CURRENCY_DELIVERY_IMPLEMENTATION_APPROVED = NO\` · \`GAME_CURRENCY_VISIBILITY = UNKNOWN\` |
`
}])

// ---------------------------------------------------------------- disambiguation
patch(DIS, [[
	'`PRESERVATION-MANIFEST.md` on the branch `gamebridge/preserve-command-extension` (CLAIM-152).',
	'`PRESERVATION-MANIFEST.md` on the branch `gamebridge/preserve-command-extension` (CLAIM-152). **(Phase 20C, 2026-09-21)** The exclusion is now a standing policy — `LOCAL_WRITER_LOGIN_POLICY = EXCLUDED_SECRET_BEARING_SOURCE` (CLAIM-156, GAP-P20-11 resolved as policy): the original is never copied into tracked source.'
]])

// ---------------------------------------------------------------- registry and index
patch(REG, [
	[
		/\*\*\d+\*\* \(99 before Phase 18D;.*?\), of which \d+ are canonical facts/s.test(read(REG).t) ? read(REG).t.match(/\*\*\d+\*\* \(99 before Phase 18D;.*?\), of which \d+ are canonical facts/s)[0] : 'ANCHOR-MISSING',
		`**${claimTotal}** (99 before Phase 18D; +CLAIM-100..124 in 18D; +CLAIM-125..138 in Phase 20; +CLAIM-139..148 in Phase 20A; +CLAIM-149..155 in Phase 20B; +CLAIM-156..157 in Phase 20C), of which ${canonicalCount} are canonical facts`
	],
	[
		'`local-writer-login.sql` excluded (SECRET_BEARING); not merged, not deployed |',
		'`local-writer-login.sql` excluded (SECRET_BEARING; standing policy since Phase 20C, CLAIM-156); not merged, not deployed |'
	]
])
patch(IDX, [[
	'`local-writer-login.sql` excluded as SECRET_BEARING); deployment matrix:',
	'`local-writer-login.sql` excluded as SECRET_BEARING — a standing policy, CLAIM-156); deployment matrix:'
]])
