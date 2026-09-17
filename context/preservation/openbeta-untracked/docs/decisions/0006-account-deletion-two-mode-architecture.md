---
status: ACTIVE
category: decisions
audience: internal (engineering + security + product)
lastVerified: 2026-08-31
---

# ADR-0006: Account deletion has two distinct modes — anonymize (real players) vs. purge (pre-Beta only)

**DATE**: 2026-08-31 (backfilled — original design in `docs/accounts/account-deletion-architecture.md`, extended Phase 15)
**STATUS**: ACTIVE

## CONTEXT

`Account` has 16 `onDelete: Cascade` relations in the Prisma schema. A
raw `prisma.account.delete()` would silently cascade-destroy every one
of them — purchase history, legal/moderation records, everything. That's
unacceptable for a real player's financial/legal/moderation history, but
Blood Moon also needs a genuine, real, cascading delete for one specific
case: resetting disposable pre-Beta test/seed accounts between test
cycles.

## DECISION

Two distinct, differently-named, differently-scoped deletion modes exist,
and they are never conflated:

**`NORMAL_ACCOUNT_DELETION`** — for real, post-launch players. Never
issues a real SQL `DELETE` against the `Account` row. Instead it
anonymizes the row *in place*: username/name/email rewritten to a
`deleted-<accountId>` tombstone shape, secrets nulled, nothing logged
that would defeat the anonymization. This preserves the row so every
cascaded child record (purchases, legal history, moderation actions)
stays intact and attributable to a real (now-anonymous) account, rather
than disappearing. GDPR/LGPD-shaped: a hashed-email tombstone supports
future dedupe checks without holding plaintext PII, and retention
duration / IP-scrubbing questions are explicitly flagged
`LEGAL_REVIEW_REQUIRED`/`PRIVACY_REVIEW_REQUIRED` rather than guessed at
(`account-deletion-architecture.md:45-46`).

**`PRE_BETA_PURGE`** — the only mode allowed to use a real, cascading
delete, and only after confirming the account has no financial/legal
weight that a cascade would destroy. Restricted by a 4-point eligibility
check to disposable accounts: `accountPhase='PRE_BETA'`,
`role='PLAYER'`, and zero financial history, scoped to one explicitly
named `betaCycleId` (never inferred from a date range —
see ADR-0004).

GameServer-side, this maps 1:1 onto two GameBridge operations,
`ANONYMIZE_GAME_ACCOUNT`/`PURGE_GAME_ACCOUNT`, invoking
`dbo.bm_AnonymizeGameAccount`/`dbo.bm_PurgeGameAccount` (see ADR-0002 for
the SQL-side least-privilege/audit design of those procedures).

The two modes also produce differently-shaped audit records on the
Portal side: `AccountDeletionRecord` (per-user tombstone metadata,
`NORMAL_ACCOUNT_DELETION`) versus `PurgeBatchRecord` (batch-only, no
per-user tombstone, `PRE_BETA_PURGE`) — the architecture doc notes
explicitly: "conflating the two was the exact mistake the phase spec
called out to avoid."

**Phase 15 addendum**: the `PRE_BETA_PURGE` admin UI/endpoint was
narrowed to a distinct `admin.accounts.purge.manage` permission,
separate from `admin.accounts.status.manage` — fixing a real
pre-existing gap where any admin delegated ordinary account-status
management also implicitly got irreversible purge access as a side
effect.

## WHY

The two use cases have fundamentally incompatible correctness
requirements. Real players' data must be *preserved* (in anonymized
form) because their cascaded records have independent legal/financial
weight that must survive them leaving. Disposable pre-Beta test accounts
have no such weight and specifically need to be *fully removed* so
repeated test cycles don't accumulate stale rows. A single "delete
account" operation trying to serve both would either under-anonymize
real players (privacy risk) or under-purge test accounts (test-hygiene
risk) — or require a runtime branch so consequential it's clearer and
safer as two named, separately-scoped operations from the start.

## ALTERNATIVES CONSIDERED

- **One `DELETE_ACCOUNT` operation with a mode flag**: rejected — a
  single endpoint/permission covering both an irreversible real-player
  anonymization and an irreversible test-account purge is exactly the
  kind of design that invites the Phase 15 permission-overreach bug
  found and fixed (an admin granted one capability implicitly getting
  the other). Two named operations with two named permissions make the
  distinction impossible to blur by accident.
  <br>
- **Raw cascading delete for real players too, with manual data
  reconstruction if needed**: rejected outright — irreversible
  destruction of financial/legal/moderation history is not an acceptable
  risk for real player data under any circumstance this project
  considered.
- **Never truly delete pre-Beta accounts (anonymize them too)**:
  rejected — would leave an ever-growing set of anonymized-but-still-
  present test rows with no real reason to exist past the Beta cycle
  they were created for, unlike real players whose cascaded records have
  ongoing legal/financial relevance.

## CONSEQUENCES

- Any future account-related deletion need (e.g., a hypothetical future
  "delete my test character only" feature) must be evaluated against
  which of these two shapes it actually is — not treated as a third,
  ad-hoc case without first checking whether it fits an existing mode.
- The SQL-side least-privilege/audit design in ADR-0002 exists
  specifically to make these two GameServer-side operations
  independently verifiable — a direct consequence of how consequential
  both modes are.
- Retention duration for the anonymized tombstone, and whether IP/device
  data should also be scrubbed, remain open legal questions (see
  ADR-0007) — this ADR documents the deletion *mechanism*, not the final
  retention *duration* policy, which is explicitly not yet decided.

## RELATED SYSTEMS

`apps/api/src/modules/accounts/account-deletion.service.ts`,
`apps/api/src/modules/accounts/account-deletion-request.service.ts`,
`apps/web/pages/painel/admin/pre-beta-purge.vue`,
`docs/accounts/account-deletion-architecture.md`, ADR-0002, ADR-0004,
ADR-0007.
