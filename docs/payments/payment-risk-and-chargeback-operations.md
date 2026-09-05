---
status: ACTIVE — implemented and tested locally, not deployed
category: payments
audience: internal (engineering + product)
lastVerified: 2026-09-05
confidence: CONFIRMED (real code, real local-database tests, live browser verification against a running API+DB — see Verification section)
---

# Payment Risk / Chargeback — operations reference (Phase AC release)

This is the direct technical reference for the Payment Risk / Chargeback
control plane isolated into `open-beta/payment-risk-release` (Phase AC).
It documents what is real and operational **locally**, what remains
provider-validation pending, and draws an explicit, honest line between
the two — per this phase's own instruction not to claim Mercado Pago
sandbox validation that never happened.

**This release does not enable real-money payments.** `REAL_MONEY_PAYMENTS_ENABLED`
is not set by this release and its pre-existing gate
(`CommerceService.assertRealMoneyPaymentsEnabled()`) is completely
unmodified. See "Provider independence" below for the full proof.

## What this release contains

- `PaymentRiskSignal`/`PaymentRiskCase`/`PaymentRiskCaseAction` — the
  antifraud foundation. Explicit, typed signals with a human-readable
  `reason` and structured `evidence` on every row — never an opaque
  score.
- `ChargebackCase` — a formal case model replacing the previously-informal
  `RechargeIntentStatus.MANUAL_REVIEW` + `failureReason` prefixed
  `"charged_back:"` convention. The trigger itself (a Mercado Pago
  `charged_back` webhook/poll result mapping to `MANUAL_REVIEW`) is
  unchanged, pre-existing code (`mercadopago.status-map.ts`).
- Three reversible, auditable, permission-gated restriction types
  (`PAYMENT_RESTRICTION`/`TRANSFER_RESTRICTION`/`ACCOUNT_RESTRICTION`),
  applied by a human to a case — never automatically from a signal firing.
- Direct player-to-player WC transfer (`WalletTransferService`) — built
  specifically because `TRANSFER_RESTRICTION` had no real P2P movement to
  enforce against otherwise, and because it's the real detector for 4 of
  the 11 defined risk signal types.
- A local-only payment reconciliation job (DB-consistency checks; never
  calls the provider) and a separately-gated, real provider-polling
  mechanism (calls the provider; off by default).
- Admin UI: three new tabs on `/painel/admin/financeiro` (Reconciliação,
  Risco, Chargebacks).
- Player UI: `/painel/transferencias` (direct WC transfer, fee estimate,
  history).

## What this release deliberately excludes

Isolated from a larger, uncommitted working tree (`open-beta/p0-foundation`)
that also contained unrelated work. Excluded, on purpose, per this
phase's own scope:

- **The real Mercado Pago refund adapter** (`MercadoPagoProvider.refundOrder()`,
  `CommerceService.attemptProviderRefund()`, the local-only
  `CommerceService.refundRecharge()`, and their admin routes/UI buttons).
  Confirmed by code audit during isolation: none of these ever call
  `PaymentRiskService` or `ChargebackCaseService` — they are Phase O/P's
  separate refund-adapter work, not risk/chargeback logic. Excluding them
  also directly serves this release's "provider independence" proof —
  see below.
- **VIP** (`vip.service.ts`'s own `ACCOUNT_RESTRICTION` check, the player
  VIP purchase page, cross-tier purchase policy) — explicitly out of
  scope per this phase's hard boundary ("DO NOT change VIP"). One real
  consequence: `WalletTransferService`'s own VIP-restriction test case
  was adapted to remove its VIP assertion (see Tests below) — that
  specific enforcement point does not exist in this release.
- **X-Shop/CashShop legacy-catalog admin** (`legacy-catalog-*.ts`,
  the "Pacotes" and "Catálogo legado" admin tabs) — unrelated Phase S
  work, also touching `commerce.service.ts`/`commerce.controller.ts`/
  `financeiro.vue` in the source working tree; none of it was ported.
- **WCOIN 1:1 peg pricing** (`WCOIN_TO_BRL_RATE`, `wcoinBaseForBrl()`,
  `assertWcoinPackageInvariant()`) — Phase N's own work; unchanged and
  untouched.
