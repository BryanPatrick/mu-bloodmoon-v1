# GAME_PASSWORD_SCHEME determination — 2026-08-20

## Finding

**`GAME_PASSWORD_SCHEME = CONFIRMED: plaintext.`**

This is the single most consequential technical finding of Phase 3A —
it directly rules out "same password, reused as the MU credential" as a
design option (`docs/game-data/unified-account.md`'s Password strategy
section, Option A) and forces the Unified Account provisioning model
toward a generated, firewalled, MU-only credential (Option B) or,
preferably, a client-auth model that avoids a player-facing game password
entirely (Option C).

## How it was reached, without ever reading a password

Three independent lines of evidence converge:

1. **Structural**: `MEMB_INFO.memb__pwd` is `varchar(10)` — too short for
   any standard hash output.
2. **Real data, safely queried**: `LEN(memb__pwd)` (never the value)
   grouped by count, across all 6 real live accounts, returned **3, 6,
   and 10** — a non-uniform distribution. Every standard hash function
   produces a *fixed* output length; only real, human-typed plaintext of
   varying length produces this shape.
3. **Real legacy code**: the vendor CMS's own `login_user()` function,
   read from the preserved raw source archive (never touched
   `constants.php`, which is separately flagged as containing live
   credentials), compares `memb__pwd` directly against the submitted
   password with no hashing in its default configuration. The two
   alternate, hash-based code paths are independently ruled out: one
   depends on a stored procedure already confirmed absent from the live
   server (Phase 2A); the other's fixed 32-character output cannot
   physically fit the observed data.

No password value, hash, or the live `MD5` PHP config constant (which
lives in the flagged `constants.php`) was ever read to reach this
conclusion — the finding is derived entirely from schema metadata,
aggregate length counts, and already-preserved, already-reviewed legacy
application code.

## Consequence

See `docs/game-data/unified-account.md` and
`docs/game-data/game-account-provisioning-contract.md` for the full
design implications. In short: the Portal's modern `passwordHash`
(bcrypt, cost 12) must remain completely isolated from whatever MU-side
credential representation a future phase implements — never derived from
it, never able to reveal it, never weakened to match it.
