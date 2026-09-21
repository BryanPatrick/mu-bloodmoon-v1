---
status: ACTIVE
category: gamebridge
audience: internal (engineering + security + Bryan)
lastVerified: 2026-09-21
---

# GameBridge extension SQL — preservation manifest (Phase 20B, 2026-09-21)

**Preservation only.** These SQL files were never committed on any branch; their only
copy was untracked in `mu-bloodmoon-v1-openbeta`. They are preserved here so they cannot be
lost. **Nothing was executed, installed or granted.** Being on this branch does **not** make
any of it current, reviewed for production, deployed or canonical, and it is **not** merged
to `main`. Companion: `docs/gamebridge/worker-extension-preservation-manifest.md`
(the Worker half of the same extension).

## Provenance

| Field | Value |
|---|---|
| Source | `D:\MU\mu-bloodmoon-v1-openbeta\references\game-data\sql-discovery\gamebridge-extension-20260830` |
| Source branch / HEAD | `open-beta/p0-foundation` @ `2811522dfa7ec92a805ba0deca0f1ca97a4c33e4` |
| Source state | untracked (`??`); `git log --all` on the path: 0 commits |
| Preserved branch / commit | `gamebridge/preserve-command-extension` — artifacts `2d0f6106364bef0fa3d88db72cc460560b8aa3aa` (byte copies), this manifest in the following commit |
| Method | byte copy; `sha256` source vs preserved compared for every file; CRLF kept by a folder-level `-text` attribute |

## Inventory and secret review (12 files)

Review method: a **redacting** scan (category and line numbers only — never the matched text) for
passwords, logins, connection strings, tokens, keys, IPs/hostnames, e-mails, long encoded
literals, `CREATE LOGIN`/`CREATE USER`/`GRANT`; then a literal-redacted read of every flagged
line; fixture identifiers were checked for being synthetic. No secret value is reproduced anywhere.

| File | Bytes | Lines | sha256 (source = preserved) | Class | Notes |
|---|---:|---:|---|---|---|
| `README.md` | 4806 | 47 | `9bab5f42…0130` | **SAFE_TO_PRESERVE** | describes the folder; names the local test login only |
| `derived/proposed-bm-grant-vip-procedure.sql` | 11575 | 204 | `20640cd1…8218` | **SAFE_TO_PRESERVE** | login name appears only in a comment |
| `derived/proposed-bm-sync-vip-tier-procedure.sql` | 10667 | 196 | `56cb520b…1133` | **SAFE_TO_PRESERVE** | — |
| `derived/proposed-bm-anonymize-game-account-procedure.sql` | 31032 | 510 | `52f83e1d…6a47` | **SAFE_TO_PRESERVE** | `WITH EXECUTE AS OWNER` (not a credential) |
| `derived/proposed-bm-purge-game-account-procedure.sql` | 22549 | 371 | `25d13457…81a2` | **SAFE_TO_PRESERVE** | — |
| `derived/proposed-bm-gamebridge-audit-table.sql` | 3572 | 58 | `68f0e679…d9b8` | **SAFE_TO_PRESERVE** | — |
| `derived/proposed-writer-login-grants-extension.sql` | 4671 | 79 | `a36da5ab…9da75` | **SAFE_TO_PRESERVE** | four `GRANT EXECUTE … TO bloodmoon_writer` on **existing** login; no `CREATE LOGIN`, no password; the production login *name* is already documented in tracked docs |
| `derived/local-test-schema.sql` | 12966 | 264 | `d651dd0c…ec3e` | **SAFE_TO_PRESERVE** | synthetic local test schema |
| `derived/local-smoke-test.sql` | 10206 | 132 | `da993678…30f4` | **SAFE_TO_PRESERVE** | synthetic fixtures (`smoke…` identifiers) incl. a dummy fixture password for throwaway accounts in a disposable database — not a real credential |
| `derived/local-smoke-test-2.sql` | 3111 | 38 | `2325236f…4e16` | **SAFE_TO_PRESERVE** | same |
| `derived/local-writer-smoke-test.sql` | 1771 | 35 | `8f8bad74…9aef` | **SAFE_TO_PRESERVE** | `EXECUTE AS LOGIN` of the local test login; no password |
| `derived/local-writer-login.sql` | 2964 | 64 | `ce81991a…5169f` | **SECRET_BEARING — EXCLUDED** | see below |

Totals: 12 found · **11 preserved** · **1 excluded** · 0 REDACTION_REQUIRED · 0 UNKNOWN.

