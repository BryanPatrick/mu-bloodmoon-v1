---
status: METHODOLOGY_DECIDED — ITEM-LEVEL REVIEW STILL PENDING
category: decisions
audience: internal (engineering + product)
lastVerified: 2026-08-31
---

# ADR-0013: X-Shop review methodology — a decided process, with every item still UNREVIEWED

**DATE**: 2026-08-31 (backfilled — process defined in `docs/economy/xshop-full-inventory.md`/`xshop-batch-review-groups.md`, Phase 13)
**STATUS**: The *methodology* is decided; the actual item-by-item KEEP/REMOVE decision is **not yet made** — this ADR documents a process, not a finished policy

## CONTEXT

The X-Shop is a GameServer-side custom shop catalog (168 items,
`C:\MuServer\Data\Custom\CustomXShop.txt`) that — unlike the CashShop
(ADR-0012) — is a real, all-max-power catalog: every item is `+13` with
all 6 excellent options. This is a stark contrast to the CashShop's
cosmetics-only stance and needed a real review process before any future
decision about whether/how to expose it through the Portal.

## DECISION

**The review methodology, not a finished ruling.** All 168 X-Shop items
were classified with risk tags (`RECOMMEND_REVIEW_UNCLASSIFIED`,
`RECOMMEND_REMOVE_OR_GATE_ENDGAME_FULL_EXCELLENT`, etc.) and grouped into
4 batches for a human (Bryan) review pass
(`docs/economy/xshop-batch-review-groups.md`). The classification
document is explicit about its own limits:

> "`KEEP?` starts `UNREVIEWED` on every row per instruction — this
> document does not decide removals, it prepares the evidence for Bryan
> to decide against." (`xshop-full-inventory.md:10`)
>
> "This document deliberately stops at classification, not a
> KEEP/REMOVE decision. The next step is a Bryan review pass filling in
> `KEEP?` per row." (`xshop-full-inventory.md:248-250`)

There is currently **zero application-layer (Portal/`apps/api`/`apps/web`)
X-Shop code** — the catalog lives entirely in the GameServer file. Any
future app-level exposure of X-Shop items "must independently re-run the
same KEEP/REMOVE_FROM_PREMIUM_SHOP classification... before displaying
anything" (`docs/product/phase13/XSHOP_IMPLEMENTATION_NOTE.md:24`).

**Do not conflate this with the Portal's own, unrelated store workflow**
(`docs/store.md:28-37`'s DRAFT → IN_REVIEW → approval → publish flow) —
that governs the Portal's own official product catalog, a separate
system from the GameServer-side X-Shop entirely.

## WHY

A 168-item, all-max-power catalog cannot be responsibly exposed to
players without a real review — the classification-first, decide-later
approach lets the actual power/balance risk of each item be assessed
systematically (by risk tag) before any human has to make 168 individual
judgment calls from scratch, while explicitly not pre-deciding the
outcome on Bryan's behalf.

## ALTERNATIVES CONSIDERED

- **Expose the full X-Shop catalog as-is**: rejected — directly conflicts
  with ADR-0012's CashShop-established stance against pay-to-win
  exposure; a 168-item all-`+13`-all-excellent catalog is the single
  clearest violation imaginable of that same principle if surfaced
  unreviewed.
- **Let the classification document itself decide KEEP/REMOVE**:
  explicitly rejected by its own author — the document's job is to
  prepare evidence, not substitute for Bryan's judgment call.

## CONSEQUENCES

- **No X-Shop item may be exposed through the Portal until the
  KEEP/REMOVE review is actually completed** — this is a hard blocker
  for any future X-Shop-related feature work, not a suggestion.
- The 4-batch review itself is a real, trackable open task — see
  `docs/open-questions.md` for its tracked status.
- If/when the review completes, this ADR should be updated (not
  replaced) to record the actual outcome, keeping the methodology
  section intact as historical record of how the decision was reached.

## PHASE N CONFIRMATION (2026-08-31) — still genuinely pending; scoped against the Payment phase explicitly

Re-confirmed, not re-resolved: **status remains
`PRODUCT_CATALOG_REVIEW_PENDING`.** 168 items, the review inventory
exists, Bryan has not approved final KEEP/REMOVE decisions for any of
them. Nothing above changes.

**What this does NOT block**: building the Payment architecture
(Order/Payment/Delivery). **What this DOES block**: publishing an
unreviewed X-Shop catalog, selling those 168 items automatically, or
using the existing X-Shop as the Payment system's commercial source of
truth. The Payment architecture must remain **product-agnostic** — see
`docs/payments/payment-readiness-contract.md`. `Order`/`Payment`/
`Delivery` should be built to support whatever products get formally
approved (VIP tiers today; X-Shop items only after this review
completes), never hard-coded to assume the legacy X-Shop catalog is
"the" product list.

## RELATED SYSTEMS

`docs/economy/xshop-full-inventory.md`,
`docs/economy/xshop-batch-review-groups.md`,
`docs/product/phase13/XSHOP_IMPLEMENTATION_NOTE.md`, ADR-0012,
`docs/open-questions.md`, `docs/payments/payment-readiness-contract.md`.
