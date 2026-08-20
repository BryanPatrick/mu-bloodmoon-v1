# Real read model — account snapshot (Phase 2B)

New in this update (2026-08-20). Everything below describes a real,
implemented, tested read path in `apps/game-bridge-agent` — distinct from
`docs/game-data/schema/`, which documents the underlying SQL evidence this
is built on. Phase 1's original bulk-poll methods
(`GetCharacterResetSnapshotsAsync`/`GetRankingSnapshotsAsync`) are
untouched and remain `BLOCKED_BY_SCHEMA_DISCOVERY` — this is a separate,
additive, account-scoped read pattern.

## What it answers

Given a canonical MU account identifier, produce one deterministic,
output-safe snapshot: which characters the account owns (in real slot
order), each character's core stats, master level, guild, rankings, and
account-level online status and currency balances.

## Canonical identity — read this before writing any caller

`accountId` in the Game Data domain (`GameAccountReadModel.AccountId`, the
`AccountSnapshotReader.GetAccountSnapshotAsync` parameter, the resulting
`DetectedChange.AccountId`) is **always `MEMB_INFO.memb_guid`** — never
`memb___id` (the login username). This follows the recommendation in
`docs/game-data/account-identity.md`.

`memb___id` is used only as an internal bridge to reach
`AccountCharacter`/`Character`/`CashShopData`/`warehouse`/`MEMB_STAT` (all
of which are keyed by it on the real schema) and is resolved once, inside
`AccountSnapshotReader`, then discarded. It never reaches the public API,
event payloads, logs, the frontend, or D1 current state.

## Character ownership resolution

1. `MEMB_INFO` by `memb_guid` → `memb___id`.
2. `AccountCharacter` by `Id = memb___id` is the **primary ownership
   source** — validated 100% consistent against the live database (see
   `docs/game-data/account-identity.md`). `GameID1..GameID10` are the real
   character slots (empty/null slots skipped, real slot number preserved —
   never re-sorted, never renumbered from 1). `GameIDC` is the
   currently-active character, returned separately as
   `ActiveCharacterName` — never treated as an 11th slot, even when its
   value duplicates a real slot (which it always does when a character is
   selected).
3. `Character` rows are fetched by `Name` for all of an account's slot
   names in a single batched query (max 10 names — no N+1).
4. `Character.AccountID` is a **consistency guard, not a second ownership
   source**: for every resolved character, it must equal the account's
   `memb___id`. Any divergence — an orphan slot (`Character` row missing
   entirely), a missing `AccountCharacter` row for a known account, or an
   `AccountID` mismatch — never silently picks an answer. It produces
   `AccountSnapshotResult.Inconsistent(reason)`, where `reason` never
   contains a character or account name (only a safe, generic diagnostic
   string). Callers must branch on `AccountSnapshotResult.Status`
   (`Ok` / `AccountNotFound` / `Inconsistent`) — there is no way to reach
   `.Model` without checking it first.

## Query boundaries — what is read, and what never is

Read: `Name`, `Class`, `cLevel`, `Experience`, `LevelUpPoint`,
`Strength`/`Dexterity`/`Vitality`/`Energy`, `Leadership`, `Money`,
`MapNumber`/`MapPosX`/`MapPosY`, `PkCount`/`PkLevel`/`PkTime`, `CtlCode`,
`ResetCount`, `MasterResetCount`, `AccountID` (internal guard only).

Never read: `Inventory`, `MagicList`, `EffectList`, `Quest`,
`warehouse.Items` (all `varbinary` blobs — write-path only, see
`docs/game-data/legacy-web-intelligence/inventory-warehouse.md`), and no
`MEMB_INFO` personal/login/secret column (`memb__pwd`, `mail_addr`,
`last_login_ip`, security question/answer, etc.) is ever selected by any
Phase 2B method.

`RuudMoney` — named in the original request (mirroring legacy web code's
`RuudMoney AS Ruud`) but **confirmed absent from the real live `Character`
table** (60 real columns enumerated, zero match). Excluded from
`CharacterCore` entirely; a genuine `CONTRADICTS_CURRENT_ASSUMPTION`
finding, not a bug — see
`references/game-data/sql-discovery/live-20260820/raw/03-schema-character-membinfo.txt`.