### Excluded: `derived/local-writer-login.sql`

Reviewed **without printing its contents**. Redacted scan: one `CREATE LOGIN`, one `PASSWORD =`
literal, one `CREATE USER`, five `GRANT`/`DENY` lines, one `EXECUTE AS`, thirteen references to the
local test login name; no connection string, IP or hostname. It **creates a SQL login with a password
literal**, so it is **SECRET_BEARING** and is excluded from tracked source until a dedicated secret review.

* The folder README says the password in this file is a placeholder and that the real local-only
  password was generated ad hoc and never written to disk. That is an **unverified assertion** by the
  same author; a shape-only check (no value shown) is consistent with a placeholder but proves nothing.
  Bryan's rule stands: excluded until a dedicated review confirms it.
* Metadata recorded (safe): path, 2964 bytes, 64 lines, sha256 above — the same hash is already
  published in the tracked `docs/gamebridge/gamebridge-second-review-package.md`, so it reveals nothing new.
* The original remains **untracked in openbeta** (residual loss risk; low impact — the login is for the
  disposable local test database and is regenerable from the grants pattern).
* ~~To lift the exclusion: someone reviews it, then either commits it unchanged (if it is verifiably a
  placeholder) or a redacted copy plus a note. Tracked as **GAP-P20-11**.~~

> **Annotation (2026-09-21, Phase 20C) — superseded:** Bryan decided that the exclusion is a **standing
> policy**, not a pending review: `LOCAL_WRITER_LOGIN_POLICY = EXCLUDED_SECRET_BEARING_SOURCE`. The
> original is never copied into tracked source; only the metadata above (path, size, line count, sha256,
> structural counts) stays recorded. No redacted template was created: the login-creation and grant
> pattern is already tracked with a non-literal password
> (`references/game-data/sql-discovery/phase-3c-write-schema-verification-20260824/derived/proposed-writer-login-grants.sql`)
> and the extension grants are preserved here (`derived/proposed-writer-login-grants-extension.sql`).
> GAP-P20-11 is **RESOLVED_AS_POLICY** (`docs/knowledge/KNOWLEDGE_GAPS.md`, CLAIM-156, on the knowledge branch).

## Hash drift versus the Phase K review package

`docs/gamebridge/gamebridge-second-review-package.md` (2026-08-30) recorded SHA-256 values for the four
procedure files; those files were edited afterwards (Phase L: `AccountExpireDate` fix, audit-id
threading), so **its procedure hashes are stale**. The hashes above are the current ones. Its
`local-writer-login.sql` hash still matches (unchanged).

## SQL artifact classification

Result codes and parameters read from the procedure text; "installed" states come from documents
(ADR-0002, `docs/security/game-write-boundary.md`, the review package) — **production SQL Server was
not contacted in Phase 20B, so "not installed" is documented, not re-verified.**

