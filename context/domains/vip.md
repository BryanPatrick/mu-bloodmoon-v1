---
status: ACTIVE
category: context-pack-domain
lastVerified: 2026-09-17
---

# Domain: VIP

**Authoritative docs**: [`../../docs/vip/`](../../docs/vip/), notably
`vip-end-to-end-data-flow.md` and `wz-setaccountlevel-coexistence.md`
per `docs/README.md`'s narrative (not independently re-verified this
session).

**One-paragraph orientation**: Portal is the source of truth for VIP
entitlement (per `docs/README.md`'s ADR-0001 reference — **that ADR
file is not present on `main`**, see
[`../OPEN_QUESTIONS.md`](../OPEN_QUESTIONS.md) OQ-CTX-001). VIP tier
change while active: same tier always extends normally; a different
tier is blocked until the current one expires (reverses an earlier
"last tier wins" behavior that could destroy prepaid value) — per
`docs/README.md`'s Phase Q narrative.

**Related decisions**: referenced (ADR-0001, ADR-0022) but not present
as files on this branch.

**Orchestration**: no Knowledge Hub task/decision for this domain has
been created or examined this session.
