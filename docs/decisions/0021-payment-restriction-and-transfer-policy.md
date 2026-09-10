---
status: ACTIVE — implemented and tested locally, not deployed
category: decisions
audience: internal (engineering + product)
lastVerified: 2026-08-31
confidence: CONFIRMED (real code, 44 new/extended tests passing across 6 new suites, see Related Systems)
---

> **STATUS/FRESHNESS UPDATE ONLY (2026-09-09, Recovery Batch 4)**: the
> "not deployed" status above and below is now stale for the
> Direct-WC-Transfer/restriction-enforcement portion of this ADR. Phase
> AC closed 2026-09-07 with `PHASE_AC_PRODUCTION = PASS`, and its own
> closure record explicitly covers Direct Transfer
> (`DIRECT_TRANSFER_PRODUCTION_QA = NOT_RUN_BY_DESIGN` /
> `DIRECT_TRANSFER_E2E = PASS` -- a real live transfer was deliberately
> not performed in production just to re-cover ground the existing
> 57/57 e2e suite already proves, per explicit instruction; this does
> not mean the feature is undeployed, only that it wasn't re-exercised
> live). This note corrects only the deployment-status metadata -- the
> decision itself, and everything else in this document, is unchanged.

# ADR-0021: Payment/transfer/account restriction enforcement, direct WC transfer, VIP purchase UX (Phase Q)

**DATE**: 2026-08-31 (Phase Q)
**STATUS**: ACTIVE, implemented and tested locally against a real database; nothing deployed to production

## CONTEXT

Phase Q closes Phase P's biggest disclosed gaps, following Bryan's own
explicit, authoritative decisions: WCOIN integer-BRL pricing is final
(ADR-0020), a real player VIP purchase page is a genuine product feature
to build now, and `TRANSFER_RESTRICTION`/`ACCOUNT_RESTRICTION` — real,
valid `PaymentRiskAction` enum values since Phase P but never enforced —
must become real, reversible, auditable enforcement.

## DECISION 1 — centralized restriction enforcement, three distinct types

`PaymentRiskService` (extended, not duplicated) now exposes three
`assertNoActive*()` methods sharing one private query helper
(`hasActiveAction`), matching Part 6's own "do not duplicate overlapping
checks chaotically, create a centralized policy/enforcement service"
instruction:

| Restriction | Blocks | Never blocks |
|---|---|---|
| `PAYMENT_RESTRICTION` | New recharge checkout | Receiving credit, refunds |
| `TRANSFER_RESTRICTION` | New direct P2P WC transfer (sending) | Receiving a transfer, refunds |
| `ACCOUNT_RESTRICTION` | Recharge checkout, store purchase, VIP purchase, direct WC transfer (broader commercial hold) | Login, game access, receiving credit, admin-initiated refund |

