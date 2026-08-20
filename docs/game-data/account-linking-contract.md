# Account linking — contract preparation only (not implemented)

Documentation only. No code in this phase creates, imports, links or
unlinks a Portal Account to a real MU account or character. This is
deliberate — the schema evidence needed to do it safely does not exist yet
(see `docs/game-data/schema/join-keys-unknown.md`).

## Current state (confirmed by the Global Portal Audit, re-confirmed this
session)

- No field on `Account` or `AccountCharacter` references any external MU
  identifier.
- `AccountCharacter.key` is a locally-generated slug, not a real link to
  anything in the game database.
- Zero endpoints exist to create/import/link/unlink a character.

## What would be needed before real linking is safe

1. A real, read-only schema discovery pass confirming the actual identity
   columns on `Character` (and, if it exists as a separate concept, an
   `Account` table on the game side) — see `join-keys-unknown.md`.
2. A join key that is genuinely stable and unique on the game side. **Never
   username equality.** Usernames on the portal side and the game side are
   different systems with different histories, collision risk, and no
   verified relationship — treating them as the same identifier would
   silently link the wrong accounts.
3. A decision on directionality and conflict handling: what happens if a
   game-side identifier already appears linked to a different portal
   account, what happens on a portal account merge/rename, and whether
   linking is admin-initiated, player-initiated with verification, or both.
4. A real product decision on what UI/flow initiates linking — not decided
   here, and not part of Phase 1's "do not implement yet" list being
   revisited casually.

## Explicitly not decided by this document

Which column ultimately serves as the join key. That is schema discovery's
job, not architecture's. This document exists so a future phase starts from
"here is what's missing and why username is unsafe," not from a guess.
