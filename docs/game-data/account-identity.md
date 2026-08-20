# Account identity integrity — real SQL validation (2026-08-20)

Phase 2A.1. Full raw evidence, normalized facts, and derived comparison:
`references/game-data/sql-discovery/account-identity/`. All queries were
read-only aggregates/metadata against the real production `MuOnline`
database via the pre-existing `bm-sql` RemoteOps bridge —
`GAME_WRITES_PERFORMED = 0`. No username, password, email, or IP appears
anywhere in this document or its evidence trail.

## The confirmed chain

```
MEMB_INFO.memb_guid          -- real IDENTITY PK (seed 1, increment 1); STRONG stability
      |
MEMB_INFO.memb___id          -- login username, varchar(10); NOT DB-unique, but zero live duplicates today
      = AccountCharacter.Id  -- AccountCharacter's own real PK (confirmed: H1 6/6 matched, H2 0/6 rejected)
      -> GameID1..GameID10   -- 10 real character slots; zero orphans; zero cross-account duplication
      = Character.Name       -- Character's real PK
```

`Character.AccountID` (the direct legacy-code-style join) independently
agrees with the `AccountCharacter` slot-based chain for all 12 characters
in the live database — zero conflicts.

## Why `memb___id` is not unique, and why it doesn't matter today

No `UNIQUE`/`PRIMARY KEY` constraint exists on `MEMB_INFO.memb___id` at
the database level — this was already known from Phase 2A. This task
checked whether that absence has actually produced duplicate accounts:
**it has not.** All 6 live accounts have distinct usernames right now
(`DUPLICATED_USERNAME_VALUE_COUNT = 0`). The risk is structural (nothing
stops a *future* duplicate), not a current data-integrity problem.

## Is `memb_guid` stable enough to be canonical?

Yes, with strong (not absolute) confidence:

- **Real SQL Server IDENTITY column** — `IS_IDENTITY = True`, seed 1,
  increment 1. The database assigns it, not the application.
- **`create_account()`'s own INSERT column list never includes `memb_guid`**
  — the legacy web app never explicitly supplies a value for it, consistent
  with letting the IDENTITY property generate it.
- **Every reference to `memb_guid` across 51 legacy PHP files is a `WHERE`
  clause lookup** (`WHERE memb_guid = :id`) — none is a `SET` target. No
  write path to this column exists anywhere in the code reviewed.
- Not absolute: "no write path found in the code reviewed" is not a
  database-level guarantee against `SET IDENTITY_INSERT ON` plus a manual
  `UPDATE` by a privileged process outside the web app (e.g. a direct
  AdminCP DB tool, or the game server binaries themselves) — that
  possibility was not and cannot be ruled out by a read-only code/schema
  review alone.

`MEMB_GUID_STABILITY = STRONG`.

## AccountCharacter — authoritative, not just observed

`AccountCharacter` has 100% coverage: every one of the 6 `MEMB_INFO` rows
has exactly one `AccountCharacter` row (`Id` = `memb___id`), and every one
of the 12 `Character` rows appears in exactly one account's slot, with
zero cross-account duplication and zero orphaned slot values. Combined
with `AccountCharacter.Id` being a real, database-enforced PK (unlike
`MEMB_INFO.memb___id`), `AccountCharacter` is a genuinely authoritative
ownership map today — not merely "observed to work" but structurally
sound wherever it's been checked.

**Does `AccountCharacter` resolve the `memb___id` non-uniqueness risk?**
`PARTIAL`. Because `AccountCharacter.Id` has its own real PK, two
`AccountCharacter` rows can never share the same `Id` value — so a future
duplicate `memb___id` in `MEMB_INFO` could not produce two conflicting
character-ownership rows in `AccountCharacter`. But it also could not tell
you *which* of the two `MEMB_INFO.memb_guid`-identified accounts the
shared `AccountCharacter` row truly belongs to — the ambiguity would move,
not disappear. This is a theoretical scenario (zero duplicates exist
today), not a live problem.

## Recommendation (not an implementation)

**`MU_ACCOUNT_CANONICAL_ID = MEMB_INFO.memb_guid`** — Option A. It is the
only candidate that is both database-declared unique and has no observed
write path anywhere in the legacy code. `memb___id` (Option B) is
explicitly not recommended as the canonical identity — this document's own
evidence (no DB-level uniqueness) is exactly the risk
`docs/game-data/account-linking-contract.md` already flagged, now with
data confirming it hasn't manifested yet but structurally still could.

This is a recommendation for a future implementation phase, not a decision
made here — Account Linking itself remains out of scope for this task.

## Conceptual algorithm for a future `getCharactersForAccount(canonicalAccountId)`

Not implemented. Given `AccountCharacter`'s confirmed authoritative
coverage:

```
canonicalAccountId (memb_guid)
  -> resolve MEMB_INFO row (memb_guid is the real PK -- direct lookup)
  -> resolve MEMB_INFO.memb___id (the same row)
  -> resolve AccountCharacter WHERE Id = memb___id (AccountCharacter's own real PK)
  -> for each non-empty GameID1..GameID10: resolve Character WHERE Name = slot value
```

`Character.AccountID` matching is a valid independent cross-check (it
agreed 12/12 in this data) but `AccountCharacter` is the structurally
stronger source (real PK on the join column) and should be primary if/when
this is implemented.

## What's still unknown

- `memb_guid`'s absolute immutability is not database-provable from a
  read-only audit alone (see above).
- Whether this finding generalizes at real production scale — this server
  currently has only 6 accounts / 12 characters; behavior under load,
  concurrent registration races, or a larger population is unverified.
- Whether any process *other than* the legacy web app (the game server
  binaries, a different admin tool) ever writes to `MEMB_INFO` or
  `AccountCharacter` outside what this read-only audit could see.