- **Delivery-status purchase-history polish** (`deliveryStatus` on
  `listPurchasesForAccount`, the `purchaseStatusFromApi` label-map
  rewrite, `painel/compras.vue`/`painel/conta.vue` wallet-balance
  display) — Phase O UI work, unrelated to risk/chargeback specifically.
- **Webhook lifecycle observability events** (`PAYMENT_WEBHOOK_RECEIVED`/
  `_VERIFIED`/`_DUPLICATE`) — general webhook instrumentation that never
  calls `PaymentRiskService`/`ChargebackCaseService`.

## Risk signal inventory (re-verified this phase, not assumed from an enum)

| Signal | Detector real? | Source data | Enforcement | Tested |
|---|---|---|---|---|
| `NEW_ACCOUNT_HIGH_VALUE_PURCHASE` | YES — `PaymentRiskService.evaluateOnRechargePaid()` | `Account.createdAt` vs. recharge confirmation time, `RechargeIntent.price` | Feeds a `PaymentRiskCase`; no automatic action | YES |
| `MULTIPLE_FAILED_PAYMENTS` | YES — `evaluateOnRechargeFailed()` | `RechargeIntent` count, `status=FAILED`, time window | Feeds a case | YES |
| `REPEATED_CHARGEBACK` | YES — `evaluateOnChargeback()` | `ChargebackCase` count for the account | Feeds a case | YES |
| `RAPID_PURCHASE_SEQUENCE` | YES — `evaluateOnRechargePaid()` | `RechargeIntent` count, `status=PAID`, time window | Feeds a case | YES |
| `DELIVERY_ANOMALY` | YES — `evaluateOnDeliveryAnomaly()`, called from `PaymentReconciliationService` | Reconciliation anomaly rows (`PAID_WITHOUT_LEDGER_CREDIT`/`STUCK_NON_TERMINAL`) | Feeds a case | YES |
| `PROVIDER_REVIEW_STATE` | YES — `evaluateOnManualReview()` | `RechargeIntent.manualReviewReason` (excludes the `charged_back:` prefix path, which routes to `REPEATED_CHARGEBACK` instead) | Feeds a case | YES |
| `IMMEDIATE_WCOIN_TRANSFER` | YES — `WalletTransferService.evaluateTransferRiskSignals()` | Most recent `WC_PURCHASE_CREDIT` ledger entry vs. transfer time | Feeds a case | YES |
| `NEAR_FULL_BALANCE_TRANSFER` | YES — same method | Transfer amount vs. sender balance before transfer | Feeds a case | YES |
| `MANY_RECIPIENTS_AFTER_PURCHASE` | YES — same method | Distinct `PLAYER_DIRECT_TRANSFER` recipients in a window, only after a recent credit | Feeds a case | YES |
| `REPEATED_RECIPIENT_NETWORK` | YES — same method | Distinct senders to one recipient in a window | Feeds a case | YES |
| `PAYMENT_ACCOUNT_MISMATCH` | **NO — UNAVAILABLE_PROVIDER_IDENTITY** | N/A | N/A | N/A |

**`RISK_SIGNALS_DEFINED = 11`, `RISK_SIGNALS_REAL = 10`, `RISK_SIGNALS_PLACEHOLDER = [PAYMENT_ACCOUNT_MISMATCH]`.**
This corrects Phase Y's earlier "6/11 wired" figure — Phase Q (already
part of this release, not new work this phase) wired the remaining four
WC-transfer signals; the true, current count is 10/11 real, 1
deliberately unavailable.

### `PAYMENT_ACCOUNT_MISMATCH` — kept honest, not fabricated

Re-checked this phase, against real code, not assumed: Mercado Pago's
Orders API response (`MercadoPagoOrderResponse`, `mercadopago.types.ts`)
does not return any payer identifier at all on `GET`/webhook — the
`payer: {email}` field is only ever sent in the `CREATE` request body,
never echoed back on read. There is therefore no reliable field to
compare against the account's registered email, and this codebase does
not use fragile proxies (payer display name, partial card number, etc.)
for a fraud signal. The enum value is kept (not removed) so a future
phase can extend additively if a reliable provider identifier ever
becomes available — but no detector call site exists for it, and none
was fabricated to make the enum "look" wired. It cannot incorrectly flag
any account because it is never evaluated at all.

