---
status: DECISIONS_RECORDED_2026-08-30
category: vip
audience: internal (product + engineering)
lastVerified: 2026-08-30
---

# VIP Benefit Decisions — Phase 15, itemized per Bryan's 2026-08-30 review

Bryan reviewed [`vip-benefit-matrix.md`](vip-benefit-matrix.md)'s 28 real, differentiated AL0-3 fields and gave four buckets of guidance instead of a blanket ruling. This document applies that guidance to every one of the 28 individually, flags the ones his guidance didn't unambiguously resolve, and records exactly what's now implemented vs. still withheld.

## Portal abstraction boundary (confirmed this round)

Bryan approved AL0=Free / AL1=Bronze / AL2=Silver / AL3=Gold as the **technical** mapping, but explicitly requires the Portal to treat Bronze/Silver/Gold as its own product concepts, with GameServer AL0-3 as an internal implementation detail only — so the Portal is never locked to this specific GameServer's tier mechanism. This is already how the code is shaped: `VipTier` (`BRONZE`/`SILVER`/`GOLD`) is the Portal's own enum, entirely separate from the GameServer's `AccountLevel` field — no code change was needed to satisfy this, it's confirmed as the correct existing boundary, not a new requirement.

## Bucket 1 — APPROVED_NOW (implemented this round, real values allowed)

| # | Benefit | Bryan's category | Status |
|---|---|---|---|
| 12 | Mail Post cooldown reduction | Command cost reduction | `commandCostReductionPercent` field added to `VipBenefitConfig`, real values accepted (0-100, clamped) |
| 14 | Buy-via-mail cooldown reduction | Command cost reduction | Same field |
| 16 | Sell-via-mail cooldown reduction | Command cost reduction | Same field |
| 21 | Warehouse page count | Warehouse/pages | `warehouseBonusPages` field added, real values accepted (0-50, clamped) |

Both new fields are portal-defined abstractions, deliberately **not** a 1:1 copy of the GameServer's raw `CommandWareNumber_AL*`/`CommandPostDelay_AL*` values — the exact conversion (e.g. "how many extra warehouse pages does `warehouseBonusPages=3` actually grant in-game") is a GameBridge Agent implementation detail once that exists, not decided here.

## Bucket 2 — CANDIDATE_PENDING_BALANCE (still clamped to 0, needs your numbers)

| # | Benefit | Bryan's category |
|---|---|---|
| 1 | Experience rate bonus | XP |
| 2 | Master-level experience rate bonus | XP |
| 3 | Item drop rate | General drop |
| 4 | Zen (money) drop rate | General drop |
| 5 | Jewel of Soul success rate | Chaos/jewel/harmony/smelt |
| 6 | Jewel of Life success rate | Chaos/jewel/harmony/smelt |
| 7 | Harmony option success rate | Chaos/jewel/harmony/smelt |
| 8 | Smelt/refinement success rate (tier 1) | Chaos/jewel/harmony/smelt |
| 9 | Smelt/refinement success rate (tier 2) | Chaos/jewel/harmony/smelt |

`xpBonusPercent`/`dropBonusPercent`/`chaosMachineBonusPercent` remain hard-clamped to 0 in `vip.service.ts` (verified by test). No schema change needed until real percentages are approved — the fields already exist from Phase 13.

## Bucket 3 — REJECTED (removed from the commercial matrix entirely)

| # | Benefit | Why |
|---|---|---|
| 10 | PK item-drop-on-death protection | Explicitly rejected — changes PvP economic risk, "Gold não deve comprar imunidade às consequências do PvP" |
| 20 | Class-change command access (AL3-only) | Explicitly rejected — a structural game feature, not a rate bonus; risk of accidentally gatekeeping an important mechanic behind the top VIP tier |

Neither was ever wired into `VipBenefitConfig` as an activatable field (the matrix only ever documented that the GameServer config differentiates them) — nothing to remove in code. This section exists so a future contributor doesn't accidentally propose adding them later without knowing they were already explicitly declined.

## Bucket 4 — NEEDS_CLASSIFICATION (Bryan's four categories didn't unambiguously cover these — flagged, not guessed)

