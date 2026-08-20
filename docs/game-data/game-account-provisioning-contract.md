# Game Account Provisioning — contract (Phase 3A)

Architecture only. No table, migration, endpoint, UI, or GameBridge
command is created by this document. `GAME_WRITES_PERFORMED = 0`
throughout. Companion to `docs/game-data/unified-account.md`, which
defines the identity model this document's flows operate on.

## Current registration/login, as it actually works today

Real evidence (`apps/api/src/modules/auth/auth.service.ts`), not
assumption — this is the foundation the provisioning flow extends, not
replaces:

- `register()`: validates `username` (3–20 chars, `^[a-z0-9_-]+$`),
  `password` (8–72 chars), `email` (basic format check), rejects on
  existing `username`/`email` collision, creates `Account` with
  `role: PLAYER`, **`status: 'ACTIVE'` immediately** (no email-verification
  gate currently wired, despite `PENDING` existing as the schema default),
  `passwordHash` via `bcrypt` cost 12, seeds three `AccountCurrency` rows.
  Emits `auth.account.registered`. Returns the account, issues no token —
  the caller calls `login()` separately.
- `login()`: accepts username-or-email, requires `status === 'ACTIVE'`,
  `bcrypt.compare`, optional TOTP/recovery-code step for
  `twoFactorEnabled` accounts, revokes all prior `AccountSession` rows for
  the account (single-active-session model), issues a new session +
  access/refresh token pair. Emits `auth.session.started`.
- Access token claims (exact): `{ sub, username, role, sessionVersion, sid }`.
  No permissions, no email, no game identity — a thin pointer, permissions
  and (in the future) game identity are resolved server-side per request.

**Design implication**: `CREATE_GAME_ACCOUNT` provisioning attaches
*after* `register()` succeeds, never inside the same request/transaction
as it (see Part F). The JWT shape above needs no new claim for game
identity — resolving `Account.id → gameIdentity` server-side, on demand,
matches how permissions already work today (never embedded in the token,
always resolved fresh).

## Registration flow (conceptual)

```
Website
  → POST /auth/register (existing, unchanged)
     → Account created, status=ACTIVE, role=PLAYER   [already true today]
  → (new) game account provisioning is requested
     → a GameAccountIdentity row created, status=PENDING
     → a provisioning request queued/dispatched (idempotent, see Part F)
  → GameBridge Agent executes CREATE_GAME_ACCOUNT (future phase, not this one)
     → MU account created, memb_guid returned
  → GameAccountIdentity updated: membGuid persisted, status=ACTIVE
  → Account is GAME_READY
```