| Artifact | Purpose | Command type | Input parameters | Tables written (read-only: `Guild`) | Idempotency model | Prod. installed? | D1 route? | Agent? | Worker? | Authority |
|---|---|---|---|---|---|---|---|---|---|---|
| `dbo.bm_GrantVip` | commercial VIP delivery: raise `AccountLevel` via MAX(current, target), extend `AccountExpireDate` (MAX) | `GRANT_VIP` | `@LegacyLogin VARCHAR(10), @TargetLevel TINYINT, @ExpiresAt DATETIME, @CommandId, @CorrelationId`; out `@ResultCode VARCHAR(32), @PreviousLevel, @NewLevel` | `MEMB_INFO`; audit | MAX rule + shared applock `BloodMoon:GAME_ACCOUNT_MUTATION:<login>` (repeat = no-op). **Not** keyed by `CommandId` | **No** (documented) | **No** — remote D1 CHECK is CREATE-only | handler in committed Agent source (`e90c29df`, `a6660109`), **not** in the deployed binary | routing only on the preserved branch | proposed / reviewed, not installed |
| `dbo.bm_SyncVipTier` | desired-state sync incl. level 0 (expiry enforcement) | `SYNC_VIP_TIER` | `@LegacyLogin, @DesiredLevel TINYINT, @DesiredExpiresAt DATETIME = NULL, @CommandId, @CorrelationId`; out `@ResultCode, @PreviousLevel, @NewLevel, @Changed BIT` | `MEMB_INFO`; audit | compare-then-set (`Changed = 0` when already current) + same applock | **No** | **No** | as above | as above | proposed |
| `dbo.bm_AnonymizeGameAccount` | irreversible pseudonymisation of a game account and its dependants | `ANONYMIZE_GAME_ACCOUNT` | `@LegacyLogin, @CommandId, @CorrelationId`; out `@ResultCode, @EntitiesAffectedJson NVARCHAR(MAX)`; `WITH EXECUTE AS OWNER` | 43 game tables + the audit table, incl. `MEMB_INFO`, `Character`, `AccountCharacter`, `GuildMember`, `CustomMarketShop`, `T_Friend*`, 11 `Ranking*` + `Gens_Rank`/`Gens_Reward`, **`CashShopData` (UPDATE)**, `warehouse`/`ExtWarehouse` (DELETE); `ALTER TABLE CustomQuest CHECK/NOCHECK` | state check (`memb__pwd` tombstone → `ALREADY_ANONYMIZED`); applock; single transaction | **No** | **No** | as above | as above | proposed |
| `dbo.bm_PurgeGameAccount` | irreversible deletion of a game account (Beta-cycle purge) | `PURGE_GAME_ACCOUNT` | `@LegacyLogin, @BetaCycleId VARCHAR(80), @CommandId, @CorrelationId`; out `@ResultCode, @TablesAffectedJson NVARCHAR(MAX)` | 45 game tables, all DELETE (incl. **`CashShopData` rows**, `MEMB_STAT`, `DmN_OnlineCheck`, `MEMB_INFO`) + the audit table | row absence = `ALREADY_PURGED`; applock | **No** | **No** | as above | as above | proposed |
| `dbo.bm_GameBridgeAudit` (table) | SQL-side append-only audit, two rows per call | (all four) | — | itself | **not** a dedupe gate: `CommandId` index is non-unique | **No** | — | — | — | proposed |
| grants script | `GRANT EXECUTE` on the four procedures to the existing `bloodmoon_writer`; verification block | — | — | — | — | **No** (production writer has `EXECUTE` on `DmN_CreateGameAccount` only) | — | — | — | proposed |

Note for the currency work: `bm_AnonymizeGameAccount` (UPDATE) and `bm_PurgeGameAccount` (DELETE) are the only
artifacts anywhere that reduce or remove `CashShopData` balances, and they are not installed.
**There is no procedure that credits currency, and none is to be written now.**

## Command deployment matrix (2026-09-21)

| Command | Portal type | Worker | D1 schema (remote) | Agent | SQL procedure | Installed on prod SQL | Production tested | Status |
|---|---|---|---|---|---|---|---|---|
| `CREATE_GAME_ACCOUNT` | yes | **yes — committed and deployed** | **yes** (0003; CHECK = this type only) | **yes — deployed** (0.1.0+20a0d71c, 2026-08-24) | `dbo.DmN_CreateGameAccount` (source: `references/…/phase-3c-write-schema-verification-20260824/derived/`) | **yes** | **yes** — 2 QA commands, replay/restart tests | **DEPLOYED, ACTIVE polling; traffic idle since 2026-08-25** |
| `GRANT_VIP` | yes | routing **only on this branch** | **no** — 0004 not applied | handler in committed source; **not** in the deployed binary; kill switch default off | `bm_GrantVip` (preserved) | no (documented) | no | **IMPLEMENTED_NOT_DEPLOYED** |
| `SYNC_VIP_TIER` | yes | same | no | same | `bm_SyncVipTier` | no | no | **IMPLEMENTED_NOT_DEPLOYED** |
| `ANONYMIZE_GAME_ACCOUNT` | yes | same | no | same | `bm_AnonymizeGameAccount` | no | no | **IMPLEMENTED_NOT_DEPLOYED** |
| `PURGE_GAME_ACCOUNT` | yes | same | no | same | `bm_PurgeGameAccount` | no | no | **IMPLEMENTED_NOT_DEPLOYED** |
| `CREDIT_GAME_CURRENCY` | **no** | **no** | **no** | **no** | **none** | — | — | **DOES_NOT_EXIST** |

`CREDIT_GAME_CURRENCY` has no Portal type, Worker route, D1 support, Agent handler or SQL procedure anywhere in the
repository or in this preserved material. The Prisma `GameBridgeOperation.CREDIT_CURRENCY` value is the *marketplace
seller credit*, with no producer or consumer, and is unrelated. **No placeholder was created.**

## Rules

* No merge to `main`, no deploy, no push without Bryan's explicit instruction.
* Installing any procedure, applying D1 migration `0004`, deploying the preserved Worker or enabling an Agent
  kill switch are separate, individually authorised production steps.
* Nothing in this folder may be run against a production database.
