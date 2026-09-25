---
status: ACTIVE
category: context-pack-domain
lastVerified: 2026-09-17
classification: PARTIAL
---

# Domain: VIP

**Authoritative docs**: `docs/vip/` (not on `main` yet; see [`../MAIN_INTEGRATION.md`](../MAIN_INTEGRATION.md)), notably
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

**Commercial tier state (Phase 14, current, dated decision — not older
repository evidence)**: commercial VIP progression is `Free` / `Silver`
/ `Gold`. `BRONZE_COMMERCIAL_ENABLED = false`. The Bronze technical
enum/schema (`BRONZE` in the Portal's own Prisma `VipTier`, per
preserved ADR-0010) is **not** removed or altered by this decision —
it may remain dormant for compatibility/historical reasons. See
[`../DECISIONS.md`](../DECISIONS.md) `DEC-VIP-001`. Note the real
tension this creates with preserved ADR-0010 (which still describes
Bronze as one of the four *active* Portal tiers, alongside Free/Silver/
Gold) — that ADR is not edited or contradicted-in-place; it remains
the accurate historical record of what was true when it was written,
and `DEC-VIP-001` is the current, later ruling.

**Related decisions**: ADR-0001 and ADR-0022 were read from the
preservation archive in Phase 11; their files are not integrated on
`main`. `DEC-VIP-001` (2026-09-17) is this pack's own first genuinely
new decision record — see `DECISIONS.md`.

**Orchestration**: no Knowledge Hub task/decision for this domain has
been created or examined this session.
