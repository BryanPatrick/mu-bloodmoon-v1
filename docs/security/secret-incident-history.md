# Secret incident history

Preserved factually. Never rewritten to look better or worse than what
actually happened. See [[project memory]] for the session-level record;
this file is the durable, repo-tracked counterpart.

## Phase 3C (Safe CREATE_GAME_ACCOUNT)

`SENSITIVE_DATA_LEAKED = YES, REMEDIATED`. `ACTIVE_CREDENTIAL_EXPOSED = NO`.
Full detail lives in the Phase 3C documentation set
(`docs/game-data/game-account-provisioning-contract.md` and the
`references/game-data/sql-discovery/phase-3c-*` evidence trail).

## Phase 3D-B (Production Activation)

During production `cPanel Setup Node.js App` environment-variable review,
a full-page text extraction of that screen (rather than a targeted,
cropped read) pulled every existing production secret's **value** into a
tool result -- `DATABASE_URL`'s password, `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET`, `SMTP_PASSWORD`, `TWO_FACTOR_ENCRYPTION_KEY`, and
`TURNSTILE_SECRET_KEY` all appeared in plaintext. This was flagged
immediately and transparently at the time it happened, not discovered
later.

Codex (the session that took over Phase 3D-B production activation after
this incident was flagged) subsequently reported rotating:

- `DATABASE_URL` credential
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- SMTP secret
- Turnstile secret

and deliberately **deferring** `TWO_FACTOR_ENCRYPTION_KEY`, because no safe
versioning/rotation path existed for it yet -- rotating it blind would
have broken 2FA for every existing enabled account. That gap is exactly
what `docs/security/two-factor-key-rotation.md` (this same hardening
phase) exists to close.

At Phase 3D-B report time: `ACTIVE_EXPOSED_SECRET_REMAINING = YES`, due to
the deferred `TWO_FACTOR_ENCRYPTION_KEY` and a temporary Turnstile
provider overlap window (Cloudflare Turnstile keeps a rotated secret
briefly valid during rollover).

### What this hardening phase independently verified vs. what it did not

This session (Claude) did not witness the rotation actions directly --
Codex performed them in a separate session. Before doing any further
security work, this phase performed a reconciliation pass rather than
either blindly trusting or blindly rejecting Codex's report:

- **Independently verified** (multiple, separate, live systems): the
  Phase 3D-B code is genuinely deployed (`GET /api/admin/game-provisioning`
  returns 401, not 404), a real QA registration reached `memb_guid=9` in
  production MU SQL with the exact `AccountCharacter` row and zero
  unexpected mutations (verified via the read-only `bm-sql` bridge),
  Cloudflare Queue/D1 are healthy with zero stuck commands, and the
  GameBridge Agent's heartbeat was live at verification time.
- **Not independently verified** (no safe way to check without either
  re-reading a current secret value or reusing the already-leaked old
  one, both declined on principle): the specific claim that
  `DATABASE_URL`/`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`/SMTP/Turnstile
  were actually rotated. Recorded as `CODEX_REPORTED,
  CLAUDE_UNVERIFIED` rather than either accepted or contradicted --
  nothing found during reconciliation contradicts the claim.
- **Deliberately not retested**: the old, already-leaked Turnstile secret
  was not resubmitted to Cloudflare's verification endpoint to "prove" it
  no longer works. Reusing an already-exposed secret for any purpose,
  including a well-intentioned verification, was judged not worth the
  marginal proof it would add. `OLD_TURNSTILE_SECRET_ACTIVE =
  NOT_RETESTED_FOR_SAFETY`.

## Parallel local DB reset incident (2026-08-24)

Recorded factually, separate from the two secret-exposure incidents
above -- this was a destructive *action* (`prisma migrate reset` against
the shared `bloodmoon_local` while a concurrent session was using it), not
a secret leak. See `docs/operations/local-test-database-isolation.md` for
the full account and the fix (a dedicated `bloodmoon_local_claude`
database per session going forward). Not reclassified as a secret
incident just because it happened in the same broader work window --
these are two different kinds of incidents and are kept distinct here on
purpose.

## Historical record integrity

This document is deliberately never rewritten to make an earlier phase
look cleaner in hindsight. A phase that is clean now does not erase or
soften an earlier phase's real incident.
