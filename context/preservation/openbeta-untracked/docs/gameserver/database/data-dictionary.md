---
status: LIVING_DOCUMENT
category: gameserver/database
audience: internal (engineering)
lastVerified: 2026-08-30
---

# GameServer database — data dictionary

Column-level detail for the tables GameBridge actually reads or writes,
plus the identity/log tables covered in `privacy-data-map.md`. This is
**not** a dump of all 138 tables' full column lists — it's the subset
that's been confirmed via real schema inspection and real data this
round. For everything else, see `stored-procedures.md`/
`legacy-unknown-structures.md` for what's catalogued at the name level
only.

## `MEMB_INFO`

| Column | Type | Notes |
|---|---|---|
| `memb___id` | `VARCHAR(10)` | Login, PK-equivalent (no declared PK — confirmed via real duplicate-free check) |
| `memb_name` | `VARCHAR(10)` | Display name shown in-game account context |
| `memb__pwd` | `VARCHAR(10)` | Game credential — CONFIRMED not obviously hashed (see `privacy-data-map.md`) |
| `mail_addr` | `VARCHAR(50)` | Email |
| `addr_info` / `addr_deta` / `post_code` | `VARCHAR` | Postal address fields, empty in this snapshot |
| `tel__numb` / `phon_numb` | `VARCHAR` | Phone fields, empty in this snapshot |
| `fpas_ques` / `fpas_answ` | `VARCHAR` | Password-recovery question/answer, empty in this snapshot |
| `last_login_ip` | `VARCHAR(50)` | Last known IP |
| `AccountLevel` | `TINYINT` | VIP tier — the column GRANT_VIP/SYNC_VIP_TIER write |
| `Admin` | `TINYINT` | Native admin flag (distinct from the Portal's own RBAC — STRONG_EVIDENCE only, not traced) |
| `ctl1_code` / `bloc_code` | `TINYINT` | Ban/block status flags (STRONG_EVIDENCE from naming) |
| `activated` | `TINYINT` | Account activation flag |

## `AccountCharacter`

| Column | Type | Notes |
|---|---|---|
| `Id` | `VARCHAR(10)` | Login, joins to `MEMB_INFO.memb___id` |
| `GameID1`..`GameID10` | `VARCHAR(10)` | Up to 10 character-slot names |
| `GameIDC` | `VARCHAR(10)` | Currently-selected character name |

## `Character`

| Column | Type | Notes |
|---|---|---|
| `Name` | `VARCHAR(10)` | PK-equivalent, the universal character join key |
| `AccountID` | `VARCHAR(10)` | Joins to `MEMB_INFO.memb___id` |
| Reset count column(s) | numeric | CONFIRMED present and populated (real values up to 104 observed); exact column name not re-stated here — see `account-data-map.md`/`character-data-map.md` for usage context |
| Master-reset column(s) | numeric | Same confidence basis as reset count |
| `PKCount` | `INT` | Native player-kill counter (CONFIRMED, Phase K — read the real `DmN_Update_Killer_Ranking` trigger body) |
| `dmn_last_server_pk_count` | `INT` | Trigger-maintained snapshot of the last-seen `PKCount`, used to compute the delta on each update (CONFIRMED, Phase K) |
| `dmn_pk_count` | `INT` | Trigger-maintained, monotonically-increasing cumulative kill counter, distinct from the resettable `PKCount` (CONFIRMED, Phase K) — see `views-triggers-functions.md` for the full trigger logic |

## `Guild` / `GuildMember`

| Table.Column | Type | Notes |
|---|---|---|
| `Guild.G_Name` | `VARCHAR(8)` | Guild name, PK-equivalent |
| `Guild.G_Master` | `VARCHAR(10)` | Character name of the guild master |
| `GuildMember.Name` | `VARCHAR(10)` | Member's character name |
| `GuildMember.G_Name` | `VARCHAR(8)` | Joins to `Guild.G_Name` |

## `CustomMarketShop` (full real shape, CONFIRMED)

| Column | Type | Notes |
|---|---|---|
| `ItemGUID` | `INT` | PK |
| `AuthCode` | `INT` | Item authenticity/verification code |
| `SellerAccount` | `VARCHAR(10)` | Joins to `MEMB_INFO.memb___id` |
| `SellerName` | `VARCHAR(10)` | Joins to `Character.Name` |
| `Price` | `INT` | Listing price |
| `PriceType` | `TINYINT` | Currency type (STRONG_EVIDENCE — Zen vs. premium currency, not traced) |
| `Item` | `VARBINARY(16)` | Serialized item data blob |
| `Tax` | `INT` | Listing tax amount |

No status/active/sold/cancelled column — existence is the only signal
(see `economy-data-map.md`).

## `CashShopData` / `warehouse`

Both confirmed to carry an `AccountID VARCHAR(10)` column joining to
`MEMB_INFO.memb___id`; full item/currency column detail not enumerated
this round (out of GameBridge's touch scope beyond delete-on-purge).

## `T_FriendMain` / `T_FriendList` / `T_WaitFriend` (real shape, CONFIRMED — corrected this session)

| Table.Column | Type | Notes |
|---|---|---|
| `T_FriendMain.GUID` | `INT` | Internal friend-system sequence number, PK |
| `T_FriendMain.Name` | `VARCHAR(10)` | Character name — joins to `Character.Name` |
| `T_FriendList.GUID` / `.FriendGuid` | `INT` | Both sides of a friendship, join to `T_FriendMain.GUID` |
| `T_FriendList.FriendName` | `VARCHAR(10)` | Denormalized friend name (fallback join key) |
| `T_FriendList.Del` | `TINYINT`/`BIT` | Soft-delete flag (STRONG_EVIDENCE) |
| `T_WaitFriend.GUID` / `.FriendGuid` / `.FriendName` | same shapes | Pending friend requests |

**No `Name` column exists on `T_FriendList`/`T_WaitFriend`** — a real
schema bug in the originally-written `bm_*` procedures, found and fixed
this session (see the top-level session history / `stored-procedures.md`).
No PK/unique index on either table (CONFIRMED).

## `appl_days` and siblings — resolved (Phase L, Part 2)

Real, complete column list for `MEMB_INFO` pulled this round (34 columns
total, superseding the earlier partial capture): `appl_days`,
`modi_days`, `out__days`, `true_days` — all `DATETIME`, all nullable, a
classic quadruplet naming pattern from the original Korean MU Online
account-schema lineage (`appl`=application/registration,
`modi`=modification, `out`=withdrawal, `true`=real-name/verification
date). Also newly catalogued on `MEMB_INFO`: `job__code CHAR(2)`,
`activation_id VARCHAR(50)`, `country VARCHAR(50)`, `dmn_country VARCHAR(50)`
(two country columns — one plain, one `dmn_`-prefixed, another example of
the legacy CMS naming bleeding into the live account table).

**Meaning (CONFIRMED, real source read this round)**: `appl_days` is set
to the current time when a new account is created **through the legacy
`hostbr-web` CMS's own registration flow**
(`application/models/model.account.php`'s `create_account()`:
`['field' => 'appl_days', 'value' => time(), 'type' => 'd']`) — it is the
account's "joined" date as displayed by that panel.

**Readers (CONFIRMED, same codebase)**: `model.account.php` (formats it
for display), `model.admin.php` (registration-rate dashboards —
daily/weekly/monthly counts, sorts account search by `appl_days DESC`),
and `tasks/RemoveNotVerifiedAccounts.php` — a cleanup cron:
`DELETE FROM MEMB_INFO WHERE activated = 0 AND appl_days < DATEADD(DAY, -15, GETDATE())`,
a 15-day unverified-account purge keyed directly off this column.

**Relationship to `AccountLevel`/VIP**: none — `appl_days` is a pure
registration-timestamp field, unrelated to VIP duration/expiry
(`AccountExpireDate`, a completely different column — see
`docs/vip/wz-setaccountlevel-coexistence.md`).

**Is NULL/empty normal?** Yes for any account never created through the
legacy panel's own registration flow — confirmed: all real accounts in
the restored snapshot show `appl_days`/`modi_days`/`out__days`/`true_days`
all `NULL`, consistent with Blood Moon's accounts having been provisioned
through GameBridge's `CREATE_GAME_ACCOUNT`, not this legacy path.

**Does `WZ_SetAccountLevel` touch it?** No — confirmed via full-text
read of its real body (`wz-setaccountlevel-coexistence.md`); no
procedure among all 90 references `appl_days` at all (a full-text search
of every procedure body found zero hits).

**Should GameBridge touch it?** No — it's a legacy-panel-specific
registration-tracking field with no bearing on any GameBridge operation
today; touching it would be scope creep with no functional benefit.

## Legacy `DmN_*` sensitive columns (see `privacy-data-map.md` for full classification)

`DmN_IP_Log(account, ip)`, `DmN_Admin_Logins(memb___id, ip)`,
`DmN_Account_Logs(account, ip)`, `DmN_GM_Logs(account, ip)`,
`DmN_ChangeName_History(account, old_name, new_name)`,
`DmN_Ban_List(name)`, plus the payment/email/session columns listed in
`legacy-unknown-structures.md`.

## What this document does NOT claim

This is not a full 138-table column dictionary. Tables outside
GameBridge's real touch set (item/inventory placement, skill trees,
`Ranking*`, `MuCastle_*`, `Gens_*`, the bulk of the `DmN_*` family) are
named in `database-overview.md`/`legacy-unknown-structures.md` but their
column-level detail was not captured here — `MISSING` per
`docs/README.md`'s roadmap, not silently assumed documented.
