---
status: ACTIVE
category: context-pack-domain
lastVerified: 2026-09-17
classification: POPULATED
---

# Domain: Game economy

**STATUS**: hardened Phase 11 with 21 newly-read ADRs plus the
preserved `open-questions.md`/`open-risks.md` (both read in full) as
supporting sources — real, verified content, not `docs/README.md`
narrative alone anymore.

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

**Related decisions**: ADR-0029 (present on `main`, read Phase 9).
ADR-0025/0026/0028 present on `main` but not read directly. **21 more
ADRs read in full Phase 11** (preserved from `mu-bloodmoon-v1-openbeta`)
— see [`../ADR_INDEX.md`](../ADR_INDEX.md), several of which are
economy-domain: ADR-0008/0009/0011/0012/0016/0020 among others.
Notably **ADR-0016 is the real RMT policy**: no official Blood Moon
marketplace; player-to-player RMT is allowed, unmediated; account sale
is an allowed direction with real safeguards still undesigned (see the
preserved `open-questions.md`'s OQ-017). This closes what Phase 10 had
only located but not read (`OPEN_QUESTIONS.md` OQ-CTX-003).

**A production drop-rate drift, more precisely characterized than
Phase 9 had it** (from the preserved `open-risks.md`'s OR-023, read in
full Phase 11): 224 of 545 monsters were set to a `999999999` sentinel
`ItemRate` between an unlogged July-Aug17 window; 10 named bosses were
later reverted to normal by Sept 3, leaving **214 monsters still at the
sentinel today** as of that document's own last verification
(2026-09-04). Forensics are complete (ADR-0027); remediation was not
decided as of that date — genuinely `UNKNOWN` whether it has been
since.

**Orchestration**: no Knowledge Hub task/decision for this domain has
been created or examined this session.
