# Unified Blood Moon Account (Phase 3A)

Architecture only. No code in this phase creates a table, a migration, an
endpoint, or a game write. `GAME_WRITES_PERFORMED = 0` throughout. This
document supersedes the "Account Linking" concept
(`docs/game-data/account-linking-contract.md`, now marked `SUPERSEDED`)
with a corrected model.

## The concept correction

There is no such thing, in the product, as "a Portal account" and "an MU
account" that a player links together. **There is one Blood Moon
Account.** `memb_guid`/`memb___id` are not a second identity — they are
the technical representation of that same account inside the legacy MU
game database. Registering on the website is registering for the game.
The player never sees, types, or manages a second credential in the
normal flow.

This corrects, not extends, `account-linking-contract.md`'s framing. That
document was written when it was genuinely unknown whether a safe join
key existed at all (`join-keys-unknown.md`). It now does — `memb_guid`,
confirmed a real SQL Server `IDENTITY` column with `STRONG` stability
(`docs/game-data/account-identity.md`) — and the product answer to "how do
these two things relate" was never actually "linking." It was always
"one thing, represented twice."

## Identity authority — the decision

```
IDENTITY_AUTHORITY = BLOOD_MOON_ACCOUNT (the Portal's Account model, modern, canonical)
GAME_DB_ROLE        = REQUIRED REPRESENTATION (MEMB_INFO row must exist for the client/GameServer to work — not an authority)
CLOUDFLARE_D1_ROLE   = READ MODEL / CURRENT STATE (Game Data Platform — never an identity or auth source)
```

**Option B** from Phase 3A's framing (Blood Moon API/Portal is the modern
canonical authority; MU SQL is a necessary representation for the
GameServer) is the right model — not a coin flip, an evidence-driven
conclusion:

| Criterion | MU SQL as authority (Option A) | Portal as authority (Option B) |
|---|---|---|
| Security | `memb__pwd` is `varchar(10)`, and real length data (below) proves plaintext storage — cannot be the anchor for a modern security model | Portal already has `passwordHash`, TOTP 2FA, session revocation (`AccountSession`), password reset tokens — a real modern stack already exists |
| Username | `memb___id varchar(10)`, no DB-level uniqueness | Portal `username`/`email` are `@unique`-constrained, unbounded length |
| Roles/permissions | `Admin`/`ctl1_code` are coarse legacy flags with no modern permission model | Portal already has `Role` enum + per-account `AccountPermission` overrides (used today by Game Data Platform's own `admin.game-data.view`) |
| Account recovery | No credible modern recovery path (weak/absent security questions, no verified email requirement enforced at the DB layer) | Portal already has `PasswordResetToken` (hash, expiry, single-use, IP-logged) |
| Auditability | No audit trail found in the schema; `DmN_Account_Logs` exists but its write path/coverage is unconfirmed | Portal already has an `AuditEvent` model (`AuditActor` relation) |
| Legacy/engine constraint | The GameServer binary is closed-source (`BINARY_ONLY`) and cannot be changed to speak a modern protocol | None — the Portal is this project's own code |
| Future services | A second, third, Nth Blood Moon service would need to keep re-deriving identity from MU SQL | New services trivially consume the same Portal `Account`, exactly like Game Data Platform already does |

**Option A (MU SQL as authority) is rejected.** **Option C (a genuine
hybrid with two co-equal authorities) is rejected** — a "hybrid" account
model is exactly the failure mode this phase exists to eliminate: two
sources of truth is what produces desync, ambiguous conflict resolution,
and the exact "linking" mental model being corrected here. Option B, with
MU SQL treated strictly as a *required representation*, not a second
authority, is the only model that keeps "one account" true architecturally
and not just in marketing copy.

## The three technical identities

```
BLOOD_MOON_ACCOUNT_ID = Account.id (Portal Prisma model, uuid, existing, unchanged)
MU_ACCOUNT_ID          = MEMB_INFO.memb_guid (int, real IDENTITY PK, confirmed STRONG stability)
MU_LEGACY_LOGIN         = MEMB_INFO.memb___id (varchar(10), the login string the GameServer/client actually authenticate against)
CHARACTER_ID            = Character.Name (varchar(10), real PK, confirmed in Phase 2A/2B)
```

Conceptual shape (illustrative — not a schema to implement yet, see
`game-account-provisioning-contract.md`'s `GameIdentity` proposal for the
version that actually accounts for the existing domain):

```
BloodMoonAccount
{
  id: <Portal Account.id — the canonical identity>

  gameIdentity?:
  {
    membGuid: <MU_ACCOUNT_ID, once provisioned>
    legacyLogin: <MU_LEGACY_LOGIN, once provisioned>
    provisioningStatus: ...
  }
}
```

`gameIdentity` is optional at the type level because provisioning is not
guaranteed to be instantaneous or guaranteed to succeed on the first try
(see `game-account-provisioning-contract.md`'s Part F). A `BloodMoonAccount`
without a resolved `gameIdentity` yet is a normal, valid, transient state
— not an error state and not "an account that hasn't linked."

## User experience contract

The player-facing vocabulary has exactly four verbs:

```
CREATE ACCOUNT
SIGN IN
SIGN OUT
RECOVER ACCOUNT
```

Never, in the normal flow: "link MU account," "connect game account,"
"import MU account." The one narrow exception is
**Legacy Account Migration** (see below) — a distinct, clearly-labeled
flow for the finite set of players who already have a pre-existing MU
account from before the Portal existed. It is explicitly not "linking" in
the UI or the docs, because it only ever runs once, in one direction, for
accounts the Portal did not create.

## Password / auth strategy — the critical finding

**`GAME_PASSWORD_SCHEME = CONFIRMED: plaintext.`**

This is a structural + real-data + real-code triangulation, not a guess,
and no password value or hash was ever read to reach it:

1. **Schema**: `MEMB_INFO.memb__pwd` is `varchar(10)` (`REAL_SQL_METADATA`,
   `references/game-data/sql-discovery/live-20260820/`). No standard hash
   (MD5 hex = 32 chars, SHA-1 = 40, bcrypt = 60) fits in 10 characters.
2. **Real data**: a safe, aggregate, length-only query
   (`SELECT LEN(memb__pwd), COUNT(*) FROM MEMB_INFO GROUP BY LEN(memb__pwd)`
   — never the value itself) against the live server returned lengths
   **3, 6, and 10** across the 6 real accounts — a non-uniform
   distribution matching real, human-typed passwords of varying length.
   A hash of any kind produces a *fixed* length regardless of input; this
   result structurally rules every hash scheme out.
3. **Legacy code** (`model.account.php::login_user()`,
   `LEGACY_CODE_CONFIRMED`): the login query is
   `WHERE memb___id = :user AND memb__pwd = :pass`, and for this
   application's default (`MD5 == 0`) config branch, `:pass` is bound to
   `$this->vars['password']` **directly, unhashed**. The two alternate
   config branches (`MD5 == 1`, a SQL stored-procedure check; `MD5 == 2`,
   PHP-side `md5()`) are not what's active: `MD5 == 1`'s stored procedure
   (`DmN_Check_Acc_MD5`) is confirmed **absent** from the live server
   (Phase 2A), and `MD5 == 2`'s 32-character hex output could not fit the
   observed 3/6/10-length values at all.

**Consequence for the Unified Account design**: the Portal's own
`passwordHash` (a real, modern hash) must never be derived into, decrypted
into, or otherwise made to produce `MEMB_INFO.memb__pwd`. Doing so would
either require storing a reversible/plaintext-recoverable form of the
player's real password somewhere (a genuine security downgrade) or writing
a broken/truncated value that cannot authenticate at all. This rules out
naive "same password, synced" designs and is why:

```
PASSWORD_STRATEGY_OPTIONS, evaluated:

Option A (same password, literally reused as the MU credential)
  → REJECTED. Requires either storing the real password recoverable
    (never acceptable for a modern account) or writing a value that
    can't work with the confirmed 10-char plaintext scheme reliably
    input-for-input (real passwords longer than 10 chars, or containing
    characters the legacy scheme mishandles, would silently break).

Option B (a derived/synchronized game credential, generated server-side,
distinct from the player's real password, stored only where the
provisioning flow needs it)
  → VIABLE, with care: the generated credential must never be shown to
    or typed by the player in the normal flow (defeats the point of not
    needing "a second password"), must be regenerable without touching
    the player's real password, and must be scoped to exactly what
    CREATE_GAME_ACCOUNT/CHANGE_GAME_CREDENTIAL need — see
    game-account-provisioning-contract.md's Part G/H.

Option C (Launcher authenticates the modern account only; the game
session itself is started without the player ever typing or seeing a
game-specific password)
  → PREFERRED, where technically reachable. Best matches "one account,"
    keeps the weak legacy scheme fully contained, and removes the
    player-facing "second password" entirely. Reachability depends on
    GAME_CLIENT_SSO_POSSIBLE (see below) — currently
    REQUIRES_CLIENT_MODIFICATION, so Option C is the target, Option B is
    the realistic fallback until/unless client-side SSO is separately
    investigated and approved.
```

**The modern side is never weakened to accommodate the MU side.** If a
future phase determines the GameServer genuinely requires a stored value
usable for its plaintext comparison, that value is treated explicitly as
a **generated, non-reused, rotatable game credential** (Option B) — never
the player's real password, never derived from `passwordHash`.

## Username vs. legacy login

```
MODERN_USERNAME_VS_LEGACY_LOGIN:
  Portal Account.username — String, @unique, unbounded length (confirmed:
    apps/api/prisma/schema.prisma has no @db.VarChar(10) constraint on it)
  MU_LEGACY_LOGIN (memb___id) — varchar(10), a separate, generated value
```

The modern `username`/`email` is never truncated or constrained to 10
characters to satisfy the legacy schema. `MU_LEGACY_LOGIN` is a
**generated, internal, technical value** (e.g. derived from
`BLOOD_MOON_ACCOUNT_ID` or a short allocated code), not a copy or
truncation of the player's chosen username — truncating real usernames to
10 characters would produce collisions (`memb___id` has no DB-level
uniqueness, per the existing schema evidence, making collisions a real
risk, not theoretical) and would leak the modern identity's naming
constraints back into a system this document intentionally isolates.
The player never sees or needs to know `legacyLogin` exists — it lives
entirely inside the provisioning system, exactly as `memb_guid`/
`memb___id` already do for Game Data Platform's read side (Part K of
Phase 2B: "`memb___id` must never appear in public API, event payloads,
logs, frontend, or D1 current state").

## Launcher and game-client auth

```
GAME_CLIENT_SSO_POSSIBLE = REQUIRES_CLIENT_MODIFICATION
```

Evidence (`docs/client-bootstrap-map.md`, based on reading the launcher's
real C# source, plus this phase's own reading of
`apps/launcher/Services/GameProcessService.cs`): the launcher currently
starts `main.exe` with `Process.Start`, **no command-line arguments, no
credential injection of any kind**. `main.exe` itself is `BINARY_ONLY`
(closed-source, Webzen engine) and, per the same map, reads its own
`Data/Local/ServerList.bmd` and connects directly to `ConnectServer` —
meaning it almost certainly shows its own native login prompt once it
starts, entirely outside the launcher's control. No evidence was found,
in this project's own documentation or code, of an undocumented
command-line or config-file credential-passing mechanism for this client
build. Reaching real SSO would require either reverse-engineering such a
mechanism (unconfirmed to exist) or patching the client — both explicitly
**not done this phase** ("NÃO modificar client ainda").

The Launcher's own auth is already correctly modern and already
partially built: `SessionStore.cs` persists a DPAPI-protected local
session, and `client-bootstrap-map.md` confirms `POST {apiBaseUrl}/auth/login`
already issues Portal `accessToken`/`refreshToken` pairs. The future
contract is:

```
Launcher → apps/api /auth/login (existing) → Blood Moon Account (accessToken)
    → internal gameIdentity.membGuid (never exposed to the Launcher UI as
      "your MU account" — resolved server-side)
    → Game Data Platform (existing, real, Phase 2D) → real characters
```

The Launcher **never** authenticates directly against SQL, **never**
holds SQL credentials, and **never** treats `memb___id` as a canonical
identity — all three already true by construction today (the Launcher has
no SQL-adjacent code at all), and this document makes them an explicit,
permanent contract rather than an accident of what hasn't been built yet.

Starting the actual game session (getting past `main.exe`'s own login
screen) remains the open problem Option C above depends on. Until/unless
that's solved, the realistic near-term UX is: the player signs in once to
the Portal/Launcher, and the Launcher displays (never requires the player
to separately manage) whatever minimal credential Option B's generated
game credential produces — a smaller compromise than a fully separate MU
account, and one that can be revisited the moment `GAME_CLIENT_SSO_POSSIBLE`
evidence changes.

## Password change

```
CHANGE_GAME_CREDENTIAL (conceptual command, not implemented)
```

When a player changes their Blood Moon Account password: Portal auth
updates immediately (already true today, unchanged). Launcher auth is
unaffected (same Portal credential). The MU-side generated game credential
(Option B) is **not** automatically re-derived from the new Portal
password — doing so would re-introduce the Option A problem. Instead,
`CHANGE_GAME_CREDENTIAL` is its own explicit, audited, idempotent command
(same shape as `CREATE_GAME_ACCOUNT`, see the provisioning contract doc),
issued only when the game credential itself needs rotation (e.g. as part
of provisioning, or a future explicit "reset my game credential"
recovery action) — never silently piggybacked on a Portal password
change.

## Account recovery

Recovery stays entirely modern: `PasswordResetToken` already exists
(hashed token, expiry, single-use, IP-logged) and 2FA (`twoFactorEnabled`,
TOTP) is already modeled. The MU-side legacy security questions
(`fpas_ques`/`fpas_answ` in `MEMB_INFO`, `varchar` fields with unconfirmed
strength) are never used as a recovery factor for the Blood Moon Account
— they are legacy artifacts of the representation row, not part of the
canonical identity's recovery surface. A successful modern recovery
(email-verified reset, optionally 2FA-gated) may trigger
`CHANGE_GAME_CREDENTIAL` if the design ultimately needs the game
credential rotated in step — a decision for the phase that implements
this, not this one.

## Roles vs. game privilege

```
Portal Role (existing enum): PLAYER, GM, ADMIN, SUPER_ADMIN
MU-side: Admin (MEMB_INFO), ctl1_code (GM/staff flag), CtlCode (per-character ban flag)
```

These are **explicitly separate axes, not automatically mirrored**.
Changing a player's Portal `Role` to `GM` or `ADMIN` must never, by
itself, silently write `MEMB_INFO.Admin`/`ctl1_code` or any
`Character.CtlCode` — that would be a game write performed as a side
effect of a Portal-only action, with no audit trail on the game side and
no idempotency guarantee. If in-game GM authority is ever needed, it is
its own explicit, audited provisioning command (out of scope for this
phase, and likely a Phase 3B/3C concern), gated at minimum the same way
Game Data Platform already gates its own admin surface: real role check
+ a dedicated permission (`AccountPermission`) + — per this phase's own
instruction — **2FA required for any elevated-role action that would
touch game privilege**. `GM` sits operationally below `ADMIN` in scope
(matches the existing Portal `Role` ordering) but neither implies any
automatic MU-side write.

## Account status

```
Portal AccountStatus (existing enum): ACTIVE, PENDING, BLOCKED
Portal AccountModeration (existing audit log, separate table): type =
  NOTE | WARNING | BLOCK | UNBLOCK | BAN, reason, expiresAt, actor
MU-side: MEMB_INFO.bloc_code (account-level block flag), Character.CtlCode
  (per-character flag), DmN_Ban_List (a separate web-DB ledger with
  reason/duration, written alongside bloc_code on a real ban action per
  the legacy code)
```

**Real gap found this phase, worth naming explicitly**: today, both a
moderation `BLOCK` and a `BAN` collapse to the exact same
`AccountStatus.BLOCKED` value on the account row
(`apps/api/src/modules/support/support.service.ts`) — the distinction
between "suspended" and "banned" exists only in `AccountModeration`'s
audit trail (`type`), not as an enforced state. `AccountModeration.expiresAt`
exists but nothing currently reads/enforces it (no scheduled job reverts
`BLOCKED → ACTIVE` on expiry) — a data field, not a mechanism, today. This
predates and is independent of the Unified Account model; noted here
because any future "global account ban" command (see below) inherits this
same ambiguity unless a future phase resolves it. Also worth carrying
forward: `register()` sets `status: 'ACTIVE'` immediately today — the
schema's `PENDING` default is not currently reached by any code path
(no email-verification gate exists yet). If email verification is added
later, `GAME_ACCOUNT_PROVISIONING_REQUIRED` timing (see the provisioning
contract) should be reconsidered relative to when `PENDING → ACTIVE`
actually happens.

Three distinct concepts that must not be semantically flattened into one:

- **Portal suspension** (`AccountStatus.BLOCKED`) — a Blood Moon Account
  action (e.g. ToS violation on the website/community features). Does
  not, by itself, imply a game-side ban.
- **Game ban** (`MEMB_INFO.bloc_code` / `DmN_Ban_List` / `Character.CtlCode`)
  — an in-game action (cheating, in-game conduct). Does not, by itself,
  imply Portal suspension.
- **Global account ban** — a real product decision to suspend *both*
  simultaneously (e.g. a severe ToS violation). This is the one case
  where a single Portal action legitimately needs to also produce a game
  write (`ACCOUNT_STATUS_CHANGE`, see the provisioning contract's write
  boundary) — but it must be an explicit, named, audited command, not an
  implicit side effect of setting `AccountStatus = BLOCKED`.

No unification is adopted here without an explicit rule; this document
only names the three concepts so a future phase can't accidentally
conflate them.

## Existing accounts — Legacy Account Migration

6 real accounts already exist in `MEMB_INFO` today (Phase 2A.1). These
cannot be ignored, and must never be silently orphaned by a "every new
account goes through provisioning" model that assumes a clean slate.

```
EXISTING_ACCOUNT_STRATEGY = Legacy Account Migration (conceptual, not implemented)
```

This is a **distinct flow from normal registration**, deliberately not
called linking anywhere in product language. Conceptual shape: a legacy
MU account holder creates (or already has) a Blood Moon Account, then
proves ownership of a specific `memb_guid` through one of:

- Legacy credentials (the existing, weak plaintext MU password) —
  usable as *one* signal, never sole proof for anything sensitive, given
  the confirmed weak scheme above.
- A verified legacy email on file (`MEMB_INFO.mail_addr`), if it matches
  a verified modern email — moderate-strength signal, not proof alone.
- In-game proof (e.g. a one-time code delivered only reachable via
  actually being logged into the character) — strong signal, requires
  design.
- Manual/admin-assisted migration — the fallback for accounts where
  automated proof isn't available or trustworthy.
- A Launcher-side "migration challenge" flow — conceptual, needs its own
  design pass.

**Not decided here**: which signal(s) are required, whether multiple are
combined, or the exact UX. This section exists so a future phase starts
from a named, scoped problem ("prove ownership of a specific legacy
account, safely, given a known-weak legacy credential") rather than
re-deriving "how do we handle old accounts" from nothing.

## Duplicate-provisioning prevention

```
DUPLICATE_PROVISIONING_PROTECTION (conceptual):
  A GameAccountIdentity-shaped mapping table (see provisioning contract's
  Part S model) with:
    UNIQUE(bloodMoonAccountId)  -- one game identity per Blood Moon Account
    UNIQUE(membGuid)            -- one Blood Moon Account per MU account
    UNIQUE(legacyLogin)         -- defense in depth, even though memb___id
                                    itself has no DB-level uniqueness on
                                    the MU side; the Portal's own mapping
                                    table enforces what MU SQL does not
  + an idempotent provisioning-request id (see provisioning contract's
    Part F) so a retried registration can never produce two MU accounts
    for the same Blood Moon Account.
```

Not a migration proposal — a statement of the constraint shape a future
implementation must satisfy, cross-referenced from
`game-account-provisioning-contract.md`.

## Game Data relation (unchanged, now explicit)

Game Data Platform (Phase 1–2D, `END_TO_END_REAL_INFRA = PASS`) already
resolves `memb_guid → AccountCharacter → Character.Name` correctly and
never uses `memb___id`/username for authorization (Phase 2B Part K,
re-confirmed). Under the Unified Account model, the one new resolution
step is `BloodMoonAccount.id → gameIdentity.membGuid`, which happens
**inside apps/api**, before ever reaching the Game Data read path —
Cloudflare D1 and the GameBridge Agent are never told about
`BloodMoonAccount.id` at all; they only ever see `membGuid`, exactly as
today.

## Cloudflare's role, restated

D1 (Game Data Platform) is a **read model / current-state cache**, not
an identity or authentication store, and this phase does not change that.
The canonical `BloodMoonAccount ↔ gameIdentity` mapping lives in the
Portal's own database (Prisma/MySQL) — the same system that already owns
`Account`, `AccountSession`, `AccountPermission`. D1 is never asked to be
the source of truth for "which memb_guid belongs to which Blood Moon
Account," even though it happens to store `memb_guid`-keyed current-state
data (`account_snapshot_state`) for an unrelated reason (Game Data reads).

## Threat model (conceptual mitigations, nothing implemented)

| Threat | Mitigation (conceptual) |
|---|---|
| Duplicate provisioning (same Blood Moon Account gets two MU accounts, or a retried request creates two) | Idempotent `provisioningRequestId`; `UNIQUE(bloodMoonAccountId)` on the mapping table; see provisioning contract Part F |
| Username/legacy-login collision | `legacyLogin` is generated internally, never derived from a player-chosen, unconstrained modern username; mapping table enforces uniqueness the MU schema itself doesn't |
| Credential desync (Portal password changes, game credential doesn't, or vice versa) | `CHANGE_GAME_CREDENTIAL` as its own explicit, audited, idempotent command — never implicit |
| Replay of a `CREATE_GAME_ACCOUNT`/write command | Same HMAC + nonce + `commandId`/idempotencyKey contract already proven for the read path (Phase 2D); see provisioning contract Part X |
| Account takeover via the legacy (plaintext, weak) game credential | The weak scheme is never exposed to the player and never reused as/derived from the real Portal password; Legacy Account Migration treats legacy credentials as a weak signal, never sole proof |
| Legacy account claim fraud (someone claims a `memb_guid` that isn't theirs) | Migration requires a real proof signal (see Existing Accounts above), never username/email equality alone — the same "never username equality" rule `account-linking-contract.md` already established |
| Stale/partial provisioning (Portal row created, MU row missing or vice versa) | Explicit provisioning state machine (provisioning contract Part E) with `PROVISIONING_FAILED` as a real, surfaced state, plus reconciliation — never a silent "assume it worked" |
| Privilege escalation via Portal role change | Role and game privilege are separate axes (see Roles vs. game privilege above); no automatic mirroring |
| Secret leakage (game credential, HMAC keys, SQL credentials) | Same discipline already proven in Phase 2C/2D: transient transmission, never logged, never committed, masked in diagnostics |
| GameBridge compromise | Command allowlist only (explicit command types, never arbitrary SQL — provisioning contract Part X), same as the existing read path's `SqlServerGameDatabaseReader` having zero write-capable members |
| Portal compromise | Standard modern practice already in place (bcrypt/argon2-class hashing — confirmed exact library in the provisioning contract doc's Part A findings, session revocation via `AccountSession`) — this phase adds no new portal-side attack surface, since nothing is implemented yet |
| Password downgrade (weakening modern security to accommodate MU) | Explicitly rejected as a design constraint throughout this document (Password strategy section) |

## Product language

Going forward, documentation and UI copy use:

```
Blood Moon Account   (not "Portal account" + "MU account")
Game Identity         (not "linked MU account")
Game Provisioning     (not "account linking")
Legacy Account Migration  (not "import" or "connect," for the one real
                           exception flow)
```

`docs/game-data/account-linking-contract.md` is marked `SUPERSEDED` (see
that file) — kept, not deleted, per this project's standing
never-silently-overwrite rule.

## Next steps (not this phase)

The next safe implementation step, once this contract is reviewed, is
**not** writing to MU SQL. It is the Portal-side scaffolding that has zero
game-write risk: the `GameAccountIdentity`-shaped mapping table + its
provisioning state machine (schema only), decoupled from any real
`CREATE_GAME_ACCOUNT` command execution. `CREATE_GAME_ACCOUNT` itself —
the first real game write this project performs — is deliberately the
smallest, most auditable possible write, and belongs in its own,
separately-reviewed phase per this phase's explicit write-boundary
design (`game-account-provisioning-contract.md`'s Part W).
