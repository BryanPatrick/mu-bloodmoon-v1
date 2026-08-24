# Unified Account — Phase 3B implementation

Companion to `docs/game-data/unified-account.md` (the architecture) and
`docs/game-data/game-account-provisioning-contract.md` (the future
provisioning contract). This document covers what actually shipped this
phase, in `apps/api`. `GAME_WRITES_PERFORMED = 0` — nothing here ever
writes to MU SQL.

## What shipped

- `GameAccountIdentity` (Prisma model + migration
  `20260824120000_game_account_identity`) — the Portal-side mapping from
  `Account.id` to a future MU representation. See
  `docs/accounts/game-account-identity.md` for the full model/state
  machine.
- `GameAccountIdentityService` — idempotent creation, the state machine,
  and the single `isGameReady()` authority (Part G: `ACTIVE` *is*
  GAME_READY, no separate flag).
- A feature-flagged hook in `AuthService.register()`
  (`GAME_ACCOUNT_PROVISIONING_ON_REGISTER`, unset/false by default) that,
  when enabled, atomically creates `Account` + `GameAccountIdentity(PENDING)`
  via Prisma's nested-write — no separate transaction needed, same
  atomicity Prisma already gives the existing `AccountCurrency` seeding.
- `GET /launcher/me` and `GET /launcher/me/characters` — new routes on
  the *existing* Launcher module, additive to (never replacing) the
  pre-existing `GET /launcher/bootstrap` and `GET /launcher/account`.

## Activation plan (not yet activated)

`GAME_ACCOUNT_PROVISIONING_ON_REGISTER=true` must not be set in any real
environment until Phase 3C ships `CREATE_GAME_ACCOUNT` — turning the flag
on today would create `GameAccountIdentity` rows that can never leave
`PENDING` (no command exists to advance them), which is harmless but
pointless. The activation sequence, once Phase 3C exists:

1. Deploy Phase 3C's `CREATE_GAME_ACCOUNT` GameBridge command and its
   apps/api-side dispatcher (reads `PENDING` rows, calls
   `transitionToProvisioning`, issues the command, calls `markActive`/
   `markFailed` on the result).
2. Backfill: any `GameAccountIdentity` rows already `PENDING` from before
   the dispatcher existed become processable immediately.
3. Only then set `GAME_ACCOUNT_PROVISIONING_ON_REGISTER=true` in
   production — at that point every new registration provisions a real
   MU account within moments, with retry/reconciliation already covering
   the failure modes (`docs/game-data/game-account-provisioning-contract.md`
   Part F).

## Portal account cleanup (Part A-D)

Audited the real local Portal database (`bloodmoon_local`, the only
reachable one — `.env`'s configured `bloodmoon_portal`/port 53306 was not
running) before touching anything:

```
TOTAL_PORTAL_ACCOUNTS_BEFORE = 69
```

Every single account classified as `LEGACY_TEST_USER`/`TEST_PERSONA` —
100%, no exceptions. Evidence: usernames matched known e2e-fixture
patterns exactly (`e2e*`, `perm_*`, `gm_*_m`, `tp_*`, generic `admin`/
`player` seeds), all created in tight automated bursts (seconds apart,
matching e2e spec execution, not human registration), zero
`AccountCharacter` rows, zero `AccountModeration` rows, zero purchases/
recharges anywhere. This matches an already-known project gotcha
(`bloodmoon_local` accumulates state across e2e runs unless explicitly
reset — see the local-dev-environment memory note this project already
tracks).

No `REAL_USER`, no `ADMINISTRATIVE_ACCOUNT` requiring individual
preservation, and no `SYSTEM_ACCOUNT` existed — every admin-role account
found was itself a test-persona fixture, not an operator's real login.
Given this, the correct and safest action was a full, clean reset (the
project's own already-established `DROP DATABASE` + recreate +
`prisma migrate deploy` pattern), not a risky row-by-row selective
`DELETE` respecting FK order by hand.

**Backup taken first** (Part C): a sanitized JSON dump of `Account`,
`AccountSession`, `AccountPermission`, `AccountModeration`,
`AccountCharacter` — explicitly excluding `passwordHash`,
`personalIdHash`, `twoFactorSecret`, `twoFactorPending`. Stored at
`D:\MU\backups\bloodmoon-local-portal-cleanup-20260820\` — **outside
git**, per this project's established `D:\MU\backups\` convention (never
`references/`, which is for non-sensitive raw evidence only).

```
BACKUP_CREATED_AT       = 2026-08-24T11:27:04.624Z
BACKUP_SCOPE             = Account, AccountSession, AccountPermission,
                            AccountModeration, AccountCharacter
                            (sensitive fields excluded)
ROW_COUNTS               = accounts:69, sessions:96, permissions:16,
                            moderation:0, characters:0
SHA256                   = a876fb22f30093e19f15e730cb4973ddc97d91ddac4d5bc66e11e742d124ddea
RECOVERY_LOCATION        = D:\MU\backups\bloodmoon-local-portal-cleanup-20260820\portal-accounts-backup.json
```

**Verified after cleanup**:
- `NO_ORPHAN_ROWS` / `NO_BROKEN_FKS` — trivially true (full schema
  reset+reapply, not a partial delete).
- `ADMIN_ACCESS_REMAINS` / `TEST_INFRA_REMAINS_FUNCTIONAL` — proved, not
  assumed: `test/test-personas.e2e-spec.ts` (24 tests, including
  SUPER_ADMIN persona activation) re-run immediately after the reset,
  all passing.
- `MU_ACCOUNTS_MODIFIED = NO` — the reset only ever touched
  `bloodmoon_local` (Portal MySQL). `MEMB_INFO`/`AccountCharacter`
  (game-side)/`Character` were never connected to, let alone written —
  this whole phase's SQL access stayed at `GAME_WRITES_PERFORMED = 0`,
  same as every prior phase.

## Real production data

None of the above claims apply to the real cPanel-hosted production
Portal database — this workstation has no live connection to it (see
`project_bloodmoon_production_access` in this project's own memory).
This phase's cleanup was local-dev-only by construction, not by
deliberate scoping-down of a larger available action.
