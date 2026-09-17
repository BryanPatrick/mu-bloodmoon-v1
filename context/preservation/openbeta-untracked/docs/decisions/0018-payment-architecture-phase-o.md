---
status: ACTIVE — implemented and tested locally, not deployed
category: decisions
audience: internal (engineering)
lastVerified: 2026-08-31
confidence: CONFIRMED (real code, 77/77 real tests passing, see Related Systems)
---

# ADR-0018: Payment architecture implementation — Phase O real gaps closed

**DATE**: 2026-08-31 (Phase O)
**STATUS**: ACTIVE, implemented and tested locally against a real database; nothing deployed to production

## PHASE O COMPLETION CORRECTION (2026-08-31, Phase P)

**Previous statement** (Phase O's own FINAL_REPORT): `PHASE_O = PASS`,
`MANUALS_UPDATED = NO`, reported side by side without flagging a tension
between them.

**Discrepancy**: this project's own permanent rule (`CLAUDE.md`/`AGENTS.md`
Documentation discipline) states a change that alters what an admin/GM/
player can do or see is not "done" until the relevant manual is updated
to match — reporting it complete without that update is inaccurate.
Phase O added a real, player-visible/admin-visible capability (the
"Estornar" refund button, new permissions) without updating any of the
four manuals. `PHASE_O = PASS` therefore overstated completeness against
the project's own standard, even though every individual code change was
real, tested, and correctly disclosed as `PASS` on its own terms.

**Corrected interpretation**: split the single `PHASE_O = PASS` verdict
into two axes, going forward —

```
PHASE_O_IMPLEMENTATION = PASS
PHASE_O_DOCUMENTATION_COMPLETENESS = PARTIAL
```

The implementation itself (VIP GameBridge delivery, refund action,
chargeback dispersal trace, reconciliation, all tested) remains a real
`PASS` — nothing about the code is being walked back. What was inaccurate
was calling the *phase* complete while `MANUALS_UPDATED = NO` sat
un-flagged as a real gap against a rule that predates Phase O. Phase P
(2026-08-31) updates all four manuals to cover Phase O's changes (see
`docs/manuals/`) as part of closing this correction, not as unrelated new
work.

## CONTEXT

Phase N's `docs/payments/payment-readiness-contract.md` formalized the
policy inputs (WC 1:1 peg, RMT policy, VIP pricing) for a real Payment
architecture. Phase O's own audit (see
`docs/payments/payment-domain-model.md`) found the payment domain far
more mature than a "build from scratch" framing suggested — real
`PaymentProvider`/Mercado Pago integration, HMAC webhook verification,
idempotent webhook dedup, a real Mercado Pago status mapper, and (for
store items) a full `StoreDelivery` async-worker model with a real
refund action already existed. Four concrete, real gaps were found and
closed this phase; this ADR records why each was built the way it was.

## DECISION 1 — `GameBridgeVipGateway`: VIP delivery wired to the real GameBridge

**What existed**: `VipDeliveryService` (claim/backoff/retry/stale-
recovery/reconciliation, all real and tested) had exactly one gateway
implementation, `UnconfiguredVipGameBridgeGateway`, which always honestly
reported "not configured." Its own header comment claimed no real
GameServer-write path existed and building one would be "arbitrary SQL
through GameBridge... repeatedly forbidden." **That comment was stale** —
Phase L/M had since built and tested exactly the legitimate,
least-privilege channel it said didn't exist (ADR-0002).

**Decision**: `GameBridgeVipGateway` (`apps/api/src/modules/vip/game-bridge-vip.gateway.ts`)
uses `GameCommandTransportClient` (already exported by
`GameAccountIdentityModule` for exactly this kind of reuse) to submit a
real `GRANT_VIP` command. Because `GameCommandTransportClient.create()`
only enqueues (the Agent picks it up asynchronously), this is a
**two-phase submit-then-poll** design: first call submits and carries the
new `gameCommandId` forward (via `vip-delivery.service.ts`'s existing
retry-persistence, extended to merge a gateway's `detail` into the job's
payload); subsequent calls poll that same command via `.get()`.
`SUCCEEDED` → delivered; `FAILED_FINAL`/`EXPIRED` → clears the
commandId so the next attempt submits fresh (`bm_GrantVip`'s MAX-rule
makes a fresh grant idempotent regardless, per ADR-0002); anything else →
keeps polling.

