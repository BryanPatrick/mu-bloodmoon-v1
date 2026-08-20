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

## Update — real schema discovery findings (2026-08-20)

Item 1 above is now done — see `references/game-data/sql-discovery/live-20260820/`.
This section is analysis, not a decision (Account Linking implementation
stays out of scope).

**Candidate identifiers found, with a stability analysis:**

| Candidate | Unique (DB-enforced) | Likely stable | Case-sensitive | User-editable | Safe for linking |
|---|---|---|---|---|---|
| `MEMB_INFO.memb_guid` (`int`) | **YES** — the real declared PRIMARY KEY | Yes — no code path found that updates it; a surrogate identity key by construction | N/A (numeric) | No (no observed write path) | **MAYBE** — best candidate found, but its generation/assignment behavior (auto-increment? unique per registration?) is unconfirmed; needs a positive check, not just an absence-of-counter-evidence |
| `MEMB_INFO.memb___id` (`varchar(10)`, username) | **NO** — not DB-declared unique, only application-enforced | Usually, but admins can (per legacy code) update `MEMB_INFO` rows directly, and nothing at the DB layer prevents a duplicate | No (`Latin1_General_CI_AS`) | Unconfirmed — no observed rename path, but not ruled out either | **NO**, standing rule confirmed: this is exactly the "username equality" case this document already ruled unsafe, now with concrete evidence backing why (no DB-level uniqueness guarantee) |
| `Character.Name` (`varchar(10)`) | Yes — real PK | No — character names are commonly renameable in MU-family games (the legacy sweep's own `stored-procedures.md` found a `WZ_RenameCharacter.sql` script bundled with the server distribution, implying renaming is a supported operation) | No | **Likely YES** (a rename procedure exists in the vendor distribution) | **NO** — anchoring to a character name that can change breaks the link silently |

**Preliminary read, not a decision**: `memb_guid` is the most promising
anchor found (real PK, numeric, no observed mutation path), but "no
mutation path observed in the code reviewed" is not the same as "confirmed
immutable" — a future phase should positively verify how `memb_guid` is
assigned (identity column? sequence? vendor documentation?) before treating
it as final. `memb___id` (username) remains explicitly ruled out, now with
direct evidence (no database-level uniqueness) rather than just the
general "usernames are unsafe" caution this document already carried.

`ACCOUNT_CHARACTER_JOIN_TYPE = LOGICAL_APPLICATION_JOIN` (not a physical
FK) means any future linking design must account for the possibility of an
orphaned `Character.AccountID` — the database itself does nothing to
prevent it.

## Update — account identity integrity validation (Phase 2A.1, 2026-08-20)

Full analysis: `docs/game-data/account-identity.md`. Summary: `memb_guid`
is confirmed a real SQL Server IDENTITY column (database-generated, no
write path found anywhere in 51 legacy PHP files that reference it), and
is the recommended canonical MU account identity — **Option A** in that
document's decision-support analysis, not `memb___id` (Option B, rejected
for the reason already stated in this file: no database-level uniqueness).
Zero live username duplicates, zero character-ownership conflicts, and
100% `AccountCharacter` coverage were found at the current, small
production scale (6 accounts, 12 characters) — this is a recommendation
for a future implementation phase, not a decision made here. Account
Linking implementation remains out of scope.
