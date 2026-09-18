---
status: ACTIVE
category: context-pack-domain
lastVerified: 2026-09-17
classification: PARTIAL
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

**Current implementation state (Phase 16, real code audit)**: real,
transactional escrow (`MarketplaceEscrow`) — not just a naming idea —
but GameBridge can never complete a job (`MU_BRIDGE_ENABLED=false`
everywhere; the executor is a deliberate hard-fail scaffold). Any
authenticated player can today debit real currency into an order that
can never auto-complete; the only recovery is via four dev-only bypass
endpoints the project's own docs already say must be removed before
production. E2e test depth is thin (one dedicated spec, testing route
safety not the buy/sell contract). A real, already-written Plan A
(homologate) vs. Plan B (safely disable) analysis exists:
`docs/handoff/beta-commerce-strategy.md`. Full current-state detail:
`docs/handoff/open-beta-readiness-audit-2026-09-17.md` §1 item 4, §9.

**Orchestration**: no Knowledge Hub task/decision for this domain has
been created or examined this session.