**A real bug found and fixed during this same implementation, not by a
later test**: the terminal-failure branch originally omitted `detail`
entirely rather than explicitly clearing `gameCommandId` — since the
retry-persistence merge only overwrites keys actually present in
`detail`, an absent `detail` would have left every future retry polling
the same permanently-dead command forever. Fixed by explicitly setting
`detail: { gameCommandId: undefined }` on that branch (JSON serialization
drops the `undefined` key, actually removing it from the stored
payload). Caught by design review before any test ran, then verified by
a dedicated test (`DELIVERY_RETRY`, `vip-gamebridge-delivery.e2e-spec.ts`)
proving the fix.

**Why not deterministic idempotency keys for the GameBridge command
itself**: `vip-sync.service.ts`'s own `SYNC_VIP_TIER` calls already
establish the precedent of generating a fresh `commandId` on every
submission, relying on the underlying SQL procedure's own idempotency
(MAX-rule / unconditional-set) rather than deduplicating at the command
layer — `GameBridgeVipGateway` follows the same precedent for
consistency, with the submit-then-poll carry-forward existing purely to
avoid piling up redundant commands/audit rows, not because correctness
requires it.

## DECISION 2 — explicit ledger provenance for base/bonus WC credit

**What existed**: `WalletLedgerEntry.metadata` (a JSON field) already
existed and was already supported by `WalletLedgerService.credit()`, but
the real WC purchase-credit call site never populated it — the
base/bonus breakdown was only reconstructable via a join back to
`RechargeIntent.amount`/`.bonus`.