| # | Benefit | Why it doesn't fit cleanly | Recommendation (not a decision) |
|---|---|---|---|
| 11, 13, 15 | Mail/Buy/Sell-via-mail minimum character level (AL0=150 vs AL1-3=10) | Is lowering a level requirement "convenience" (access to a QoL feature sooner) or "exclusive access to progression" (which Bryan rejected)? | Lean convenience — it gates *when* a feature becomes usable, not power itself — but flagged for your explicit call before implementing |
| 17 | PK-status clear cost reduction | Directly changes the cost of clearing PvP-kill status — arguably falls under "any PvP effect," which you rejected broadly | Recommend treating as REJECTED alongside #10, pending your confirmation |
| 18 | `/money` command access (AL3-only) | Unknown exact function from config alone (likely displays currency/Zen total) — low-risk if purely informational | Recommend APPROVED_NOW if confirmed cosmetic/informational; needs in-game confirmation of what it actually does first |
| 19 | `/change` command access (AL3-only) | Unknown exact function from config alone (character slot/appearance change, not class change — different from #20) | Needs in-game confirmation of exact function before any classification |
| 22 | Remote warehouse access (`/openware`, AL3-only) | Related to warehouse (bucket-1-adjacent) but is an access toggle, not extra capacity like #21 | Recommend grouping with warehouse convenience (bucket 1) once confirmed it doesn't also grant a power/security shortcut (e.g. remote access while in a PvP-risk area) |
| 23 | Reset command daily/limit cap (20 vs 50) | Directly affects character power progression speed | Recommend treating as power/progression, likely closer to REJECTED or at minimum CANDIDATE_PENDING_BALANCE alongside XP/drop, not a simple convenience |
| 24 | Reset stat-point award (450 vs 500) | Directly affects character build strength | Same as #23 — power-adjacent, not convenience |
| 25 | Stat "ReAdd" (respec) cost reduction | Cheaper respec doesn't grant new power, but does let a paying player optimize a build faster/more freely than a free player | Recommend APPROVED_NOW under "command cost reduction" if you're comfortable with the optimization-speed argument; otherwise treat as bucket 2 |
| 26 | Offline auto-attack: reset requirement removed at AL2+ | Affects how early a player can start offline-farming — progression-speed-adjacent | Recommend CANDIDATE_PENDING_BALANCE alongside XP/drop, not a simple convenience |
| 27 | Offline auto-attack: activation cost reduction | Could be read as "command cost reduction" (bucket 1) or as pay-to-progress-faster | Flagged; recommend bucket 2 given it gates access to a farming mechanic, not just a fee |
| 28 | Offline auto-attack: max session length increase (4h → 8h → 12h → AL3 unlikely-capped) | More unattended farming time per day is fairly directly progression-speed | Recommend CANDIDATE_PENDING_BALANCE or REJECTED, not convenience — flagged as the single most power-adjacent item in this whole "needs classification" bucket |

**Every field in Bucket 4 stays at its Phase-13-era default (0/disabled/unconfigurable) in code today** — nothing in this bucket was activated by inference. The table above exists so your next pass can go through them individually rather than rediscovering the ambiguity from scratch.

## What changed in code this round

- `apps/api/prisma/schema.prisma` — `VipBenefitConfig` gained `warehouseBonusPages`/`commandCostReductionPercent`.
- `apps/api/src/modules/vip/vip.service.ts` — `upsertBenefitConfig()` now persists real values for those two fields (clamped 0-50 / 0-100) while still hard-clamping `xpBonusPercent`/`dropBonusPercent`/`chaosMachineBonusPercent`/`resetBenefitEnabled` to 0/false.
- Migration `20260830140000_phase15_vip_benefit_fields_and_pricing_seed` — schema change plus the real `VipProductConfig` price-table seed (see below).
- `vip-foundation.e2e-spec.ts` — updated to test the new split (power fields still clamp; the two approved fields are real), 3 new tests, 0 regressions.

## VIP pricing — Bryan's first commercial table, seeded (not activated for sale)

| Tier | 7 days | 15 days | 30 days |
|---|---|---|---|
| Bronze | 6 WC | 11 WC | 20 WC |
| Silver | 9 WC | 17 WC | 30 WC |
| Gold | 12 WC | 23 WC | 40 WC |

(1 WC = R$1,00, per `docs/product/ECONOMY_PRODUCT_DECISIONS.md` — Bryan's R$ figures map 1:1.) All 9 `VipProductConfig` rows now exist in the database with these real prices, seeded via migration so every environment gets the same starting table — **all seeded `enabled: false`**. Every value is admin-editable via the existing `admin/vip/products` endpoint; opening real sales is a separate, explicit action, not implied by this seed.
