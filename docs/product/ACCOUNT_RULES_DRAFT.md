---
status: DRAFT
category: product/legal-draft
audience: internal (product + legal + privacy + payment provider review)
lastVerified: 2026-08-29
---

# Account Rules / Terms Acceptance — Structured Topic Draft (Part AB)

**THIS IS NOT FINAL LEGAL ADVICE.** Every topic below is a placeholder for content that must go through the review flagged in its `REVIEW` column before it is shown to a real player. Nothing here should be copied into production account-creation UI or a real Terms document as-is.

`REVIEW` values: `LEGAL_REVIEW` (needs a lawyer, likely Brazil-specific consumer/gaming law), `PRIVACY_REVIEW` (LGPD/data-handling), `PAYMENT_PROVIDER_REVIEW` (must match what MercadoPago's terms actually allow/require), `PRODUCT_DECISION` (a business call this doc doesn't make).

| # | Topic | Grounded in | REVIEW |
|---|---|---|---|
| 1 | Open Beta temporary account | `ECONOMY_PRODUCT_DECISIONS.md` — Open Beta section | LEGAL_REVIEW |
| 2 | Beta account/progress deletion | Same — explicitly: do not claim deletion has happened without separate verification | LEGAL_REVIEW, PRODUCT_DECISION (exact deletion mechanics not yet verified) |
| 3 | Same-email Beta reward eligibility | Same — one-time, auditable claim requirement | LEGAL_REVIEW |
| 4 | RMT allowed but player responsibility | Same — RMT section | LEGAL_REVIEW |
| 5 | No server guarantee for external deals | Same — In-Game Trade / Traceability section | LEGAL_REVIEW |
| 6 | Traceable internal transaction investigation | Same — server may investigate operations with reliable internal traces | LEGAL_REVIEW, PRIVACY_REVIEW |
| 7 | Manual trade limitations | Same — Trade Window is not a guaranteed-transaction mechanism | LEGAL_REVIEW |
| 8 | WC transaction fees | Same — WCoin Value section | PRODUCT_DECISION (final copy pending VIP/pricing decisions) |
| 9 | 10% player-to-player WC sink | Same — WC P2P Tax section; real mechanism documented in `docs/product/wc-fee-model/` | LEGAL_REVIEW (consumer-facing fee disclosure requirements) |
| 10 | Direct transfer minimum of 20 WC | Same — Direct WC Transfer Minimum section | none beyond standard copy review |
| 11 | Internal shop purchases may be below 20 WC | Same — Player Shop / Internal Purchases section | none beyond standard copy review |
| 12 | Fraud / chargeback | `payment-and-marketplace-findings.md` — real traceability gaps found this phase | LEGAL_REVIEW, PAYMENT_PROVIDER_REVIEW |
| 13 | Account sanctions for confirmed fraud | Same | LEGAL_REVIEW |
| 14 | Bug exploit rules | Not otherwise decided this phase — no real exploit-specific rule text found in the corpus | LEGAL_REVIEW, PRODUCT_DECISION |
| 15 | Bug reporting | `ECONOMY_PRODUCT_DECISIONS.md` — Bug Hunters Policy section (reward table, first-valid-report rule) | none beyond standard copy review |
| 16 | Prohibited automation/bots | Not confirmed this phase whether an existing policy text exists elsewhere in the project — flagged `NOT_VERIFIED_THIS_PHASE`, do not assume either way | PRODUCT_DECISION |
| 17 | Harassment / abuse / chat conduct | Not otherwise decided this phase | LEGAL_REVIEW, PRODUCT_DECISION |
| 18 | Scams / impersonation | Relates to RMT section (player responsibility for private negotiations) but no dedicated rule text decided | LEGAL_REVIEW |
| 19 | Multi-account rules if any | `ECONOMY_PRODUCT_DECISIONS.md` does not address this — `UNDECIDED`, not previously flagged, adding here as a new gap this phase surfaced | PRODUCT_DECISION |
| 20 | Account sale policy | Same doc — Account / Character Sales section: allowed, but implementation/legal policy not finalized | LEGAL_REVIEW |
| 21 | Character sale policy | Same | LEGAL_REVIEW |
| 22 | Privacy / data processing | General LGPD baseline — not audited this phase | PRIVACY_REVIEW |
| 23 | Logging for security / transaction investigation | Real logging infrastructure confirmed to exist this phase (`AccountSession`, an audit-log model with `ipAddress`/`userAgent`) — disclosure copy should reflect what's actually logged, not more or less | PRIVACY_REVIEW |
| 24 | Account security responsibility | Standard baseline, not decided this phase | LEGAL_REVIEW |
| 25 | Service changes / Beta nature | Ties to Open Beta topics 1–3 | LEGAL_REVIEW |
| 26 | Staff decision / appeal process | Not decided this phase | PRODUCT_DECISION |
| 27 | Age / legal capacity if applicable | Standard baseline, not decided this phase | LEGAL_REVIEW |
| 28 | Payment / refund terms | `RechargeIntentStatus` already models `REFUND_PENDING`/`REFUNDED` in the real schema — copy should reflect the real refund flow, not invent one | LEGAL_REVIEW, PAYMENT_PROVIDER_REVIEW |
| 29 | Cash Shop / virtual currency | `ECONOMY_PRODUCT_DECISIONS.md` — WCoin Value, Cash Shop Philosophy, Lucky Sets sections | LEGAL_REVIEW |
| 30 | Virtual item ownership/license language | Standard baseline (players typically license, not own, virtual items) — not decided this phase | LEGAL_REVIEW |

## Explicitly not decided by this document

Every `PRODUCT_DECISION` and `LEGAL_REVIEW` flag above marks a real gap, not a placeholder formality — none of these 30 topics has real, reviewed copy yet. This table's job is only to make sure nothing is missed when that work happens, and to route each topic to the right reviewer.
