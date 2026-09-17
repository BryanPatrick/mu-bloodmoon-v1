---
status: ESTABLISHED
category: decisions
audience: internal (engineering + product)
lastVerified: 2026-08-31
---

# Decision log (ADR-style)

Real architectural/product decisions, recorded once made, so a future
session or engineer never has to reverse-engineer *why* something is the
way it is from code alone. Each entry: CONTEXT, DECISION, WHY,
ALTERNATIVES CONSIDERED, CONSEQUENCES, STATUS, DATE, RELATED SYSTEMS.

This log started 2026-08-31 (Phase L Decision Closure follow-up). It is
**not yet a complete history of every architectural decision made in this
project** — many earlier decisions (Open Beta account lifecycle, X-Shop
review policy, guild/RMT policy, WCoin sink rates, and others) predate
this log and are documented in their own domain docs
(`docs/economy/`, `docs/accounts/`, `docs/product/`) rather than here.
Backfilling those into ADR shape is real, valuable future work, not done
retroactively as part of establishing this log — see
`docs/protocols/agent-bootstrap.md` for the standing rule that this log
should be checked (step 4) and added to going forward, not treated as
already exhaustive.

## Index

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-vip-source-of-truth.md) | Portal is the VIP source of truth, not the GameServer | ACTIVE |
| [0002](0002-gamebridge-least-privilege-and-sql-audit.md) | GameBridge procedures: EXECUTE-only grants, no raw SQL, SQL-side append-only audit table | ACTIVE |
| [0003](0003-pixpayments-preserve-dormant.md) | `PixPayments` preserved but never integrated | ACTIVE |
| [0004](0004-open-beta-account-lifecycle.md) | Open Beta account lifecycle — register → play → delete at Beta end | ACTIVE |
| [0005](0005-beta-reward-entitlement-preservation.md) | Beta reward entitlement survives account deletion via hashed email | ACTIVE |
| [0006](0006-account-deletion-two-mode-architecture.md) | Account deletion: anonymize (real players) vs. purge (pre-Beta only) | ACTIVE |
| [0007](0007-data-retention-current-stance.md) | Data retention — structural preservation now, duration decided later | ACTIVE (PARTIAL — durations pending legal review) |
| [0008](0008-wcoin-1to1-peg-with-brl.md) | WC 1:1 peg with R$ for VIP pricing — real discrepancy vs. recharge pricing found | ACTIVE (open discrepancy) |
| [0009](0009-wcoin-currency-tax-model.md) | WC 10% / GP+HP 5% transaction tax, fixed-point fractional accumulator | ACTIVE |
| [0010](0010-vip-tier-product-naming-abstraction.md) | Bronze/Silver/Gold are Portal concepts, AL1-3 is a GameServer internal detail | ACTIVE |
| [0011](0011-direct-wcoin-transfer-minimum.md) | Direct WC transfer minimum of 20 WC | DECIDED_BUT_NOT_IMPLEMENTED |
| [0012](0012-cashshop-no-standard-gear-sales.md) | CashShop: no standard/combat gear, cosmetics and QoL only | ACTIVE |
| [0013](0013-xshop-review-methodology.md) | X-Shop review methodology decided; item-level KEEP/REMOVE still pending | METHODOLOGY_DECIDED |
| [0014](0014-launcher-cms-asset-fallback-strategy.md) | Launcher content/asset fallback — client-side degradation chain | ACTIVE |
| [0015](0015-bug-hunters-reward-model.md) | Bug Hunters reward delivery mechanism real; reward table is test-fixture only | INFRASTRUCTURE_ONLY |
| [0016](0016-rmt-policy-gap.md) | RMT policy — existence attested, content not located (gap, not invented) | CONTENT_NOT_LOCATED |
| [0017](0017-modular-component-product-direction.md) | Preserve modular component boundaries for possible future commercial modularity | ARCHITECTURAL_DIRECTION |
| [0018](0018-payment-architecture-phase-o.md) | Payment architecture Phase O: real VIP GameBridge delivery, explicit refund action, chargeback dispersal tracing, scheduled reconciliation | ACTIVE, tested locally |
| [0019](0019-payment-operational-closure-phase-p.md) | Payment operational closure Phase P: antifraud foundation, formal chargeback case model, real Mercado Pago refund/reconciliation adapters (SANDBOX_VALIDATION_REQUIRED), admin/player UI, WCOIN package guard, manuals | ACTIVE, tested locally |
| [0020](0020-wcoin-integer-brl-policy-final.md) | WCOIN recharge pricing: integer BRL is final policy (closes OQ-022) | ACTIVE, final |
| [0021](0021-payment-restriction-and-transfer-policy.md) | Payment/transfer/account restriction enforcement, direct WC transfer (new feature), WC-transfer antifraud signals, player VIP purchase page, RechargePackage admin UI | ACTIVE, tested locally |
