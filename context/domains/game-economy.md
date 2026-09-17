---
status: ACTIVE
category: context-pack-domain
lastVerified: 2026-09-17
---

# Domain: Game economy

**Authoritative docs**: [`../../docs/economy/`](../../docs/economy/),
[`../../docs/progression/`](../../docs/progression/),
[`../../docs/drop/`](../../docs/drop/),
[`../../docs/decisions/0029-progression-reset-policy-current-ruling.md`](../../docs/decisions/0029-progression-reset-policy-current-ruling.md).
`docs/gameserver/database/` is referenced by `docs/README.md`'s
narrative but **does not exist on this branch** (confirmed via
`git ls-tree`) — see [`../OPEN_QUESTIONS.md`](../OPEN_QUESTIONS.md)
OQ-CTX-001.

**One-paragraph orientation**: covers WCoin/GP/HP currency, X-Shop/
CashShop catalog, and progression (XP/drop/reset/master reset). The
real XP-stacking formula remains genuinely `UNKNOWN` after real
investigation (not for lack of effort) — never state a combined XP
percentage without checking `docs/progression/xp-stacking-investigation.md`
first. Reset cap is 20 for all VIP tiers (ADR-0029, confirmed, no
exception). A real production drop-rate drift (OR-023 in
`docs/README.md`'s narrative) was investigated but not fixed as of the
last update this pack read — verify current state before assuming it's
resolved.

**Related decisions**: ADR-0029 (present, read this session).
ADR-0025/0026/0028 present but only listed by filename this session, not
read — see [`../SOURCE_INDEX.md`](../SOURCE_INDEX.md) honesty note.

**Orchestration**: no Knowledge Hub task/decision for this domain has
been created or examined this session.