Provisioning states (naming chosen to match this project's existing
conventions — `PascalCase` enum members, matching `AccountStatus`/`Role`
style, not adopted from the request's own example names uncritically):

```
GameProvisioningStatus:
  PENDING              -- requested, not yet dispatched to GameBridge
  DISPATCHED           -- sent to GameBridge, awaiting result
  ACTIVE               -- membGuid confirmed, character-ready
  FAILED                -- GameBridge reported a real failure (not a timeout)
  RECONCILING           -- result unknown (timeout/lost response), reconciliation in progress
  SUSPENDED             -- game-side access disabled without discarding the mapping (distinct
                           from Account.status=BLOCKED -- see unified-account.md's Account status
                           section on why these must not be conflated)
```

This is a **separate state field from `Account.status`**, living on the
`GameAccountIdentity` mapping (Part S), not on `Account` itself — a Blood
Moon Account can be fully `ACTIVE` (can browse the site, use the
community, manage 2FA) while its game identity is still `PENDING`/
`RECONCILING`. Conflating the two would mean a slow or retried game
provisioning could lock a player out of the Portal entirely, which is not
acceptable.

`PROVISIONING_FAILED` (named `FAILED` above, matching this project's
existing short enum-member style) is a **real, surfaced, actionable
state** — never silently retried forever, never hidden from the player as
a generic error. A player whose provisioning failed should see something
like "your account is ready, game access is still being set up" with a
real support path, not a dead end.

## Part F — distributed transaction safety

The Portal `Account` row and the MU `MEMB_INFO` row are created in two
different systems (MySQL via Prisma; SQL Server via GameBridge) with no
shared transaction possible. Two failure modes must be designed for
explicitly, not hoped away:

**Portal account created, MU creation fails.** The `GameAccountIdentity`
row stays `PENDING`/moves to `FAILED`. The Blood Moon Account is not
rolled back — the player's registration succeeded and should not be
punished for an infrastructure failure on the game side. Retry is
possible (see idempotency below) and, if retries are exhausted, the
`FAILED` state routes to a support/admin-assisted path (not implemented
here).

**MU account created, but the success response is lost** (network
failure, GameBridge crash after the SQL write, Worker/D1 hiccup). This is
the more dangerous case: a naive retry would create a *second* MU account
for the same Blood Moon Account. Required properties:

- **Idempotency**: every provisioning attempt carries a stable
  `provisioningRequestId` (generated once, at the moment provisioning is
  first requested — not regenerated on retry). `CREATE_GAME_ACCOUNT`'s
  real future implementation must be safe to receive the same
  `provisioningRequestId` twice and produce the same result both times,
  never a second MU account.
- **Retry**: bounded, backed off, and only for the `RECONCILING`/timeout
  case — never an automatic retry after a real `FAILED` result (a real
  failure, e.g. a validation rejection, retrying identically will fail
  identically).
- **Reconciliation**: a periodic, safe, read-only process that checks
  `RECONCILING` rows against the real GameBridge/SQL state (does a
  `MEMB_INFO` row matching this request's generated `legacyLogin` already
  exist? — a read-only check, using the same read-only discipline already
  proven in Phase 2B/2C) and resolves them to `ACTIVE`/`FAILED` rather
  than leaving them stuck.
- **Audit**: every state transition is recorded (Part Y), so "what
  actually happened to this provisioning request" is always answerable
  without guessing.
- **Unique provisioning request ID**: the mechanism idempotency and
  reconciliation both key off of — never re-derived from mutable data
  (never, for example, `Account.email`, which a player might later
  change).

**Never**: "create in both, hope it works." That is exactly the failure
mode this Part exists to rule out.

## Part G — `CREATE_GAME_ACCOUNT` command contract (conceptual)

```
CREATE_GAME_ACCOUNT
{
  commandId: <uuid, unique per attempt>
  idempotencyKey: <provisioningRequestId, stable across retries>
  canonicalBloodMoonAccountId: <Account.id>
  legacyGameLogin: <generated, <=10 chars, never derived from a
                     player-chosen unconstrained username>
  credentialRepresentation: <opaque, see Part H/I -- never the player's
                              real password, never passed as plain
                              request-body text if avoidable; see Part X
                              for transport>
  metadata:
  {
    requestedAt: <timestamp>
  }
}
```

**Never sent to GameBridge**: Portal `role`, `twoFactorSecret`/2FA state,
`sessionVersion`/session tokens, `personalIdHash`, email, or any other
Portal-side field not strictly required to create the `MEMB_INFO` row.
GameBridge's job is "make a minimal, valid MU account exist," not "know
who this player is on the Portal." This mirrors the read path's own
established discipline (`memb___id` never leaving the read boundary,
Phase 2B Part K) applied to the write direction.

The password/credential field is deliberately the least-specified part of
this contract — see Part H/I below for why, and why finalizing its exact
shape is explicitly not done in this phase.

## Part H — how the real MU Server authenticates today

```
GAME_PASSWORD_SCHEME = CONFIRMED: plaintext
```

Full evidence and reasoning is in `unified-account.md`'s "Password / auth
strategy" section — summarized here for the provisioning contract's own
use: `MEMB_INFO.memb__pwd` is `varchar(10)`; a safe, aggregate,
length-only real-data query (never the password value itself) returned
non-uniform lengths (3, 6, 10) across the 6 real live accounts, which is
the fingerprint of real plaintext passwords, not any hash (hashes are
fixed-length); and the legacy web app's own `login_user()` code
(`LEGACY_CODE_CONFIRMED`) compares `memb__pwd` directly against the
submitted password unhashed in its default configuration, with the two
alternate hashed-comparison code paths structurally ruled out (one
requires a stored procedure confirmed absent from the live server, the
other's 32-character MD5 hex output cannot fit the observed lengths at
all).

This is a **critical blocker**, correctly named as such in this phase's
own instructions, for exactly the reason Part I exists: nothing about
Unified Registration can be built on the assumption that MU can safely
receive or store a real modern credential.

## Part I — password strategy decision

Full options table is in `unified-account.md`. Restated for the
provisioning contract's own scope: **Option C (Launcher/session-based
game start, no player-facing game password) is the target design**;
**Option B (a generated, non-reused, rotatable game credential, held only
where provisioning needs it)** is the realistic contract this document
plans for, since Option C's feasibility depends on
`GAME_CLIENT_SSO_POSSIBLE`, currently `REQUIRES_CLIENT_MODIFICATION`
(`unified-account.md`).

