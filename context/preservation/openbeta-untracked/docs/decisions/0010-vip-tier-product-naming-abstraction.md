---
status: ACTIVE
category: decisions
audience: internal (engineering + product)
lastVerified: 2026-08-31
---

# ADR-0010: Bronze/Silver/Gold are Portal product concepts, AL1/AL2/AL3 is an internal GameServer detail

**DATE**: 2026-08-31 (backfilled — approved by Bryan, `docs/vip/vip-benefit-decisions.md`, `lastVerified: 2026-08-30`)
**STATUS**: ACTIVE

## CONTEXT

The native GameServer only understands `MEMB_INFO.AccountLevel` as an
integer (0-3, see ADR-0001/ADR-0002 for the full technical mechanism).
Product/marketing needs real, memorable tier names for VIP — "AL2" means
nothing to a player deciding whether to buy VIP.

## DECISION

`docs/vip/vip-benefit-decisions.md:12-14`: Bryan approved
**AL0=Free / AL1=Bronze / AL2=Silver / AL3=Gold** as the *technical*
mapping, but explicitly requires the Portal to treat Bronze/Silver/Gold
as its **own product concepts**, with the GameServer's AL0-3 numbering
as an internal implementation detail only. Concretely: `VipTier`
(`BRONZE`/`SILVER`/`GOLD`) is the Portal's own Prisma enum, entirely
separate from the GameServer's `AccountLevel` field — the Portal never
surfaces "AL1" to a player or in product copy, and the GameServer never
needs to know the tier is called "Bronze."

## WHY

Keeping the player-facing tier identity (Bronze/Silver/Gold) decoupled
from the GameServer's internal numeric representation (AL1/AL2/AL3)
means the two can evolve independently: a future rename, reordering, or
even a tier split at the product level would not require touching the
native GameServer's `AccountLevel` semantics at all, and vice versa — a
future GameServer-side numbering change (unlikely, but the native schema
is not under this project's control) would not force a rebrand.

## ALTERNATIVES CONSIDERED

- **Expose "AL1/AL2/AL3" directly as product-facing tier names**:
  rejected — meaningless to a player, and would tightly couple product
  copy to an internal engine implementation detail.
- **A single shared enum used both by the Portal and as the literal
  GameServer terminology**: rejected — this is exactly the coupling
  ADR-0001 already rejects for VIP source-of-truth reasons; the same
  "GameServer is a projection, not the truth" principle applies to
  naming as much as to state.

## CONSEQUENCES

- Any Portal code, UI copy, or admin tooling referring to VIP tiers must
  use `BRONZE`/`SILVER`/`GOLD` — a reference to "AL1" in product-facing
  context is a bug, not a shorthand.
- The mapping table (AL0=Free/AL1=Bronze/AL2=Silver/AL3=Gold) itself is
  fixed and must not silently drift — if it ever needs to change (e.g. a
  4th tier), that is a new decision requiring its own review, not an
  incidental code change.

## RELATED SYSTEMS

`docs/vip/vip-benefit-decisions.md`, `apps/api/prisma/schema.prisma`
(`VipTier` enum), ADR-0001, ADR-0002.
