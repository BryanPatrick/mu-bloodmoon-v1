---
status: ACTIVE
category: context-pack-domain
lastVerified: 2026-09-17
classification: STUB
---

# Domain: VIP

**Authoritative docs**: [`../../docs/vip/`](../../docs/vip/), notably
`vip-end-to-end-data-flow.md` and `wz-setaccountlevel-coexistence.md`
per `docs/README.md`'s narrative (not independently re-verified this
session).

**One-paragraph orientation**: Portal is the source of truth for VIP
entitlement (per preserved ADR-0001, read in Phase 11 — its file is
still not present on `main`, see
[`../OPEN_QUESTIONS.md`](../OPEN_QUESTIONS.md) OQ-CTX-001). VIP tier
change while active: same tier always extends normally; a different
tier is blocked until the current one expires (reverses an earlier
"last tier wins" behavior that could destroy prepaid value) — per
`docs/README.md`'s Phase Q narrative.

**Related decisions**: ADR-0001 and ADR-0022 were read from the
preservation archive in Phase 11; their files are not integrated on
`main`.

**Orchestration**: no Knowledge Hub task/decision for this domain has
been created or examined this session.
