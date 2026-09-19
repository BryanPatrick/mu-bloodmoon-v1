#!/usr/bin/env node
// Phase 20A -- idempotent update of docs/knowledge/CURRENCY_TERMINOLOGY.md for the first-hand
// lab evidence (WZ_SetCoin and sibling procedures): the mapping classifications are upgraded
// with visible ~~old~~ -> new corrections, and Bryan's 2026-09-19 decisions are recorded.
import { readFileSync, writeFileSync } from 'node:fs'
const f = 'docs/knowledge/CURRENCY_TERMINOLOGY.md'
let t = readFileSync(f, 'utf8')
const LAB = 'references/game-data/sql-discovery/phase-20a-wz-setcoin-cashshopdata-lab-20260919/'

const reps = [
	[
		'them as different balances. The `Cash ↔ WCoinC` pair is **CONFIRMED**; the\n   other two are **STRONGLY_SUPPORTED** (Part 4 says why the bar differs).',
		'them as different balances. **(Phase 20A)** All three pairs are now **CONFIRMED**: the\n   vendor\'s own stored procedures (read first-hand in the lab restore of the production\n   backup) label the balances "Cash | WCoinC", "Gold | WCoinP", "PcPoints | GoblinPoint" and keep\n   Season 4 variants (`MEMB_INFO.Cash`, `MEMB_INFO.Gold`, `PcPointData.PcPoint`) beside the Season 6/8\n   `CashShopData` columns. ~~The other two are STRONGLY_SUPPORTED.~~'
	],
	[
		'2. **The Portal\'s WC is not mapped to any of them.** No recorded decision',
		'2. **The Portal\'s WC is not mapped to any of them** — reconfirmed by Bryan on 2026-09-19, who also\n   put automatic Portal-WC → game-currency delivery **out of scope for the initial Beta**\n   (`BETA_INITIAL_GAME_CURRENCY_DELIVERY = OUT_OF_SCOPE`; CLAIM-147). No recorded decision'
	],
	[
		'| `WZ_SetCoin` inline comments, quoted in `context/preservation/openbeta-untracked/docs/economy/xshop-commercial-review.md:46-47` | **second-hand**',
		'| **(Phase 20A)** `dbo.WZ_SetCoin` and seven sibling procedures, read **first-hand** from the lab restore of the 2026-07-16 production backup — `' + LAB + 'raw/01…10` (sha256s in that README) | first-hand, read-only catalog reads; authorized by Bryan | **strongest** — several independent procedures; supersedes the row below |\n| ~~`WZ_SetCoin` inline comments, quoted in `context/preservation/openbeta-untracked/docs/economy/xshop-commercial-review.md:46-47`~~ | **second-hand**'
	],
	[
		'| **Gold ↔ WCoinP** | **STRONGLY_SUPPORTED** |',
		'| **Gold ↔ WCoinP** | ~~STRONGLY_SUPPORTED~~ **CONFIRMED (Phase 20A)** — the "Update Gold \\| WCoinP" comment in `WZ_SetCoin`, `WZ_SetExchangeReward`, `WZ_SetKD` and the ranking procedures, and their Season 4 `MEMB_INFO.Gold` variants, are first-hand and independent of the config files (CLAIM-142). Earlier evidence, kept: |'
	],
	[
		'| **PcPoint ↔ GoblinPoint** | **STRONGLY_SUPPORTED** |',
		'| **PcPoint ↔ GoblinPoint** | ~~STRONGLY_SUPPORTED~~ **CONFIRMED (Phase 20A)** — "Update PcPoints \\| GoblinPoint" in `WZ_SetCoin`/`WZ_SetExchangeReward`, and the Season 4 `PcPointData.PcPoint` variant beside the Season 6/8 `CashShopData.GoblinPoint` line (CLAIM-142). Earlier evidence, kept: |'
	],
	[
		'Only **one** first-hand explicit pairing and no per-slot runtime proof. | a second first-hand pairing, or reading the procedure body |',
		'~~Only one first-hand explicit pairing and no per-slot runtime proof.~~ | ~~a second first-hand pairing, or reading the procedure body~~ — **done in Phase 20A** |'
	],
	[
		'but does not by itself prove it. | same |',
		'but does not by itself prove it (the separate log switch is explained: both are Season 4 `PcPointData` legacy names). | ~~same~~ — **done in Phase 20A** |'
	],
	[
		'| SQL `WZ_SetCoin` | positional `@Value1/2/3` | second-hand |',
		'| SQL `WZ_SetCoin` | positional `@Value1/2/3` | **first-hand since Phase 20A** (`raw/01`) |'
	]
]

for (const [from, to] of reps) {
	if (t.includes(to)) continue
	if (!t.includes(from)) throw new Error('anchor not found: ' + from.slice(0, 70))
	t = t.replace(from, () => to)
}

// Append the Phase 20A section once.
const MARK = '## Part 9 — Phase 20A (2026-09-19): what changed'
if (!t.includes(MARK)) {
	t = t.replace(/\s*$/, '\n') + `
${MARK}

| Item | Before | After |
|---|---|---|
| Cash ↔ WCoinC | CONFIRMED | CONFIRMED (now also first-hand in the vendor procedures) |
| Gold ↔ WCoinP | STRONGLY_SUPPORTED | **CONFIRMED** |
| PcPoint ↔ GoblinPoint | STRONGLY_SUPPORTED | **CONFIRMED** |
| Portal WC target game currency | UNRESOLVED | **UNRESOLVED** (Bryan, 2026-09-19: do not silently map to WCoinC) |
| Initial Beta game-currency delivery | not stated | **OUT_OF_SCOPE** (Bryan, 2026-09-19) |
| Blood Coin (\`GOBLIN_POINT\`) | not WC; equality with the engine's GoblinPoint unconfirmed | unchanged |

What the upgrade means and does not mean:

* It settles **vocabulary**: Cash/Gold/PcPoint are the Season 4 names, WCoinC/WCoinP/GoblinPoint the
  Season 6/8 names, of three balances in one order. A document may use either family, never both as if
  they were six currencies.
* It says **nothing** about the Portal. Portal \`WCOIN\` is a separate business abstraction; the
  mapping above gives no automatic equivalence, and the "INFERENCE" in Part 6 is still only an inference.
* The slot-numbering warning in Part 4 stands: the procedures are positional (\`@Value1/2/3\`), while
  other files number the slots 0-based or 1-based.

Evidence: \`${LAB}\` (raw catalog reads, hashes, derived findings); machine layer CLAIM-139..142, CLAIM-147.
`
}
writeFileSync(f, t)
console.log('terminology doc updated')