**Decision**: the credit call now passes
`metadata: { baseAmount, bonusAmount, grossPaidBRL, provider }`
explicitly. **Kept as one combined ledger row, not split into
`PURCHASE_BASE_CREDIT`/`PROMOTIONAL_BONUS_CREDIT`** (the readiness
contract's own "at minimum provenance must remain explicit" clause) —
splitting would double the row count for no real traceability gain once
the metadata is present on the single row.

## DECISION 3 — an explicit, separately-permissioned refund action for `RechargeIntent`

**What existed**: `RechargeIntentStatus.REFUNDED` was already a real,
reachable state via the generic `updateRechargeStatus` admin endpoint
(gated by the broad `admin.orders.operate`), and `transitionRechargeStatus`
already correctly clawed back the wallet credit (falling back to
`REFUND_PENDING` if the player had already spent the balance, never
silently losing the refund). For `PurchaseIntent` (store items), a
*separate*, more deliberate refund action already existed —
`StoreAdminService.orderAction('refund')`, gated by the dedicated
`admin.store.refund` permission, with its own explicit audit action name
and admin UI button.

**Decision**: `CommerceService.refundRecharge()` gives `RechargeIntent`
the same explicit-action treatment, gated by a new, dedicated
`admin.recharge.refund` permission (distinct from `admin.orders.operate`,
which every *other* recharge status transition still uses) — per the
readiness contract's own "do not assume all ADM roles can refund." It
validates the recharge is `PAID`/`MANUAL_REVIEW`, requires a non-empty
reason, delegates the actual state transition to the already-correct
`transitionRechargeStatus`, and additionally records a distinct
`admin.finance.recharge.refund` audit action on top of (not instead of)
the transition's own audit entry — so "was this specifically a refund"
is answerable from the audit log alone. A matching admin UI button
("Estornar") was added to `financeiro.vue`, mirroring the existing
"Cancelar" button's pattern exactly.

**What this decision explicitly does NOT do**: call the real Mercado
Pago refund API. `PaymentProvider.refundOrder()` remains the pre-existing
`Promise<never>` stub — this phase's refund action only performs Blood
Moon's own side (state transition + wallet clawback + audit), never a
real provider-side money movement. No real Mercado Pago refund
sandbox/credentials were available in this environment to build and
verify that call against, and "do not invent destructive behavior"/
"do not issue real refunds" rule out guessing at its shape. This is a
disclosed, real gap (see `docs/open-questions.md`), not a silently
incomplete implementation.

## DECISION 4 — chargeback dispersal tracing + scheduled payment reconciliation

**Dispersal tracing**: `WalletLedgerService.traceChargebackDispersal(rechargeIntentId)`
is a bounded (max 10 hops, default 5), read-only breadth-first walk from
the original payment's credited account, following `counterpartyAccountId`
links (the field `settleTaxedCredit()` already populated for every real
P2P transfer/market-sale credit) forward in time only (never picking up
unrelated prior activity). It returns a full hop-by-hop chain plus every
involved account — a report for a human to review, never an automatic
action. Exposed via `GET admin/finance/recharges/:id/chargeback-trace`,
gated by a new, dedicated `admin.chargeback.view` permission.

**Scheduled reconciliation**: `PaymentReconciliationService` mirrors the
exact `setInterval` + MySQL `GET_LOCK` + `*_ENABLED`-flag pattern already
proven in `vip-sync.service.ts`/`vip-delivery.service.ts`/
`game-provisioning-reconciliation.service.ts` — confirmed via a real
search that this project uses that pattern exclusively and never
`@Cron` anywhere, so this follows the established convention rather than
introducing a new one. It checks two things, both pure local-DB
consistency checks: (1) every `PAID` `RechargeIntent` has a matching
`WC_PURCHASE_CREDIT` ledger row (an invariant `transitionRechargeStatus`'s
own atomic transaction should make impossible to violate — the check
exists specifically to catch that invariant being violated for any
future reason, not because it's expected to fire under correct code
today); (2) any recharge stuck `PENDING`/`PROCESSING`/`MANUAL_REVIEW` for
over an hour, as a candidate for the existing manual "Ressincronizar"
action. **Deliberately does not call the Mercado Pago API itself** — a
scheduled job making real outbound provider calls on every tick is a
materially riskier capability than this phase could safely build and
verify without live sandbox credentials (see `docs/open-questions.md`'s
Mercado Pago sandbox blocker entry); the existing manual resync button
already covers that need, triggered by a human once this job's report
flags a candidate.

## ALTERNATIVES CONSIDERED

- **A unified `Order`/`Payment`/`Delivery` schema replacing `RechargeIntent`/
  `PurchaseIntent`/`StoreDelivery`/`GameBridgeJob`**: rejected — see
  `docs/payments/payment-domain-model.md`'s "why three pipelines, not
  one" section. Each existing model is already correct for its product
  family; a unified schema would either force WC through unnecessary
  async machinery or force VIP/store-items into an unsafe synchronous
  model.
- **Splitting WC ledger credits into two rows (base/bonus)**: rejected,
  see Decision 2.
- **Reusing `admin.orders.operate` for the new refund action**: rejected
  — exactly the "assume all ADM roles can refund" mistake the readiness
  contract warned against; a dedicated permission was cheap and matches
  the existing `admin.store.refund` precedent.
- **Implementing a real Mercado Pago refund call and a real provider-
  polling reconciliation job**: rejected for this phase — no live
  sandbox credentials were available to build and verify either against;
  guessing at either shape would violate "do not invent destructive
  behavior" and "if test credentials are unavailable, report the exact
  blocker."

## CONSEQUENCES

- VIP purchases can now genuinely reach the real GameServer through this
  code path, once `GAME_DATA_WORKER_URL`/`GAME_COMMAND_PORTAL_SECRET` are
  configured in a real environment — this was previously structurally
  impossible (the gateway always returned "not configured").
- `RechargeIntent` refunds now have the same auditable, permissioned,
  explicit-action shape as `PurchaseIntent` refunds already had —
  parity across both real purchase pipelines.
- A real chargeback dispute can be investigated with a concrete,
  automatically-generated dispersal report rather than a manual ledger
  query built from scratch each time.
- A silent "payment succeeded, WC never credited" bug (however unlikely
  given the current atomic-transaction design) would now be caught
  within one reconciliation interval instead of only being found if a
  player complains.
- Real Mercado Pago refund API integration and provider-polling
  reconciliation remain genuine, disclosed gaps — see
  `docs/open-questions.md` for both, tracked for whenever real sandbox
  access becomes available.

## RELATED SYSTEMS

`apps/api/src/modules/vip/game-bridge-vip.gateway.ts`,
`apps/api/src/modules/vip/vip-delivery.service.ts`,
`apps/api/src/modules/vip/vip-delivery.gateway.ts`,
`apps/api/src/modules/commerce/commerce.service.ts` (`refundRecharge`,
`getChargebackDispersalTrace`),
`apps/api/src/modules/commerce/payment-reconciliation.service.ts`,
`apps/api/src/modules/wallet/wallet-ledger.service.ts`
(`traceChargebackDispersal`),
`apps/api/test/vip-gamebridge-delivery.e2e-spec.ts`,
`apps/api/test/recharge-refund-rbac.e2e-spec.ts`,
`apps/api/test/chargeback-dispersal-trace.e2e-spec.ts`,
`apps/api/test/payment-reconciliation.e2e-spec.ts`,
`docs/payments/payment-domain-model.md`,
`docs/payments/payment-readiness-contract.md`, ADR-0001, ADR-0002,
ADR-0008.
