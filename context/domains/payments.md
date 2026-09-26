---
status: ACTIVE
category: context-pack-domain
lastVerified: 2026-09-17
classification: POPULATED
---

# Domain: Payments

**STATUS**: Mercado Pago's implementation is live/real (unchanged), but
**Asaas is now the current primary provider direction** (Phase 14,
`DEC-PAYMENTS-001` — see below) while its own production enablement is
still not authorized. Mercado Pago's code is dormant under this
direction, not removed, not permanently ruled out.

**Provider direction (Phase 14, current, dated decision — not older
repository evidence)**: `DEC-PAYMENTS-001` (2026-09-17): Asaas is the
current primary payment-provider direction; Mercado Pago is dormant,
not planned for active use under current direction. Neither
implementation is deleted by this decision, and the direction may
change with a future one. See [`../DECISIONS.md`](../DECISIONS.md).

**CURRENT STATE — Mercado Pago (unchanged from Phase 9, not re-verified
this phase)**: three parallel pipelines (`RechargeIntent`/
`PurchaseIntent`/`VipEntitlement`), refund/reconciliation adapters
`SANDBOX_VALIDATION_REQUIRED`, risk/chargeback via explicit auditable
signals. Real and unremoved — currently dormant by product direction,
not by any technical deficiency found this session.

**CURRENT STATE — Asaas (Phase 12 review, Phase 6 evidence on an isolated branch)**:
```
Codex original implementation  = payments/asaas-sandbox (16753dc7, 08a1f30a):
                                  local PIX sandbox adapter + validation
                                  against a disposable DB
Claude hardening                = payments/asaas-local-hardening-claude
                                  (1e6b0768): versioned billing PII
                                  encryption, field-bound AAD (closed a
                                  real AAD-substitution gap)
Canonical migration fix         = present on this branch (de941f30 merge),
                                  checksum verified b87b4f0e...ac37726
~~Remaining DB work~~             = completed on payments/asaas-sandbox-phase5-codex
                                  (066ad3be): MySQL 8.4.10 and MariaDB 11.8.6,
                                  56/56 migrations, 48/48 DB tests per engine,
                                  114/114 common API unit tests
~~Remaining Sandbox work~~        = real provider contract tested on the same
                                  branch at ed326e90 (Phase 6): customer,
                                  PIX, lookup, real webhook, exactly-once WC,
                                  overdue/deleted reconciliation
Remaining review gates          = production readiness, billing retention,
                                  operational webhook hosting and approval
Production                      = NOT enabled; no production call made here
```
Full detail: `docs/payments/asaas-sandbox-phase4-claude-handoff.md` on
`payments/asaas-local-hardening-claude`, then
`docs/payments/asaas-sandbox-phase5.md` and
`docs/payments/asaas-sandbox-phase6.md` on
`payments/asaas-sandbox-phase5-codex`. See
[`../REPOSITORY_KNOWLEDGE_MAP.md`](../REPOSITORY_KNOWLEDGE_MAP.md) §5.

**ACTIVE DECISIONS**: ADR-0019, ADR-0021, ADR-0024 (present on `main`).
ADR-0003 (`PixPayments` preserved dormant, never integrated), ADR-0008
(WCoin 1:1 peg), ADR-0011 (direct transfer minimum, now implemented),
ADR-0018 (Phase O), ADR-0020 (integer BRL final policy), ADR-0022
(Phase Q closure) — all read in full Phase 11, see `../ADR_INDEX.md`.
Knowledge Hub decisions `cf5f14c2`/`53034c0c` (2026-08-08) cite "loja
sem gateway de pagamento" as a launch blocker — **still not fully
resolved either way** even after reading the preserved
`open-questions.md`/`open-risks.md` in full (neither document addresses
this specific blocker); see
[`../OPEN_QUESTIONS.md`](../OPEN_QUESTIONS.md) OQ-CTX-006 for what's
now known vs. still genuinely unverified.

**AUTHORITATIVE SOURCES**: `docs/payments/` (tracked), ADR-0019/0021/0024
(tracked), `docs/payments/asaas-sandbox-phase4-claude-handoff.md`.
ADR-0003/0008/0011/0018/0020/0022 plus `docs/payments/payment-domain-model.md`/
`payment-readiness-contract.md`/`payment-surfaces-comparison.md`
(historical design input, superseded in currency by the tracked docs)
now preserved in full — see `../preservation/OPENBETA_UNTRACKED_MANIFEST.md`.

**OPEN QUESTIONS**: is `cf5f14c2`/`53034c0c`'s payment-gateway blocker
actually resolved (OQ-CTX-006); Phase 6's real Sandbox evidence does
not establish production payment readiness or resolve the old beta NO-GO.

**DEFERRED ITEMS**: ~~real Asaas Sandbox homologation was pending~~
Phase 6 real Sandbox validation is recorded in the separate branch.
Production enablement, retention policy and production-readiness review
remain deferred. No production Asaas request was made.

**RELATED TASKS/HANDOFFS**: Phase 4 handoff is consumed by the Phase 5
local parity result; Phase 6 is recorded in the same isolated branch.