**Option A (reusing the player's real password as the literal MU
credential) is rejected outright** — not a close call. The confirmed
plaintext scheme means "reusing the real password" is equivalent to
storing the player's real modern-account password in cleartext in a
second system, which is a straightforward, serious security regression
regardless of how convenient it would be. **The modern side is never
weakened to accommodate the MU side** — if a future phase concludes MU
genuinely requires a plaintext-comparable value, that value is a
generated, MU-scoped-only, independently-rotatable secret, architecturally
firewalled from `Account.passwordHash` in both directions (never derived
from it, never able to reveal or influence it).

## Part K/L — Launcher and game-client auth

Covered in full in `unified-account.md` ("Launcher and game-client auth").
Restated for this document's write-boundary purposes only: the Launcher
is a **consumer** of `CREATE_GAME_ACCOUNT`'s eventual result (it needs to
know provisioning succeeded and, if Option B's generated credential is
the interim reality, needs a safe way to obtain it for the one moment it
starts `main.exe`) — the Launcher itself never constructs, stores
long-term, or lets the player type/see a `legacyGameLogin`/game-credential
pair as "your MU account." `GAME_CLIENT_SSO_POSSIBLE` stays
`REQUIRES_CLIENT_MODIFICATION`; this document does not attempt to resolve
it.

## Part M — `CHANGE_GAME_CREDENTIAL` (conceptual)

```
CHANGE_GAME_CREDENTIAL
{
  commandId: <uuid>
  idempotencyKey: <uuid, distinct from any provisioning request>
  canonicalBloodMoonAccountId: <Account.id>
  reason: PROVISIONING | PLAYER_REQUESTED_ROTATION | ADMIN_FORCED_ROTATION
  newCredentialRepresentation: <opaque, generated -- never player-supplied
                                 plaintext>
}
```