## Online-status semantics

`GameAccountReadModel.Online` is `MEMB_STAT.ConnectStat = 1`, exposed as
`ACCOUNT_ONLINE` — an **account-level** signal for exactly one account.
This is never called `GAME_SERVER_STATUS` (see
`docs/game-data/architecture.md`'s heartbeat-terminology section for the
unrelated Agent-connectivity concept of the same shape) and this read path
never infers a `CHARACTER_ONLINE` or any `PUBLIC_ONLINE_COUNT` — those
would need different evidence (e.g. per-character session state, or an
aggregate query) that this method does not have and does not attempt.

## Currency semantics

Three genuinely distinct balances, never conflated:
- `Character.Money` — carried Zen, per character (in `CharacterSnapshot`).
- `warehouse.Money` — vault Zen, per account (`GameAccountReadModel.WarehouseMoney`).
- `CashShopData.WCoinC` / `WCoinP` / `GoblinPoint` — cash-shop balances, per
  account, via `CashShopData.AccountID = MEMB_INFO.memb___id`
  (`GameAccountReadModel.CashShop`).

## Nullable / missing-row semantics

Every optional read distinguishes two different kinds of "no value," never
collapsing them:
- **No row at all** (e.g. no `MasterSkillTree` row, no `GuildMember` row, no
  `CashShopData` row, no `warehouse` row, no `MEMB_STAT` row) → the whole
  field/record is `null`. Never inferred as zero, never treated as an
  error.
- **A row exists but a column inside it is `NULL`** (every ranking score
  column is nullable in the live schema) → the record is present, the
  specific field is `null`. A present `BloodCastleRanking` with
  `Score: null` is a different fact from `BloodCastle: null` (no ranking
  row at all) — both are real, observed cases (see
  `references/game-data/sql-discovery/phase-2b-readmodel-validation-20260820/`).

Rankings never collapse into a generic "score" — `RankingCastleSiege`
genuinely has `KillScore`/`DeathScore`/`CrownTime`, not a single `Score`
(this corrects Phase 1's `OBSERVED`-tier assumption; see
`docs/game-data/schema/v1-rankings.md`).

## Determinism (feeds the existing change-detection pipeline unchanged)

`GameAccountReadModel` and every nested type are C# `record`s (never a
`Dictionary<>`), and `Characters` is built by iterating slots in their
original, already-slot-ordered sequence. Two polls of unchanged data
therefore produce byte-identical JSON via
`AccountSnapshotChangeFactory.ToDetectedChange`, so
`Ingestion.ChangeDetector` never raises a false change event from unstable
ordering. See `AccountSnapshotChangeFactoryTests.cs` and
`RealDataAccountSnapshotTests.cs` (the latter uses real captured live data,
not synthetic fixtures) for the proof. This is not wired into
`AgentWorker`'s continuous poll loop this phase — there is no "which
accounts to track" concept yet, and building one is out of scope; this is
the proven, ready building block for that, not the wiring itself.

## SQL safety

Every method is parameterized (`Microsoft.Data.SqlClient.SqlParameter`,
explicit `VarChar`/size matching the real column), `SELECT`-only, and
never builds `CommandText` by concatenating input. The batched
`Character` name lookup's `IN (...)` placeholder names
(`@name0, @name1, ...`) are generated purely from the requested count,
never from the values themselves — see `InClausePlaceholders.cs` and
`InClausePlaceholdersTests.cs`'s structural injection-safety proof — so a
malicious character name cannot influence the generated SQL text
regardless of its content.

## Real-data validation

Every method's real query text and real result was hand-validated against
the live server via the pre-existing `bm-sql` bridge — see
`references/game-data/sql-discovery/phase-2b-readmodel-validation-20260820/`.
This validates the SQL logic against real data; it does not mean
`Microsoft.Data.SqlClient` itself has opened a connection from this
codebase to the real server (no such connection is possible from the
current dev environment — see that evidence directory's README for why).
