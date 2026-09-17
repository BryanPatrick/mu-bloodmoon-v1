---
status: ACTIVE
category: context-pack-domain
lastVerified: 2026-09-17
classification: POPULATED
---

# Domain: Payments

**STATUS**: Mercado Pago is the live provider; Asaas is a real,
in-progress, sandbox-only second integration (not yet merged, not
production-enabled).

**CURRENT STATE — Mercado Pago (unchanged from Phase 9, not re-verified
this phase)**: three parallel pipelines (`RechargeIntent`/
`PurchaseIntent`/`VipEntitlement`), refund/reconciliation adapters
`SANDBOX_VALIDATION_REQUIRED`, risk/chargeback via explicit auditable
signals.

**CURRENT STATE — Asaas (read this phase, `payments/asaas-sandbox` +
`payments/asaas-local-hardening-claude`)**:
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
Remaining sandbox work          = Codex's 120-test MySQL suite + a real
                                  MariaDB 11 replay NOT yet re-run against
                                  this branch's exact HEAD
Production                      = NOT enabled; no real Asaas credentials
                                  or network calls exist anywhere
```
Full detail: `docs/payments/asaas-sandbox-phase4-claude-handoff.md` on
`payments/asaas-local-hardening-claude`. See
[`../REPOSITORY_KNOWLEDGE_MAP.md`](../REPOSITORY_KNOWLEDGE_MAP.md) §5.

**ACTIVE DECISIONS**: ADR-0019, ADR-0021 (both present on `main`, read
Phase 9). Knowledge Hub decisions `cf5f14c2`/`53034c0c` (2026-08-08)
cite "loja sem gateway de pagamento" as a launch blocker — **flagged
NEEDS_REVIEW, likely stale** given Mercado Pago work since; see
[`../OPEN_QUESTIONS.md`](../OPEN_QUESTIONS.md) OQ-CTX-006.

**AUTHORITATIVE SOURCES**: `docs/payments/`, ADR-0019/0021,
`docs/payments/asaas-sandbox-phase4-claude-handoff.md`. ADR-0008/0018/0020/0022
are Category C (real, uncommitted-only in `mu-bloodmoon-v1-openbeta` —
see `REPOSITORY_KNOWLEDGE_MAP.md` §3), not present on `main`.

**OPEN QUESTIONS**: is `cf5f14c2`/`53034c0c`'s payment-gateway blocker
actually resolved (OQ-CTX-006); has the Asaas branch's MySQL/MariaDB
suite been re-run since this phase (not this phase's job to run it).

**DEFERRED ITEMS**: real Asaas Sandbox homologation (real sandbox API
key/customer/PIX call) — explicitly not attempted on either Asaas
branch yet.

**RELATED TASKS/HANDOFFS**: `docs/payments/asaas-sandbox-phase4-claude-handoff.md`
(status `HANDOFF_FOR_CODEX`, real, current, unconsumed as of this
phase).