Never triggered automatically by a Portal password change (see
`unified-account.md`'s "Password change" section for why) — always its
own explicit, audited, idempotent action.

## Part W — write boundary design

```
GAME_WRITES_PERFORMED = 0 (today, and unchanged by this phase)
```

GameBridge's existing architecture already separates read
(`IGameDatabaseReader`, zero write-capable members, reflection-proven —
Phase 2B) from everything else. The future write path is a **new,
separate interface** — never an extension of `IGameDatabaseReader` — with
its own, much smaller command allowlist:

```
Initial allowed write commands, in this order, each its own future phase:
  1. CREATE_GAME_ACCOUNT
  2. CHANGE_GAME_CREDENTIAL
  3. ACCOUNT_STATUS_CHANGE   (the "global account ban" case from
                               unified-account.md's Account status section
                               -- explicitly not the common case)
```

Nothing beyond these three is in scope for any near-term phase without
its own dedicated review. In particular: no character mutation, no
currency mutation, no inventory mutation, no GM/privilege mutation — all
of that stays firmly out of scope until (if ever) a phase explicitly
takes it up, separately from account provisioning.

## Part X — GameBridge command security (conceptual)

Every future write command carries:

```
commandId          -- unique per attempt
idempotencyKey      -- stable across retries (Part F)
commandType          -- one of the Part W allowlist, GameBridge rejects
                         anything else outright
issuedAt / expiresAt -- bounded validity window
payload               -- command-specific, minimal (Part G)
signature             -- HMAC, same canonical-request contract already
                          proven real in Phase 2D (method+path+query+
                          timestamp+nonce+bodyHash), a distinct HMAC scope
                          from the existing read/ingest scopes -- a
                          compromised read-scope secret must never be
                          usable to issue a write command
expectedState (optional) -- e.g. "this legacyGameLogin must not already
                             exist" -- a precondition GameBridge checks
                             before executing, refusing rather than
                             silently overwriting
auditTrail            -- see Part Y
result                -- explicit success/failure, never inferred from a
                         timeout
retrySemantics         -- idempotencyKey-scoped only, never a bare command
                          replay
```

**Cloudflare/Portal must never be able to send arbitrary SQL.** GameBridge
accepts only the fixed, named command types above — the same
"no write-capable member" discipline already proven for the read path
extends here as "no arbitrary-command member," not "slightly more
permissive because it's a command now."

## Part Y — observability / audit

Every future provisioning/sync action produces an audit trail with these
states, mirroring this project's existing `AuditEvent`/`AccountModeration`
patterns rather than inventing a new logging shape:

```
requested → accepted → executing → succeeded | failed → (retrying)?
```

**Never logged, under any circumstance**: the real password, the
generated game credential's value, any MU-side secret, any HMAC key.
Character names may be masked in operational logs where not strictly
needed for diagnosis, matching the standing practice already used
throughout Game Data Platform's own diagnostics (Phase 2B–2D).

## Part S — canonical data model (conceptual)

```
CANONICAL_ACCOUNT_MODEL:

Account (existing, unchanged by this phase)
  id, username, email, passwordHash, role, status, sessionVersion,
  twoFactorEnabled, ... (apps/api/prisma/schema.prisma, as-is)

GameAccountIdentity (new, conceptual -- not created this phase)
  id
  accountId          -- FK to Account.id, UNIQUE (one game identity per
                        Blood Moon Account)
  membGuid            -- UNIQUE, nullable until provisioning succeeds
  legacyLogin          -- UNIQUE, generated, never a copy of Account.username
  provisioningStatus   -- GameProvisioningStatus (see above)
  provisioningRequestId -- the idempotency anchor (Part F)
  provisionedAt          -- nullable, set on first ACTIVE transition
  lastSyncedAt            -- nullable, updated on any future sync action

GameAccountProvisioningEvent (new, conceptual -- the audit trail, Part Y)
  id, gameAccountIdentityId, commandType, status, occurredAt, detail
  (never a secret value)
```

Adapted to, not copied from, the domain: `GameAccountIdentity` sits
alongside the existing `AccountCurrency`/`AccountCharacter`/`AccountSession`
family (same `accountId`-FK, same `@@index([accountId])` idiom already
used throughout `schema.prisma`), not a bolted-on foreign concept.

## Part T — Game Data relation

Unchanged from `unified-account.md`: `Account.id → GameAccountIdentity.membGuid`
is the one new resolution step, happening inside apps/api, before any
call into the existing, real, Phase 2D Game Data read path. `membGuid`
remains the only identity Cloudflare/GameBridge ever see.

## Part U — Cloudflare's role

Unchanged from `unified-account.md`: D1 stays a read model. The
`GameAccountIdentity` mapping's source of truth is the Portal's own
database, never D1.

## Duplicate-provisioning protection (Part R)

```
DUPLICATE_PROVISIONING_PROTECTION:
  @@unique([accountId])  on GameAccountIdentity  -- one identity per account
  @@unique([membGuid])    on GameAccountIdentity  -- one account per MU account
  @@unique([legacyLogin]) on GameAccountIdentity  -- defense in depth (MU
                                                       schema itself has no
                                                       DB-level uniqueness
                                                       on memb___id)
  + provisioningRequestId idempotency (Part F)
```

Not a migration — the constraint shape a future implementation must
satisfy, so "Portal Account A and B both end up pointing at MU account X"
and "a retried registration produces two MU accounts" are both structurally
impossible, not just avoided by convention.

## Explicitly not implemented this phase

No table, no Prisma migration, no endpoint, no UI, no GameBridge command,
no write to `MEMB_INFO`, no password change, no real user created, no
Launcher change, no GameServer change, no deploy, no push.
`GAME_WRITES_PERFORMED = 0`.
