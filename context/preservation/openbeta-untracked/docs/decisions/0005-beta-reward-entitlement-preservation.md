---
status: ACTIVE
category: decisions
audience: internal (engineering + product)
lastVerified: 2026-08-31
---

# ADR-0005: Beta reward entitlement survives account deletion via hashed email, not account ID

**DATE**: 2026-08-31 (backfilled — original decision is Phase 13; see `schema.prisma`'s own header comment)
**STATUS**: ACTIVE

## CONTEXT

ADR-0004 establishes that Open Beta accounts and their progress are
deleted at the end of the Beta window. But a player who genuinely played
and earned real rewards during Beta should be able to receive those
rewards on their real, post-launch account — even though the specific
Beta-cycle `Account` row that earned them will no longer exist by the
time launch happens.

## DECISION

`BetaRewardEntitlement` (`schema.prisma:2275-2298`) is **deliberately
decoupled from `Account`** — its own header comment states this
explicitly: "survives Beta account deletion by design (a hashed,
normalized email is the durability anchor, not a live FK)."

The durable key is `normalizedEmailHash` — a SHA-256 hash of the
trimmed, lowercased email address
(`beta-lifecycle.service.ts:17-23`) — not `accountId`.
`originalAccountId` is stored but nullable, and kept "only as long as
legally/technically appropriate" (`schema.prisma:2283-2285`) — it is
provenance, not the durability mechanism.

At registration, `BetaLifecycleService.claimMyEntitlements()`
(`beta-lifecycle.service.ts:55-101`) lets the new account claim every
`ELIGIBLE` entitlement whose `normalizedEmailHash` matches its own email,
via an atomic `updateMany` gated on `status='ELIGIBLE'` — so a given
entitlement row can be claimed exactly once, race-safe.

The end-of-cycle deletion workflow (ADR-0004) treats a pending,
unclaimed entitlement snapshot as a **hard precondition**: it must exist
and be confirmed *before* the account it's tied to can be deleted
(`account-deletion-architecture.md:120-121`). `cleanupDryRun`
(`beta-lifecycle.service.ts:149-165`) reports `UNKNOWN_DEPENDENCY`
(not `WOULD_DELETE`) for any account with no existing entitlement
snapshot yet — the system refuses to treat "no snapshot" the same as
"nothing to preserve."

## WHY

A foreign key to `Account` would make entitlement preservation
structurally impossible once the account is deleted — the row would
either need `ON DELETE CASCADE` (destroying the entitlement along with
the account it's meant to survive) or `ON DELETE SET NULL` (which still
requires some other durable identifier to later match the player back
up, at which point you'd need the email-hash mechanism anyway). Using the
hashed email as the primary anchor from the start avoids ever needing a
live account relationship for the entitlement to remain valid and
claimable.

## ALTERNATIVES CONSIDERED

- **Foreign key to `Account` with `ON DELETE SET NULL`**: rejected — still
  requires a separate durable identifier for the later claim-matching
  step, making the FK relationship pure overhead; the hashed-email
  approach is simpler and was adopted directly instead.
- **Store the plaintext email on the entitlement row**: rejected in favor
  of a hash — avoids holding plaintext PII on a row that may persist
  across the account-deletion boundary specifically to survive deletion,
  which would otherwise undercut the privacy intent of deleting the
  original account in the first place.
- **Manual/ad-hoc reward re-grant at launch (no formal entitlement
  system)**: rejected — doesn't scale, isn't auditable, and provides no
  race-safe claim mechanism for the actual registration moment.

## CONSEQUENCES

- This pattern (durable hashed-email anchor, no live FK to `Account`) was
  reused directly for a different purpose: the `NORMAL_ACCOUNT_DELETION`
  tombstone's own hashed-email dedupe-check lookup explicitly "mirrors
  `BetaRewardEntitlement.normalizedEmailHash`'s already-established
  pattern" (`account-deletion-architecture.md:41`) — see ADR-0006.
- A player who changes their email between Beta and launch registration
  will not have their entitlement auto-claimed (the hash won't match) —
  this is an accepted, understood limitation of an email-anchored design,
  not an oversight; no alternate claim path is currently designed for
  that case.
- The Beta end-of-cycle deletion workflow cannot run ahead of entitlement
  snapshotting — this is enforced procedurally (the 12-step workflow),
  not by a database constraint, so the discipline is a documented
  requirement rather than something the schema itself makes impossible
  to get wrong.

## RELATED SYSTEMS

`apps/api/prisma/schema.prisma` (`BetaRewardEntitlement`),
`apps/api/src/modules/beta-lifecycle/beta-lifecycle.service.ts`,
`docs/accounts/account-deletion-architecture.md`, ADR-0004, ADR-0006.
