---
status: DRAFT
category: product/economy-audit
audience: internal (product + engineering + legal)
lastVerified: 2026-08-29
---

# Account / Character Sale — Risk Notes (Part AC)

Both account sale and character sale are decided as **allowed** (`ECONOMY_PRODUCT_DECISIONS.md`). This document analyzes risk and suggests operational safeguards — it does not decide policy, and does not prohibit sales (per the explicit instruction: risk is not grounds to prohibit here).

## Risk analysis

| Risk | Why it matters here specifically | Suggested safeguard |
|---|---|---|
| Account recovery | If original owner later claims the account was compromised/sold under duress, support has no way to verify a "sale" was genuine — no sale-transfer record exists in the schema today | A formal in-portal transfer flow that both parties confirm, logged with a `correlationId`, would create the audit trail that today doesn't exist for any ad-hoc off-platform sale |
| Email ownership | The Beta-reward-eligibility mechanism (see `beta-account-lifecycle-findings.md`) is keyed to a **normalized email** — if an account is sold, whoever controls that email after the sale controls Beta reward eligibility too. This interacts directly with the account-sale decision and is not otherwise flagged anywhere | Sale flow should explicitly address whether email is transferred, and how that interacts with pending Beta reward claims |
| 2FA | 2FA is confirmed to exist ("real and completo" per prior-phase audit) — a sold account's 2FA must be re-registered to the new owner, or the account becomes unrecoverable by them | Transfer flow should force a 2FA reset step |
| Payment history | `RechargeIntent` records belong to the original `accountId` — a chargeback dispute on a pre-sale purchase would land on an account no longer controlled by the original payer | See chargeback findings in `payment-and-marketplace-findings.md` — this is the same "primary responsibility stays with the payment-originating account" principle, now complicated by the account having changed hands |
| Chargeback responsibility | Same as above — if the buyer of a sold account later disputes a charge the *previous* owner made, support needs to know a sale happened at all, which nothing currently records | Formal transfer flow (see above) is the only way to make this traceable |
| Beta reward linkage | Directly ties to the email-ownership risk above | Same safeguard |
| Identity/reputation transfer | No player-reputation system was found this phase beyond what's proposed in `ECONOMY_PRODUCT_DECISIONS.md`'s Player Reputation section (itself undecided in detail) | N/A until that system exists |
| Fraud | An unverified, off-platform account sale is functionally indistinguishable from account takeover from support's point of view | Same formal transfer flow closes this gap by making legitimate sales look different from takeovers |
| Support burden | Every risk above currently routes to manual investigation with no supporting record | A formal transfer flow is the single safeguard that addresses nearly every row above at once |

## Recommendation (marked as a recommendation, not a decision)

The single highest-leverage safeguard is the same across almost every row: **a formal, in-portal account/character transfer flow** that both parties confirm, that resets 2FA, and that creates an auditable record connecting old owner → new owner → timestamp. Without it, every risk above is unmitigated by default, since account/character sale today would happen entirely off-platform with nothing in the real schema to record it.

This recommendation is not a decision — building this flow is real engineering work outside this phase's `NO PRODUCTION WRITE` scope, and its priority relative to other Open Beta work is a product call.
