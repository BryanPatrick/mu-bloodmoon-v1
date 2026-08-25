# Two-factor encryption key rotation (security hardening)

## Why this exists

`TWO_FACTOR_ENCRYPTION_KEY` had no versioning at all before this work: one
env var, hashed with SHA-256 into the AES-256-GCM key, used for every
`Account.twoFactorSecret`/`twoFactorPending` value ever encrypted. Rotating
it would have instantly broken decryption for every existing 2FA-enabled
account (mass lockout) -- so it never was rotated, even after the
2026-08-24 incident where it (along with four other secrets) was briefly
visible in a tool result during Phase 3D-B production work. This is the
fix: a real, safe rotation path, with backward-compatible reads and a
migration tool.

## Design

`apps/api/src/modules/auth/two-factor.service.ts`. Storage format is
self-describing: `v{N}.iv.tag.ciphertext` (base64url parts) for anything
encrypted under this scheme. A pre-existing 3-part value with no version
prefix (`iv.tag.ciphertext`) is unambiguously "from before versioning
existed" and is treated as `v1` -- **no schema migration was needed**;
every row already announces its own version by its shape.

- `v1`'s key source is still exactly `TWO_FACTOR_ENCRYPTION_KEY` (or its
  historical `JWT_REFRESH_SECRET`/dev fallbacks) -- untouched. Introducing
  this keyring required zero knowledge of the current production key and
  cannot by itself invalidate a single existing record.
- A new version's key source lives in `TWO_FACTOR_ENCRYPTION_KEY_{VERSION}`
  (e.g. `TWO_FACTOR_ENCRYPTION_KEY_V2`) -- a brand-new secret, generated
  fresh, never derived from or requiring the old one.
- `TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION` selects which version
  `encrypt()` uses for new writes. Defaults to `v1` (today's unchanged
  behavior) until explicitly advanced.
- `decrypt()` accepts either shape and picks the matching key. `v1` and
  `v2` (and beyond) are all readable simultaneously; only the *active*
  version is ever written.

## Rollout sequence (Part E-M)

1. **Generate `TWO_FACTOR_ENCRYPTION_KEY_V2`** -- a fresh, high-entropy
   random string, generated locally, stored only via the approved secret
   store, never printed. Set alongside (not replacing) the existing
   `TWO_FACTOR_ENCRYPTION_KEY`.
2. **Deploy code** with `TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION` still
   unset/`v1` first -- proves the new code path is byte-compatible with
   every existing record before anything changes.
3. **Set `TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION=v2`** -- new 2FA
   setups and any write to an existing record start using `v2`; every
   existing `v1` record remains fully readable.
4. **Dry run** (`apps/api/src/migrate-two-factor-keys.ts --dry-run`) --
   decrypts every `v1` record with the old key and re-encrypts in memory
   with the new key (proving both work end-to-end for every real row)
   without writing anything. Reports counts only, never secret values.
5. **Real run** (same script, no `--dry-run`) -- persists the re-encryption
   for every account still on `v1`. Resumable/idempotent by construction:
   it re-queries for "not yet on the active version" on every batch, so an
   interrupted run, or simply running it again to confirm nothing is left,
   is always safe.
6. **Verify** -- every migrated row's `keyVersionOf()` is `v2` and
   decrypts correctly under `v2` alone.
7. **Real 2FA login smoke test** -- confirm a real login requiring 2FA
   still succeeds post-migration.
8. **Only then**, consider retiring `v1`'s key material from the
   deployed environment (Part M) -- and only after confirming zero `v1`
   records remain (`SELECT COUNT(*) FROM Account WHERE twoFactorSecret IS
   NOT NULL` cross-referenced against `keyVersionOf()`, not a raw SQL
   `LIKE`, since the version lives in the ciphertext string's own prefix).

## A real bug this design's test suite caught before production

An earlier version of the migration's real-run loop re-queried "rows not
yet on the active version" as its sole means of making forward progress.
A row that fails to decrypt/re-encrypt (wrong key, corrupted ciphertext)
never leaves that "not yet migrated" set -- so the naive loop fetched the
exact same failing row forever, making zero progress on anything after it
in table order. This was caught by
`apps/api/test/two-factor-key-migration.e2e-spec.ts` against a real
database with stray undecryptable test rows already present (not a
synthetic edge case) before it was ever considered for production. Fixed
by switching the real-run pass to the same id-based cursor pagination the
dry-run pass already used, so every candidate row is visited at most once
per invocation regardless of outcome, while remaining fully resumable
across separate invocations (a fresh run legitimately retries whatever is
still pending, including previously-failed rows).

## Rollback

At every step through Part L, `v1` remains fully configured and
readable. If `v2` verification fails for any reason, the fix is simply to
leave `TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION` unset/`v1` (or set it
back) -- no user is ever stranded, since nothing about this design ever
makes `v1` unreadable except a deliberate, later, evidence-gated decision
to remove `TWO_FACTOR_ENCRYPTION_KEY_V2`'s sibling variable... which this
document explicitly says never remove `TWO_FACTOR_ENCRYPTION_KEY` itself
without first confirming zero `v1` records remain.

## Status as of this document

Code, tests (16/16 passing, including the keyring's v1/v2/wrong-key/tamper
cases and the migration's dry-run/resume/partial-failure/idempotency
cases), and this rollout plan are complete and verified locally against
`bloodmoon_local_claude`. Production rollout (Parts 1-3 above) has **not**
been performed -- it requires generating and entering a new secret into
the production environment, which needs a human to type it (the same
absolute boundary that applies to every other credential-entry action in
this project), plus a code deploy. `TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION`
remains unset (`v1`, unchanged) in production as of this writing.