## Chargeback case flow (verified, local database)

`ChargebackCaseService.openCaseForRecharge()` — case creation:
source `RechargeIntent`/provider/external order id linkage, provider
reason, status (`OPEN → UNDER_REVIEW → CLEARED/CONFIRMED_FRAUD/CLOSED`),
`chargebackDate`, opened timestamp, a frozen `dispersalTraceSnapshot`
(from `WalletLedgerService.traceChargebackDispersal()`), the account's
live balance *at case-open time* (an honest fact, not a FIFO claim — WC
is fungible once merged into a balance). Idempotent: a redelivered
webhook for an already-cased recharge returns the existing case, proven
by a real unique-constraint race test. Review notes, resolution, and
resolving admin are tracked; every state change is audited
(`admin.finance.chargeback-case.note`/`.resolved`).

**No real provider chargeback call is ever made.** This service only
ever reacts to a chargeback already reported (via the pre-existing,
unmodified `mercadopago.status-map.ts` mapping) — it never calls out to
Mercado Pago.

### A real bug this phase's own testing caught, not invented after the fact

`commerce.service.ts`'s `rechargeTransitions` state machine never allowed
`PAID → MANUAL_REVIEW` before this phase's own work (re-confirmed during
isolation: absent at the clean base). Since the one realistic chargeback
scenario is "Mercado Pago reports `charged_back` well after the original
approval already moved the recharge to `PAID`," this would have thrown
`"Transicao invalida: PAID -> MANUAL_REVIEW"` for every real chargeback,
silently preventing `ChargebackCaseService` from ever running. Fixed by
adding `MANUAL_REVIEW` to `PAID`'s allowed transitions, deliberately
**without** pairing it with a clawback — WC stays exactly where it is
while a human reviews the case; an explicit later `REFUNDED` transition
(unchanged, pre-existing) is the only path that claws back.

## Chargeback responsibility (Part 8, re-audited)

Primary responsibility is always the purchase originator.
`dispersalTraceSnapshot` (a breadth-first walk of WC movement forward
from the original credit, bounded in depth and time) exists **purely for
investigation** — a real test (`CHARGEBACK_RESPONSIBILITY`-equivalent
coverage in `chargeback-dispersal-trace.e2e-spec.ts`) confirms a
downstream transfer recipient is traceable in the snapshot but is never
automatically restricted, signaled, or cased. No code path in this
release applies a `PaymentRiskCaseAction` to any account other than the
one a human reviewer explicitly targets when calling `applyAction()`.

## Refund vs. chargeback — kept distinct (Part 12)

| | Refund (not in this release) | Chargeback (this release) |
|---|---|---|
| Initiated by | Admin, explicitly, via a UI action | Passively detected — a provider webhook/poll reports `charged_back` |
| Status transition | `PAID/MANUAL_REVIEW → REFUNDED`, immediate wallet clawback | `PAID → MANUAL_REVIEW`, **no** automatic clawback |
| Model | None — a status transition on `RechargeIntent` itself | A dedicated `ChargebackCase` row, its own lifecycle |
| Risk-service involvement | None — never calls `PaymentRiskService`/`ChargebackCaseService` | `evaluateOnChargeback()` + `openCaseForRecharge()`, every time |
| Admin presentation | A button on `financeiro.vue`'s Filas tab (not included in this release) | Its own dedicated Chargebacks tab, case list, detail, resolution |

The two concepts were never collapsed in the source code, and this
release preserves that distinction precisely by excluding refund
entirely rather than blurring the line between them.

## Wallet interaction (Part 9)

All financial mutation in this release routes through the existing,
unmodified `WalletLedgerService` (`credit()`/`debit()`/`settleTaxedCredit()`)
— no new balance-mutation path was introduced. `WalletTransferService`
uses exactly this same mechanism for both the sender's debit and the
recipient's taxed credit; `traceChargebackDispersal()` is read-only and
never mutates anything. No permanent balance mutation outside this
existing, approved ledger logic exists anywhere in this release.

## Direct transfer economics (Part 10, unchanged)

- Minimum: **20 WC** (`DIRECT_TRANSFER_MIN_WC`, ADR-0011's already-recorded,
  still-provisional number — used as-is, not re-derived or changed).
