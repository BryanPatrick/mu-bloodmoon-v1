---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-17
---

# Business rules — CONFIRMED / PROPOSED / UNKNOWN

This pack does not invent business rules. Phase 12 independently checked
the cited ADRs and corrected the stale Phase 9 statements below. An
archived, uncommitted ADR is evidence of a decision, not by itself a
promotion of the preserved file to canonical documentation on `main`.

| Rule | Status | Source |
|---|---|---|
| WCoin/BRL peg is 1:1, integer pricing for WC recharge | CONFIRMED from preserved ADR-0008/0020, read in Phase 11 and rechecked Phase 12; bonus is a separate additive field, while Asaas MVP refuses bonus | [`ADR_INDEX.md`](ADR_INDEX.md); preserved ADR-0008/0020; `payments/asaas-sandbox-phase5-codex` |
| Direct WC transfer minimum = 20 WC | CONFIRMED from preserved ADR-0011/0022; the latter records local implementation | [`ADR_INDEX.md`](ADR_INDEX.md); preserved ADR-0011/0022 |
| ~~Reset cap = 20, all VIP tiers, no exception~~ | **INCORRECT / SUPERSEDED.** ADR-0029 reopens the cap: no approved target value. Observed effective values remain `{AL0:20, AL1:20, AL2:20, AL3:50}`; this is not a policy ruling. | [`docs/decisions/0029-progression-reset-policy-current-ruling.md`](../docs/decisions/0029-progression-reset-policy-current-ruling.md), Decision 2 |
| RMT / account-sale policy | Preserved ADR-0016 says player-to-player RMT is allowed without Blood Moon intermediation; account sale is an allowed direction but its safeguards are not designed. This is verified historical decision evidence, not a claim that the archived file is integrated on `main`. | [`ADR_INDEX.md`](ADR_INDEX.md); preserved ADR-0016 |
| Migration immutability once applied anywhere real | CONFIRMED, read in full this session | `docs/decisions/0030-migration-casing-static-audit.md`, `AGENTS.md` invariant 24 |
| Marketplace purchases + `TRANSFER_RESTRICTION` interaction | Per `docs/README.md`'s narrative (ADR-0022 correction) — not independently confirmed | UNKNOWN on this branch |
| Knowledge Hub: a policy-required review/approval cannot be bypassed by never requesting it | CONFIRMED, this project (Hub Phase 6) | `D:\MU\hub\src\services\policyService.ts`, `D:\MU\hub\docs\policies\orchestration-risk-policy.md` |
| Knowledge Hub: `ORCHESTRATION_ENABLED=false` fails writes before auth even runs | CONFIRMED, this project (Hub Phase 7) | `D:\MU\hub\src\index.ts` |
| Commercial VIP tiers are Free/Silver/Gold; Bronze is commercially disabled (technical Bronze enum/schema not removed) | CONFIRMED — a current, dated business decision, not found in any older repository source (real ADR-0010 still describes Bronze as an active tier; that ADR predates this decision and is not edited) | [`DECISIONS.md`](DECISIONS.md) `DEC-VIP-001`, dated 2026-09-17 |
| Asaas is the current primary payment-provider direction; Mercado Pago is dormant, not deleted, not permanently ruled out | CONFIRMED — a current, dated product-direction decision | [`DECISIONS.md`](DECISIONS.md) `DEC-PAYMENTS-001`, dated 2026-09-17 |
| Blood Coin is the public/player-facing name for the technical `GOBLIN_POINT` currency; the enum/code identifier is unchanged | CONFIRMED — real, current, in production code on `main`, not just a decision record. The technical identifier `GOBLIN_POINT` is used unchanged throughout `apps/api` (currency enum, commerce pricing, marketplace, guilds) and `apps/web` (composables, marketplace UI, account panel); the player-facing UI/label layer renders "Blood Coin" (e.g. `slot-registry.ts`'s own `store.currencyIcon` description: "Icone de cada moeda da loja (WCoin/Blood Coin/Hunt Point)"). The rename itself was a real, dated product decision (`main` commit `9a18c53d`, "fix: complete the Goblin Point -> Blood Coin public rename") | `apps/api/src/modules/launcher-studio/slot-registry.ts:309`; `git grep -n "GOBLIN_POINT"` across `apps/api`/`apps/web`; commits `2811522d`/`9a18c53d` on `main` |

## Phase 12 provenance correction

~~ADRs 0008, 0016, 0020 and 0022 were not independently read and their
rules remain only proposed by narrative.~~ Phase 11 preserved and read
all four in full; Phase 12 spot-checked them again. Their source files
remain untracked on `main`, so file integration and current product
readiness still require separate review. Do not confuse that integration
gap with an absence of source evidence.