Every restriction is reversible (a `PaymentRiskCaseAction.liftedAt`
timestamp), auditable (who applied/lifted it, when, why, linked case —
already the shape Phase P's `PaymentRiskCaseAction` model provided), and
permission-gated (`admin.risk.manage`). None fires automatically from a
signal alone — a human always applies the action.

Player-facing messages are exactly Bryan's own wording, never exposing
risk scores, evidence, or other players' identities:
- Payment: "Novas compras estao temporariamente indisponiveis para esta conta."
- Transfer: "Transferencias de WC estao temporariamente indisponiveis para esta conta."
- Account: "Algumas operacoes da conta estao temporariamente restritas. Entre em contato com o suporte."

**Proven, not just designed**: a real test
(`RESTRICTED_ADMIN_REFUND`, `payment-risk.e2e-spec.ts`) shows an
`ACCOUNT_RESTRICTION` on a player never blocks a SUPER_ADMIN's own
`refundRecharge()`/reconciliation actions — the fraud hold applies only
to actions the restricted account itself initiates, never to admin
recovery on their behalf (Part 13's "do not create a deadlock" rule).
Another (`RESTRICTED_ACCOUNT_STILL_RECEIVES_SYSTEM_CREDIT`) proves a
restricted account still receives a legitimate `credit()` normally.

## DECISION 2 — direct player-to-player WC transfer (new feature)

A real search this phase confirmed **no direct P2P WC transfer feature
existed anywhere** in this codebase before now — `PLAYER_DIRECT_TRANSFER`
was a real `WalletTransactionType` enum value with zero real call
sites, and ADR-0011 was explicitly `DECIDED_BUT_NOT_IMPLEMENTED`. Built
this phase (`WalletTransferService`/`WalletTransferController`, its own
module to avoid a circular dependency — `WalletModule` is a dependency
of `CommerceModule`, so it cannot import `CommerceModule` back for
`PaymentRiskService`; `WalletTransferModule` sits above both instead)
specifically because `TRANSFER_RESTRICTION` had nothing real to enforce
against otherwise.

The 20 WC minimum is the number ADR-0011 already recorded (from a real
test comment, not invented fresh this phase) — used as-is, with its
provisional status preserved (OQ-002 stays open; Bryan should still
reconfirm this specific number). WCOIN only, taxed via the existing
`settleTaxedCredit()` (the same mechanism marketplace settlement already
uses for the one other real P2P-adjacent movement in this codebase),
counterpartyAccountId populated so `traceChargebackDispersal()`
continues to work correctly against transfers, not just market sales.

## DECISION 3 — WC-transfer antifraud signals, wired against real data

`IMMEDIATE_WCOIN_TRANSFER`/`NEAR_FULL_BALANCE_TRANSFER`/
`MANY_RECIPIENTS_AFTER_PURCHASE`/`REPEATED_RECIPIENT_NETWORK` — the four
signal types defined but unwired since Phase P — now fire from
`WalletTransferService.evaluateTransferRiskSignals()`, using real ledger
queries (most recent `WC_PURCHASE_CREDIT`, balance-before-transfer,
distinct-recipient/distinct-sender counts within a window), never a
guess at fund provenance. Every signal's evidence is concrete and
inspectable (ledger entry ids, timestamps, percentages, counts) — no
opaque score, per this project's standing antifraud principle.

**`PAYMENT_ACCOUNT_MISMATCH` remains deliberately unsupported** (Part
8): Mercado Pago's real Orders API response never returns a payer
identifier on GET/webhook (only sent in the CREATE request, never echoed
back) — there is no reliable field to compare, and this codebase does
not use fragile proxies. See OQ-023.

## DECISION 4 — Market Question: a recommendation, not a silent decision

Per Part 4's own "do not silently decide when policy is ambiguous"
instruction: whether `TRANSFER_RESTRICTION` should also cover
Marketplace WC activity is **not implemented this phase**. Technical
recommendation recorded (OQ-024): block the SELL/settlement side
(`settleTaxedCredit()` via `marketplace.service.ts`, a real vector for
dispersing suspect WC into a fresh account) but not the BUY side
(spending already-held WC on an item is not further dispersal). Direct
P2P transfer enforcement (Decision 2 above) is real and shipped; Market
enforcement awaits Bryan's confirmation.

## DECISION 5 — player VIP purchase page, built against the REAL existing flow

`apps/web/pages/painel/vip.vue` (new) + `useVipApi.ts` (new) + two new
backend endpoints (`GET vip/benefits`, `GET account/vip/history`).
**Important divergence from Part 3's own described checkout flow,
disclosed rather than silently reconciled**: Part 3 describes "select ->
authoritative server price -> payment intent -> Mercado Pago checkout ->
payment confirmation -> GameBridge delivery -> reconciliation." The REAL
existing VIP purchase mechanism (`vip.service.ts#purchase`, audited
before touching anything, per this project's standing rule) is
materially different and was NOT changed to match Part 3's assumed
flow: VIP is bought by spending an EXISTING WC balance, synchronously,
in one atomic transaction (debit + entitlement update + `VipGrant` +
`GameBridgeJob` enqueue) — there is no separate Mercado Pago checkout
step for a VIP purchase itself (real money only enters the system once,
at the earlier WC recharge). Building a new direct-Mercado-Pago-for-VIP
flow would have duplicated and diverged from the payment domain model
Phase O's own audit established (`docs/payments/payment-domain-model.md`'s
"why three pipelines, not one"). The player-facing page is built against
the real, tested, existing flow — server-side price authority is still
real (the backend always re-reads the current, enabled
`VipProductConfig` row; the client never sends a price).

**Benefits shown**: only the two real, approved fields
(`warehouseBonusPages`/`commandCostReductionPercent`, per
`docs/vip/vip-benefit-decisions.md`) — `listPublicBenefits()` never
includes xp/drop/chaosMachine/reset at all, not even as a disabled
placeholder, so the page can never tease an unapproved benefit.

**Existing-VIP behavior**: the current extend-in-place mechanism
(days always stack additively regardless of tier change direction; the
entitlement's `tier` overwrites to whatever the latest purchase was, no
proration, no "can't downgrade" rule) is surfaced as-is — it is already
real, tested behavior (`VIP_ACTIVE_EXTENSION_SAFE`,
`vip-foundation.e2e-spec.ts`), satisfying Part 3's own "basic same-tier
duration purchase may proceed only if existing service behavior is
already clearly defined/tested" clause. Per that same Part's "do not
invent" instruction, no NEW upgrade/downgrade/proration UX concept was
built on top of it — the code's own comment already says this was never
a confirmed upstream product decision. See OQ-025.

**VIP price table**: Bryan's approved prices (Bronze 6/11/20, Silver
9/17/30, Gold 12/23/40) were checked against the real seed
(`20260830140000_phase15_vip_benefit_fields_and_pricing_seed`) before
building anything — they already match exactly. No data migration was
needed.

## DECISION 6 — RechargePackage admin UI

New "Pacotes" tab in `financeiro.vue` (a lightweight inline create/edit
form, mirroring `StoreAdminManager.vue`'s categories-tab pattern rather
than its heavier products-tab modal, matching the field count). Shows
the exact live WCOIN UX Bryan specified (Preco/WC base/Bonus/Total
entregue), computed client-side as UX guidance only — the server (Part
1's `assertWcoinPackageInvariant`, unchanged, already correct) remains
the sole authority, and its real rejection message is surfaced verbatim
in the UI on failure, never swallowed.

**Two real, pre-existing bugs found and fixed while building this UI**:
(1) `RechargePack` (the frontend type) never carried an `active` field
at all, and (2) `rechargePackagePayload()` hardcoded `active: true`
unconditionally on every update — meaning an admin could never actually
deactivate a recharge package through this client even after this
phase's own UI added an "Ativo" checkbox, until fixed.

## ALTERNATIVES CONSIDERED

- **Folding `WalletTransferService` into `WalletModule`**: rejected —
  `WalletModule` is a dependency of `CommerceModule` (via
  `WalletLedgerService`), so importing `CommerceModule` back for
  `PaymentRiskService` would create a real circular dependency. A
  dedicated `WalletTransferModule` sitting above both was the clean
  alternative.
- **Building a new, separate VIP-via-Mercado-Pago checkout flow to match
  Part 3's literal description**: rejected — see Decision 5. Would have
  duplicated the existing, correct, three-pipeline payment domain model
  for no real benefit, and risked a real architectural regression to
  save UI-copy alignment with an instruction that predates the audit.
- **Silently deciding the Market Question**: rejected per Part 4's own
  explicit instruction — recorded as OQ-024 instead.
- **Inventing a new direct-transfer minimum instead of reusing ADR-0011's
  20 WC**: rejected — using an already-recorded, real number (even if
  provisional) is different from inventing one from nothing.

## CONSEQUENCES

- All three restriction types are real, enforced, reversible, auditable,
  and permission-gated — never automatic from a signal alone.
- Direct P2P WC transfer exists as a real, tested feature for the first
  time, closing a gap that predates this session.
- All four previously-unwired WC-transfer antifraud signals are real.
- Players can now actually buy VIP through the Portal UI, see their real
  approved benefits, and see VIP in their unified order history.
- Admins can now actually manage WCOIN recharge packages through a UI
  instead of the API alone, with the 1:1 rule made visible, not just
  enforced silently.
- Real, disclosed gaps remain: the Market Question (OQ-024), the direct-
  transfer minimum's provisional status (OQ-002), PAYMENT_ACCOUNT_MISMATCH
  (OQ-023), VIP tier-change policy (OQ-025), Mercado Pago sandbox
  validation for the two Phase P adapters (OQ-019/OQ-021, unchanged),
  and production `RechargePackage` read access (OQ-018, unchanged).

## RELATED SYSTEMS

`apps/api/src/modules/commerce/payment-risk.service.ts`
(`assertNoActiveTransferRestriction`, `assertNoActiveAccountRestriction`,
`getActiveRestrictions`), `apps/api/src/modules/wallet-transfer/*` (new
module), `apps/api/src/modules/vip/vip.service.ts`
(`listPublicBenefits`, `listMyVipHistory`, restriction check in
`purchase()`), `apps/api/src/modules/vip/vip.controller.ts`,
`apps/api/src/modules/commerce/commerce.service.ts` (restriction checks
in `createRechargeCheckout`/`createPurchaseIntent`),
`apps/web/pages/painel/vip.vue`, `apps/web/composables/useVipApi.ts`,
`apps/web/pages/painel/admin/financeiro.vue` (Pacotes tab),
`apps/web/pages/painel/compras.vue` (VIP history merge),
`apps/web/composables/useCommerceApi.ts` (RechargePack `active` fix),
`apps/api/test/wallet-transfer.e2e-spec.ts`,
`apps/api/test/payment-gm-rbac.e2e-spec.ts`,
`apps/api/test/payment-idor.e2e-spec.ts`,
`apps/api/test/vip-player-history.e2e-spec.ts`,
`docs/decisions/0011-direct-wcoin-transfer-minimum.md`,
`docs/decisions/0018-payment-architecture-phase-o.md`,
`docs/decisions/0019-payment-operational-closure-phase-p.md`,
`docs/decisions/0020-wcoin-integer-brl-policy-final.md`.
