---
status: ACTIVE — implemented and tested locally, not deployed
category: decisions
audience: internal (engineering)
lastVerified: 2026-08-31
confidence: CONFIRMED (real code, 130+ real tests passing across 8 new/extended suites, see Related Systems)
---

> **STATUS/FRESHNESS UPDATE ONLY (2026-09-09, Recovery Batch 4)**: the
> "not deployed" status above and below is now stale. Phase AC closed
> 2026-09-07 with `PHASE_AC_PRODUCTION = PASS` -- the Payment Risk/
> Chargeback work this ADR documents (`phase_p_payment_risk_and_
> chargeback_case` migration + the antifraud/chargeback code) is
> `DEPLOYED_CONFIRMED`, with RISK_ADMIN_QA and CHARGEBACK_ADMIN_QA both
> tested live as Super Admin post-deploy. This note corrects only the
> deployment-status metadata -- the decision itself, and everything
> else in this document, is unchanged and still the historical record
> of what Phase P actually decided and built.

# ADR-0019: Payment operational closure — Phase P (antifraud, chargeback case model, real refund/reconciliation adapters, UI, manuals)

**DATE**: 2026-08-31 (Phase P)
**STATUS**: ACTIVE, implemented and tested locally against a real database; nothing deployed to production

## CONTEXT

Phase O (ADR-0018) closed four real payment gaps but left several parts
of its own 27-part instruction disclosed as `NOT_DONE`/`PARTIAL`:
antifraud foundation, most admin/player payment UI, real Mercado Pago
refund API integration, provider-polling reconciliation, and — flagged
explicitly at the start of this phase as a documentation-discipline
correction — the four operational manuals were never updated for Phase
O's own changes, even though this project's own permanent rule
(`AGENTS.md`/`CLAUDE.md`) requires that. Phase P closes these.

## PHASE O COMPLETION CORRECTION

See `docs/decisions/0018-payment-architecture-phase-o.md`'s own
"PHASE O COMPLETION CORRECTION" section for the full previous-statement
→ discrepancy → corrected-interpretation record. Summary:
`PHASE_O_IMPLEMENTATION = PASS` stands; `PHASE_O_DOCUMENTATION_COMPLETENESS`
is retroactively marked `PARTIAL` (manuals were never updated), now
closed by this phase.

## DECISION 1 — antifraud foundation: explicit signals, never a score

`PaymentRiskSignal`/`PaymentRiskCase`/`PaymentRiskCaseAction`
(`apps/api/src/modules/commerce/payment-risk.service.ts`). Every signal
carries a human-readable `reason` and structured `evidence` — there is no
opaque score anywhere in this design, per the phase's own explicit
instruction. Six of eleven `PaymentRiskSignalType` values are wired to
real detectors this phase (new-account-high-value purchase, multiple
failed payments, repeated chargeback, rapid purchase sequence, delivery
anomaly via the reconciliation service, provider review state); the
remaining five (WC-transfer-pattern signals, payment-account-mismatch)
are real, valid enum members with no detector call site yet — kept in
the enum rather than omitted so a future phase extends additively.
Signals from the same account aggregate into a `PaymentRiskCase`
automatically; the case's `highestSeverity` tracks the worst signal seen.

**The only real enforcement**: `PAYMENT_RESTRICTION`, applied by a human
reviewer to a case, blocks new recharge checkout for that account
(`CommerceService.createRechargeCheckout` calls
`assertNoActivePaymentRestriction` before any provider call).
`TRANSFER_RESTRICTION`/`ACCOUNT_RESTRICTION` are recorded as real,
auditable decisions but have no enforcement point yet — no P2P-transfer
or account-wide block hook exists to wire them into safely within this
phase's scope. A signal firing never applies a restriction by itself.

## DECISION 2 — a formal ChargebackCase model