- Fee: **10%** (the same admin-configurable `MarketplaceEconomyConfig.wcoinTaxPercent`
  row `settleTaxedCredit()` already reads for marketplace settlement — no
  second, duplicated rate).
- Receiver bears the fee: sender's `debit()` takes the full gross amount;
  recipient's `settleTaxedCredit()` nets down by the fee. A real test
  (`DIRECT_TRANSFER_100_WC_RECEIVER_GETS_90`, already passing, unmodified)
  proves 100 WC → 10 WC fee → 90 WC net exactly.
- No double taxation: this is the *same* tax mechanism marketplace
  settlement uses, not a second one.

`TRANSFER_RESTRICTION` correctly gates only the *sending* side
(`assertNoActiveTransferRestriction` in `WalletTransferService.transfer()`)
— never receiving, never a refund.

## Marketplace interaction (Part 11, re-verified against real code)

Per the real, code-grounded audit already in the source (preserved
verbatim in `marketplace.service.ts#createOrder`'s own header comment):

| Action | WC direction | Gated by `TRANSFER_RESTRICTION`? |
|---|---|---|
| List (`createListing`) | No P2P movement (platform fee only) | No |
| Cancel listing | No movement | No |
| **Buy (`createOrder`)** | Buyer → specific seller, outbound, immediate | **YES — the only gated action** |
| Settlement (`updateOrderStatus` → COMPLETED) | Seller receiving, already-paid order | No |
| Sell (seller's own side) | Seller receiving | No |
| Refund/reversal | Buyer receiving back | No |

Confirmed by direct code inspection this phase, not re-derived from
scratch: exactly one `assertNoActiveTransferRestriction(user.id)` call
exists in `marketplace.service.ts`, at the top of `createOrder()`. No
inbound settlement/sell/refund path is blocked by any risk restriction
anywhere in this release.

## RBAC (Part 15)

| Permission | Grants |
|---|---|
| `admin.risk.view` | View risk cases, signals, active restrictions |
| `admin.risk.manage` | Apply/lift a restriction, resolve a case |
| `admin.chargeback.view` | View chargeback cases, dispersal trace |
| `admin.chargeback.manage` | Add review notes, resolve a case |

Same view/consequential-action split as every other `admin.*` permission
pair in this codebase. Neither pair is part of `ADMIN`'s default role
permission set — both require explicit `SUPER_ADMIN` delegation via the
existing `AccountPermission` override mechanism, same as every other
admin capability. GM has neither, confirmed by a real RBAC test suite
(`payment-gm-rbac.e2e-spec.ts`) asserting 403 on every mutating and
viewing route for a real GM-role token.

## Auditability (Part 16)

Every consequential action writes a real `AuditService.record()` entry
(actor id/username, action name, target type/id, reason, before/after
status where applicable) **and** a real `ObservabilityService.recordOperationalEvent()`
entry (module `payment-risk`/`chargeback`, event type, severity,
description, structured data) — both, not one or the other. Confirmed
for: applying a restriction, lifting a restriction, resolving a risk
case, opening/annotating/resolving a chargeback case. No silent
administrative mutation exists in this release.

## Provider independence (Part 17 — proven, not asserted)

Deploying this batch, by itself:

- **Does not expose checkout.** `CommerceService.createRechargeCheckout()`'s
  pre-existing `assertRealMoneyPaymentsEnabled()` gate (checked BEFORE
  the new risk-restriction checks this phase adds) is completely
  unmodified — confirmed by diff review during isolation. `REAL_MONEY_PAYMENTS_ENABLED`
  is not read, set, or referenced anywhere in this release's own new
  code.
- **Does not accept real money.** No new payment-creation code path
  exists in this release; the only new outbound-facing capability
  (`reconcileFromProviderPoll`) reads an existing order's status, it
  never creates a charge.
- **Does not enable refund provider calls.** The real refund adapter
  (`MercadoPagoProvider.refundOrder()`) was not ported into this release
  at all — there is no code path in this worktree that could call it.
- **Does not enable provider polling by default.** `PaymentReconciliationService.pollProviderForStuckPayments()`
  checks `MERCADO_PAGO_PROVIDER_POLL_ENABLED === 'true'` and returns
  `{enabled: false, candidates: 0, polled: 0, failed: 0}` immediately if
  unset — which it is, in this release's `.env.example` and every real
  environment until an operator explicitly opts in.

## Feature flags (Part 18)

| Flag | Default in this release | What it gates |
|---|---|---|
| `REAL_MONEY_PAYMENTS_ENABLED` | unset (OFF) — unchanged, pre-existing gate | Any new recharge checkout |
| `MERCADO_PAGO_REFUND_ENABLED` | N/A — the code it would gate isn't in this release | Real provider refund calls (excluded entirely) |
| `MERCADO_PAGO_PROVIDER_POLL_ENABLED` | unset (OFF) | `PaymentReconciliationService`'s real outbound provider-polling loop |
| `PAYMENT_RECONCILIATION_ENABLED` | unset (OFF) | The local-only, DB-consistency-check reconciliation loop (never calls the provider even when on) |

None of these defaults were changed by this phase; all were already OFF
in the source working tree, and remain OFF in this isolated release.

## Verification performed this phase

- **API tests**: real local database (`bloodmoon_local_claude`), not
  mocked, not skipped. All 8 Phase P/Q e2e suites pass (51/51 tests) —
  `payment-risk.e2e-spec.ts`, `chargeback-case.e2e-spec.ts`,
  `chargeback-dispersal-trace.e2e-spec.ts`, `payment-gm-rbac.e2e-spec.ts`,
  `payment-idor.e2e-spec.ts`, `payment-provider-poll.e2e-spec.ts`,
  `payment-reconciliation.e2e-spec.ts`, `wallet-transfer.e2e-spec.ts`.
  Regression: `marketplace-bridge-dev-controls.e2e-spec.ts`,
  `recharge-payments.e2e-spec.ts`, `wallet-ledger.e2e-spec.ts` (37/37)
  all pass unchanged. A full, incidental 62-suite/664-test run of the
  entire e2e suite also completed during this phase's work (not part of
  the intended scope, kept as extra evidence) — the only two failures
  outside the ones already listed above (`two-factor-key-migration.e2e-spec.ts`,
  `characters-demo-seed.e2e-spec.ts`) are in files this release never
  touches, unrelated to payment risk/chargeback by any plausible
  mechanism, and are not this release's responsibility to fix.
- **Web build**: `npm run web:build` clean; `financeiro.vue`/
  `transferencias.vue` confirmed bundled in output.
- **Live browser verification**: see this phase's own FINAL_REPORT for
  the specific screens exercised against a real running API + local
  database.

Three tests from the original (uncommitted) source were adapted for this
release's actual scope rather than copied verbatim with a known-false
assumption baked in:

1. `wallet-transfer.e2e-spec.ts`'s `ACCOUNT_RESTRICTION_BLOCKS_TRANSFER_AND_VIP_AND_PURCHASE`
   → renamed `..._AND_PURCHASE`, VIP assertion removed (VIP out of scope).
2. `payment-risk.e2e-spec.ts`'s `RESTRICTED_ADMIN_REFUND` → replaced with
   `RESTRICTED_ADMIN_STATUS_UPDATE`, re-proving the same underlying
   invariant (an admin-initiated action is never blocked by a player's
   own `ACCOUNT_RESTRICTION`) against `updateRechargeStatus`, which is
   real and shipped in this release, instead of the excluded refund
   endpoint.
3. `payment-gm-rbac.e2e-spec.ts`'s `GM_DENIED_REFUND`/`GM_DENIED_PROVIDER_REFUND`
   removed — both routes belong to the excluded refund adapter.

## What Mercado Pago sandbox validation still requires

Not claimed as passing anywhere in this release, per this phase's own
instruction. The Mercado Pago account/provider validation referenced in
this phase's context is externally blocked by a temporary provider
cooldown — this release's entire risk/chargeback control plane was built
and verified against local data and mocked provider responses only. Real
sandbox validation remains required before any of the following can be
trusted against a live provider: the refund adapter (excluded from this
release anyway), the provider-polling mechanism (`pollProviderForStuckPayments`),
and — indirectly — the accuracy of `mercadopago.status-map.ts`'s
`charged_back` mapping against a real Mercado Pago dispute event (the
mapping itself is unmodified, pre-existing code, not newly written this
phase, but was never exercised against a real provider response either).
