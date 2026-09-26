---
status: ACTIVE
category: context-pack-domain
lastVerified: 2026-09-17
classification: STUB
---

# Domain: Marketplace

**Authoritative docs**: [`../../docs/marketplace.md`](../../docs/marketplace.md),
[`../../docs/marketplace-game-bridge.md`](../../docs/marketplace-game-bridge.md).
`docs/store/store-channel-boundaries.md` is referenced by
`docs/README.md`'s narrative but **does not exist on this branch**
(confirmed via `git ls-tree` — the entire `docs/store/` directory is
absent) — see [`../OPEN_QUESTIONS.md`](../OPEN_QUESTIONS.md) OQ-CTX-001.

**One-paragraph orientation**: player-to-player marketplace, distinct
from the Official Store, X-Shop, CashShop, and direct WC transfer — the
five economic channels are documented as never-to-be-confused
(`docs/README.md`'s Phase R narrative). A Marketplace purchase debits
the buyer and moves WC directly to the seller, which is why
`TRANSFER_RESTRICTION` was corrected to also block Marketplace purchases
(ADR-0022, preserved and read in full in Phase 11; the file is still
not integrated on `main`).

**Related decisions**: preserved ADR-0022 is verified historical
decision evidence, not a canonical file on `main`; see
[`../ADR_INDEX.md`](../ADR_INDEX.md).

**Orchestration**: no Knowledge Hub task/decision for this domain has
been created or examined this session.