Replaces the informal `RechargeIntentStatus.MANUAL_REVIEW` +
`failureReason` prefixed `"charged_back:"` convention (the trigger
itself is unchanged — still `mercadopago.status-map.ts`'s real mapping)
with `ChargebackCase` (`apps/api/src/modules/commerce/chargeback-case.service.ts`):
provider, external order id, original amount credited, the account's
live balance *at case-open time* (a real fact, explicitly NOT presented
as "how much of this specific credit remains" — WC is fungible once
merged into a balance, and this design does not pretend to FIFO-trace
individual coins), a frozen snapshot of `traceChargebackDispersal()`'s
output, provider reason, status, review notes, resolution.

**A real bug found and fixed by this same work, not by a later test**:
`rechargeTransitions`'s state machine (`commerce.service.ts`) never
allowed `PAID → MANUAL_REVIEW` — meaning the ONE realistic chargeback
scenario (Mercado Pago reports `charged_back` on an order well after the
original approval already moved the recharge to `PAID`) would have
thrown `"Transicao invalida: PAID -> MANUAL_REVIEW"` for every real
chargeback, silently preventing `ChargebackCaseService` from ever
running. Caught while writing this phase's own tests (`CHARGEBACK_CASE_OPENED`
failed with a 400 before the fix), fixed by adding `MANUAL_REVIEW` to
`PAID`'s allowed transitions — deliberately without adding a clawback to
that branch, so WC stays exactly where it is while a human reviews the
case (an explicit later `REFUNDED` transition already claws back
correctly, with its existing `REFUND_PENDING` fallback).

**Responsibility rule** (reaffirming ADR-0016 Decision 2): primary
responsibility is always the purchase originator. A dedicated test
(`CHARGEBACK_RESPONSIBILITY`) proves a downstream transfer recipient is
traceable in the dispersal snapshot but never automatically restricted,
signaled, or cased.

## DECISION 3 — real Mercado Pago refund adapter (SANDBOX_VALIDATION_REQUIRED)

`MercadoPagoProvider.refundOrder()` was a permanent `Promise<never>`
stub before this phase. Implemented for real against Mercado Pago's
documented Checkout API Orders refund contract (`POST
/v1/orders/{id}/refund`, `X-Idempotency-Key` required, body
`{transactions: [{id, amount?}]}` where `id` is the payment transaction
id) — confirmed by fetching Mercado Pago's own live developer reference
during this phase (not guessed), with a full contract test suite against
a mocked `fetch` (`apps/api/test/mercadopago-refund-adapter.e2e-spec.ts`,
4/4). **Never verified against a real sandbox call** — no credentials
were available (see OQ-020, unchanged).

Deliberately **not** wired into `CommerceService.refundRecharge()`'s
existing (local-only) path. Reachable only via the new, separately
permissioned `attemptProviderRefund()`, gated by both
`admin.recharge.provider-refund` and a new environment flag
(`MERCADO_PAGO_REFUND_ENABLED`, default off) — so a real, unverified
financial call can never fire just because `REAL_MONEY_PAYMENTS_ENABLED`
is on in some environment. This directly implements Part 11's "hard
distinction between LOCAL_FINANCIAL_STATE_REVERSAL and
PROVIDER_REFUND_CONFIRMED" requirement — the admin UI never labels an
estorno as Mercado-Pago-confirmed unless the provider's own response
says so.

## DECISION 4 — provider-polling reconciliation (SANDBOX_VALIDATION_REQUIRED)

ADR-0018 explicitly deferred this ("a scheduled job making real outbound
provider calls... is a materially riskier capability than this phase
could safely build and verify without live sandbox credentials"). Built
this phase as `PaymentReconciliationService.pollProviderForStuckPayments()`
— a second, independently-gated mechanism (own env flag
`MERCADO_PAGO_PROVIDER_POLL_ENABLED`, own MySQL named lock
`bloodmoon:payment-provider-poll`, own interval), rate-limited (never
re-polls a record touched in the last 5 minutes; capped batch size,
default 20), reusing the exact same idempotent reconciliation code path
(`reconcileWithProvider` → `transitionRechargeStatus`) a real webhook or
manual resync already goes through — a third `actor.source` value,
`'system-poll'`, keeps its audit trail distinguishable. Fully tested via
a mocked provider (`apps/api/test/payment-provider-poll.e2e-spec.ts`,
4/4: disabled-by-default, rate-limiting, real reconciliation, batch cap)
— **never run against a real Mercado Pago endpoint**. Stays off by
default in every real environment.

## DECISION 5 — WCOIN recharge package 1:1 peg guard

`assertWcoinPackageInvariant()` (`commerce.service.ts`) rejects, at the
admin CRUD layer, any WCOIN `RechargePackage` whose granted amount
doesn't exactly equal the 1:1 conversion of its price, and rejects any
non-integer BRL price for a WCOIN package outright (never silently
rounds). This is a defensive, reversible technical default (Option A of
three alternatives — see OQ-022), not a final product decision on
whether fractional WCOIN pricing may ever be allowed; chosen because a
validation can be loosened later, while a silently-accepted mismatch,
once sold to real players, cannot be undone. Directly prevents the
specific real conflict Phase N found and fixed (R$19,90 selling 500 WC)
from ever being reintroduced through the admin UI. Tested:
`apps/api/test/recharge-package-admin-guard.e2e-spec.ts`, 5/5.

## DECISION 6 — admin and player payment UI

`financeiro.vue` gained three new tabs (Reconciliação, Risco,
Chargebacks) alongside the existing Filas — reusing the page's existing
patterns (permission-gated sections, `window.prompt` for reasons,
inline status badges) rather than introducing a new component system.
The player-facing order-history page (`painel/compras.vue`, previously
2 lines, purchases-only, no delivery status) was rebuilt into "Meus
Pedidos": unified purchase + recharge history, delivery status per
purchase, and the critical "payment confirmed, don't pay again" notice
whenever a purchase's payment is confirmed but its delivery isn't
`COMPLETED`/`REFUNDED` yet. Wallet balance (`AuthUser.currencies`,
already carried in the session since login but never displayed to the
player anywhere — confirmed by a real search) is now shown on both
`painel/conta.vue` and the new Meus Pedidos page.

**A real, pre-existing gap found and fixed while building this UI**: the
frontend's `purchaseStatusFromApi`/`purchaseStatusToApi` maps
(`useCommerceApi.ts`) only ever covered 3 of the 10 real
`PurchaseIntentStatus` enum values (`PREPARED`/`COMPLETED`/`CANCELLED`)
— `PAID`/`DELIVERING`/`MANUAL_REVIEW`/`REFUND_PENDING`/`REFUNDED`/`FAILED`
silently mapped to `undefined` in every purchase list, including the
existing admin `financeiro.vue`. Completed the map (all 10 values, new
PT-BR labels: Aguardando pagamento/Paga/Entregando/Em análise/Estorno em
andamento/Estornada/Falhou) as part of this same work.

**Real, disclosed gap NOT closed this phase**: no player-facing VIP
purchase page exists anywhere in this codebase (confirmed by a real
search of every `painel/*.vue` page) — VIP purchase today only has a
backend service (`vip.service.ts`), no UI. Building one is a real,
separate feature-scale piece of work, not a UI-polish addition to an
existing page like the others in this decision — marked `[PLANEJADO]` in
the player manual rather than rushed.

**UI browser verification**: the Vue templates for
`financeiro.vue`/`painel/compras.vue`/`painel/conta.vue` were compiled
and rendered in a real running dev server this phase (a fake but
correctly-shaped session cookie was used to bypass login, since no full
API+DB dev stack was set up) — every tab switches without error, the
wallet balance panel renders real values, and the empty/loading states
resolve correctly. **A stale dev server from an unrelated project
checkout (`D:\MU\mu-bloodmoon-v1`, port 3000) was found still running
during this verification** — same class of issue Phase O disclosed
(OR-010) — worked around by running this project's own dev server on
port 3010 (`.claude/launch.json` updated) rather than touching the other
process. Because no real API/DB was running, the pages were never seen
rendering *real payment data* end-to-end (order cards, action buttons
with live rows) — only compile/render correctness and empty-state
behavior were confirmed live.

## DECISION 7 — manuals (mandatory, per the Phase O correction above)

All four manuals updated: Player (buying WC/VIP, payment/delivery
states, the "don't pay twice" notice, refund visibility, Meus Pedidos),
ADM (explicit statement that ADM has zero finance permissions by
default, same as everything else, plus the fine-grained permission list
for what becomes possible once delegated; GM has none of these,
confirmed by its role definition never including any
`admin.finance.*`/`admin.recharge.*`/`admin.risk.*`/`admin.chargeback.*`
key), Super ADM (payment inspection, the two-refund-actions distinction,
reconciliation both modes, chargeback investigation, risk cases,
RechargePackage guard), Technical Operations (webhook observability
events, ledger provenance/dispersal tracing, VIP/store delivery
diagnostics, both reconciliation mechanisms with their env flags/lock
names, the refund adapter's real contract, two new troubleshooting
procedures).

## ALTERNATIVES CONSIDERED

- **A numeric risk score instead of typed signals**: rejected outright
  per the phase's own explicit "no black-box score without evidence"
  instruction.
- **Auto-enforcing `TRANSFER_RESTRICTION`/`ACCOUNT_RESTRICTION`**:
  rejected this phase — no existing hook to wire either into safely
  (P2P transfer creation, account-wide login/action block) was found
  without risking a change far outside this phase's real scope; recorded
  as real, auditable admin decisions instead, enforcement left for a
  future phase with a properly-scoped design.
- **Wiring the real refund adapter directly into `refundRecharge()`**:
  rejected — would have removed the deliberate
  LOCAL_FINANCIAL_STATE_REVERSAL vs. PROVIDER_REFUND_CONFIRMED
  distinction Part 11 explicitly required, and would have made an
  unverified real financial call reachable through an already-familiar
  button.
- **Building a player VIP purchase page this phase**: rejected — real
  feature-scale work (product selection, tier/duration picker, checkout
  confirmation UI, wiring to `vip.service.ts`), not proportionate to
  round out an already very large phase; disclosed instead of rushed.

## CONSEQUENCES

- The antifraud foundation is real and wired into the actual payment
  flow (not a parallel, disconnected system) — a genuine
  `PAYMENT_RESTRICTION` blocks real checkout the moment a reviewer
  applies it.
- Chargebacks now have a structured, investigable case with a frozen
  dispersal snapshot, closing a real state-machine bug that would have
  silently broken this exact feature for the one scenario it exists for.
- Real Mercado Pago refund and provider-polling reconciliation code now
  exists, contract-tested and ready for sandbox validation whenever
  credentials become available — neither is a guess at an unknown API
  shape, both are sourced from live documentation.
- The WCOIN pricing conflict Phase N fixed can no longer be
  reintroduced silently through the admin package CRUD.
- Real, useful player-facing order visibility (payment + delivery
  status, wallet balance, the "don't pay twice" notice) exists for the
  first time.
- Documentation discipline gap from Phase O is closed; all four manuals
  now describe Phase O and Phase P's real behavior.
- Real, disclosed gaps remain: sandbox validation for both new payment-
  provider adapters (OQ-019/OQ-020/OQ-021, unchanged), the decimal-BRL
  WCOIN pricing policy question (OQ-022, new), no player VIP purchase
  UI, `TRANSFER_RESTRICTION`/`ACCOUNT_RESTRICTION` enforcement, and
  production `RechargePackage` read access (OQ-018, unchanged, still
  blocked on Bryan's live cPanel session).

## X-Shop / PixPayments / DmN isolation (Parts 20/21) — re-confirmed

Grepped this phase's own full diff: zero references to `ShopProduct`
review status, `PixPayments`, or any `DmN_*` payment table in any file
touched. Nothing this phase integrates the 168 unreviewed X-Shop items,
writes to `PixPayments`, or reactivates the legacy DmN payment path —
all three remain exactly as ADR-0003/ADR-0013 left them.

## RELATED SYSTEMS

`apps/api/src/modules/commerce/payment-risk.service.ts`,
`payment-risk.controller.ts`, `chargeback-case.service.ts`,
`payment-reconciliation.service.ts`, `commerce.service.ts`
(`assertWcoinPackageInvariant`, `attemptProviderRefund`,
`reconcileFromProviderPoll`, `rechargeTransitions` fix),
`apps/api/src/modules/payments/mercadopago.provider.ts` (`refundOrder`),
`payment-provider.interface.ts`, `payment-provider.types.ts`,
`mercadopago.types.ts`,
`apps/web/pages/painel/admin/financeiro.vue`,
`apps/web/pages/painel/compras.vue`, `apps/web/pages/painel/conta.vue`,
`apps/web/pages/recarga.vue`, `apps/web/composables/useCommerceApi.ts`,
`apps/api/prisma/migrations/20260831130000_phase_p_payment_risk_and_chargeback_case/`,
`apps/api/test/payment-risk.e2e-spec.ts`,
`apps/api/test/chargeback-case.e2e-spec.ts`,
`apps/api/test/vip-purchase-matrix.e2e-spec.ts`,
`apps/api/test/store-admin-security.e2e-spec.ts`,
`apps/api/test/recharge-package-admin-guard.e2e-spec.ts`,
`apps/api/test/mercadopago-refund-adapter.e2e-spec.ts`,
`apps/api/test/payment-provider-poll.e2e-spec.ts`,
`apps/api/test/account-deletion.e2e-spec.ts` (extended),
`docs/manuals/*` (all four), ADR-0016, ADR-0018.
