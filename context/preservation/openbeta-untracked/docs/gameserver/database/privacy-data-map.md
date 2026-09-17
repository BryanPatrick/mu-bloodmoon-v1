---
status: LIVING_DOCUMENT
category: gameserver/database
audience: internal (engineering + legal review)
lastVerified: 2026-08-30
---

## Phase K hardening addendum (2026-08-30) — read this first

A full audit of all 138 tables' columns (not just the previously-known
identity tables) found that `sanitize-lab.sql`'s FIRST version left
**real, unpseudonymized player and admin identity** in the "sanitized"
lab. This is the most important correction in this document's history —
summarized here, full detail in each section below and in
`references/game-data/sql-discovery/gameserver-lab-20260830/sanitize-lab.sql`'s
own "PHASE K HARDENING" comment block.

**Real leak found and fixed**: `DmN_Admin_Logins.ip` held 7 REAL
production IP addresses in plain text after a full run of the original
script — its `memb___id` value is the literal string `'admin'` (a panel
role name, not a player login), so the original UPDATE's `INNER JOIN`
against `LabLoginMap` never matched any row, silently skipping the IP
pseudonymization too. Found by inspecting real row data, not by
name-pattern matching — exactly why Bryan's instruction was to inspect
real usage, not rely on field names alone.

**Also found un-pseudonymized** (never covered by the original script at
all): `DmN_OnlineCheck` (real logins), `MEMB_STAT` (real login + real
IP), `CustomJewelBank`, `Gens_Rank`, `HelperData`, `T_CGuid`,
`OptionData`, `QuestKillCount`, `QuestWorld`, `MasterSkillTree` (real
character names). All fixed; the lab was rebuilt from a fresh restore of
the source backup and the full sanitization + GameBridge test cycle was
re-run clean (11/11 PASS).

**Forward-safety additions** (currently empty, extended defensively per
Bryan's explicit instruction): `PixPayments`, `ExtWarehouse`,
`CustomJewelBank`-adjacent tables, `CustomGift`, `GremoryCase`,
`CustomDailyReward`, `CustomItemVisualBackup`/`Default`, `CustomReBuild`,
`CustomRewardItem`, `EventLeoTheHelper`/`SantaClaus`, `Gens_Reward`,
`LuckyCoin`, `CashShopInventory`, plus every remaining `DmN_*` table
carrying an email/password/salt/IP-shaped column (`DmN_Email_Confirmation`,
`DmN_Bulk_Emails`, `DmN_Support_Tickets`, `DmN_User_Salts`, `DmN_Market`,
`DmN_Refferals`, the payment-gateway `payer_email` columns,
`DmN_Login_Attempts`, `DmN_GoogleAds_Click`, the `DmN_Votereward_*_Log`
family, `DmN_Warehouse_Delete_Log`, `DmN_Shop_Logs`).

# GameServer database — privacy / sensitive data map

Field-by-field classification of every personal/sensitive column found in
the real restored database copy (`lab-environment.md`), done **before**
any value was rewritten, per Bryan's Part 8 instruction. Classifications:
`REMOVE`, `SANITIZE` (replace with a fixed non-identifying placeholder),
`PSEUDONYMIZE` (deterministic, reversible-with-the-mapping substitution —
see the terminology note in `lab-environment.md`), `PRESERVE_FOR_STRUCTURAL_TEST`,
`REVIEW_REQUIRED`.

## `MEMB_INFO` (the real account table)

| Column | Confirmed content | Classification | Applied |
|---|---|---|---|
| `memb___id` / `memb_name` | Login/display name | PSEUDONYMIZE | `LabLoginMap` |
| `memb__pwd` | The technical game credential (real value observed was a short alphanumeric string, consistent with a game password, not an obviously-hashed value) | SANITIZE | Fixed placeholder (`LABPWD001`) |
| `mail_addr` | Real email address (e.g. `teste1@gmail.com`) | PSEUDONYMIZE | `<lab-login>@lab.invalid` |
| `addr_info` / `addr_deta` / `post_code` | Postal address fields (empty in this snapshot, but real production could populate them) | REMOVE | Set `NULL` |
| `tel__numb` / `phon_numb` | Phone number fields (empty in this snapshot) | REMOVE | Set `NULL` |
| `fpas_ques` / `fpas_answ` | Security question/answer (empty in this snapshot) | REMOVE | Set `NULL` |
| `last_login_ip` | Real IP address | PSEUDONYMIZE | `LabIpMap` (RFC 5737 TEST-NET-3 range) |
| `AccountLevel`, `Admin`, `ctl1_code`, `bloc_code`, `activated` | Operational/status flags, not identity | PRESERVE_FOR_STRUCTURAL_TEST | Unchanged |

## Character/account identity, everywhere it's referenced

| Table.Column | Classification | Applied |
|---|---|---|
| `AccountCharacter.Id`, `.GameID1..10`, `.GameIDC` | PSEUDONYMIZE (login + character names) | `LabLoginMap` / `LabNameMap` |
| `Character.Name`, `.AccountID` | PSEUDONYMIZE | `LabNameMap` / `LabLoginMap` |
| `Guild.G_Master`, `GuildMember.Name` | PSEUDONYMIZE | `LabNameMap` |
| `Guild.G_Name`, `GuildMember.G_Name` | PSEUDONYMIZE | `LabGuildMap` |
| `CustomMarketShop.SellerAccount`/`.SellerName` | PSEUDONYMIZE | `LabLoginMap` / `LabNameMap` |
| `CashShopData.AccountID`, `warehouse.AccountID` | PSEUDONYMIZE | `LabLoginMap` |
| `T_FriendMain.Name`, `T_FriendList.FriendName`, `T_WaitFriend.FriendName` | PSEUDONYMIZE | `LabNameMap` |

`T_FriendMain.GUID`/`T_FriendList.GUID`/`.FriendGuid`/`T_WaitFriend.GUID`/
`.FriendGuid` (the internal numeric friend-system identifiers) are
**PRESERVE_FOR_STRUCTURAL_TEST** — on their own, a bare integer sequence
number is not identity-revealing, and preserving it exactly is what keeps
the real relationship graph (including the 5 orphaned entries) intact for
testing.

## Security/audit log tables (legacy `DmN_*`)

| Table | Sensitive columns | Classification | Applied |
|---|---|---|---|
| `DmN_IP_Log` | `account`, `ip` | PSEUDONYMIZE | `LabLoginMap` / `LabIpMap` |
| `DmN_Admin_Logins` | `memb___id`, `ip` | PSEUDONYMIZE | `LabLoginMap` / `LabIpMap` |
| `DmN_Account_Logs` | `account`, `ip` | PSEUDONYMIZE | `LabLoginMap` / `LabIpMap` (0 real rows in this snapshot) |
| `DmN_GM_Logs` | `account`, `ip` | PSEUDONYMIZE | `LabLoginMap` / `LabIpMap` (0 real rows in this snapshot) |
| `DmN_ChangeName_History` | `account`, `old_name`, `new_name` | PSEUDONYMIZE | Phase K: now wired into `sanitize-lab.sql` (`LabLoginMap`/`LabNameMap` joins on all three columns) — 0 real rows in this snapshot, so this is a no-op today but safe for a future richer snapshot |
| `DmN_Ban_List` | `name` | PSEUDONYMIZE | Phase K: now wired in — 0 real rows today |

## New tables found this round (Phase K full-138-table audit)

| Table.Column | Confirmed content | Classification | Applied |
|---|---|---|---|
| `MEMB_STAT.memb___id` / `.IP` | Real login + real IP of the currently-tracked connection/session state | PSEUDONYMIZE | `LabLoginMap` / `LabIpMap` — real leak found and fixed |
| `DmN_OnlineCheck.memb___id` | Real login, legacy per-server online-time tracker | PSEUDONYMIZE | `LabLoginMap` — real leak found and fixed |
| `DmN_Admin_Logins.ip` | Real admin-panel-login IP address | PSEUDONYMIZE | `LabIpMap` — **real leak found and fixed** (see addendum above); `.memb___id` itself is the literal `'admin'` role name, NOT_PERSONAL_DATA, left unchanged |
| `CustomJewelBank.AccountID`, `Gens_Rank.Name`, `HelperData.Name`, `T_CGuid.Name`, `OptionData.Name`, `QuestKillCount.Name`, `QuestWorld.Name`, `MasterSkillTree.Name` | Real login/character name, character progression/customization tables | PSEUDONYMIZE | `LabLoginMap`/`LabNameMap` — real leak found and fixed |
| `PixPayments.Account` | A real, previously-undocumented Brazilian PIX payment table (`TxId`/`Valor`/`PixPgmtAprovado`/`PixResgatado`) living directly in the GameServer schema, outside both the DmN CMS and the Portal's own payment system | PSEUDONYMIZE (forward-safety) | `LabLoginMap` — 0 real rows today; see `economy-data-map.md` for the full finding |
| `ExtWarehouse.AccountID`, `LuckyCoin.AccountID`, `CashShopInventory.AccountID`, `CustomGift.AccountID`, `CustomPlayToEarn.Account`, `GremoryCase.AccountID`/`.Name` | Real account/character-keyed storage tables | PSEUDONYMIZE (forward-safety) | `LabLoginMap`/`LabNameMap` — 0 real rows today |
| `CustomRewardItem.Name`, `EventLeoTheHelper.Name`, `EventSantaClaus.Name`, `Gens_Reward.Name`, `CustomDailyReward.Name`/`.Account`, `CustomItemVisualBackup`/`Default.Name`/`.Account`, `CustomReBuild.Name` | Real character-keyed progression/event tables | PSEUDONYMIZE (forward-safety) | `LabNameMap`/`LabLoginMap` — 0 real rows today |

## Automated sanitization verification (Phase L, Part 6)

The first sanitization pass (Phase K) left real IP addresses in
`DmN_Admin_Logins` undetected until manually found — a real recurrence
risk. Fixed with a real, tested, automated verification script:
`references/game-data/sql-discovery/gameserver-lab-20260830/verify-sanitization.sql`.

**Run after every lab refresh**, right after `sanitize-lab.sql`:

```powershell
sqlcmd -S localhost -E -d bloodmoon_gameserver_lab -i "references/game-data/sql-discovery/gameserver-lab-20260830/verify-sanitization.sql"
```

Checks, all real and cross-referenced against the mapping tables (not
hand-maintained lists that can drift): every identity-bearing
table/column pair sanitize-lab.sql is supposed to have touched is
checked for the presence of ANY real `LabLoginMap`/`LabNameMap`/`LabIpMap`
value; `memb__pwd` is checked for synthetic-or-ANONYMIZE-scrambled shape;
`fpas_ques`/`fpas_answ` checked NULL; `DmN_User_Salts.session_salt`/
`DmN_Market.item_password` checked redacted; payment `payer_email`
columns checked redacted. **Fails loudly** — `RAISERROR(...) WITH LOG`,
non-zero `sqlcmd` exit code — if anything prohibited remains, so a CI-style
gate or a human running it manually cannot silently miss a failure.

**Real proof this works, both directions**: first run correctly caught a
row (`labacct02.memb__pwd`) that didn't match the synthetic placeholder —
investigated, and confirmed as a legitimate false positive (the row was
scrambled by a real `bm_AnonymizeGameAccount` test run earlier in this
session, not a sanitization leak — both `LABPWD001` and an
`ANON`-prefixed value are equally safe, non-real-password states). The
check was refined to accept both, and the script now returns a clean
`PASS`/exit 0. This is exactly the kind of second-order verification gap
("is my checker itself correct?") worth documenting honestly rather than
silently fixing.

## Sensitive-field audit scope (Phase K)

All 138 real tables' columns were pattern-matched for
email/password/hash/salt/token/session/IP/phone/device/payment/note/
message/answer/admin/recovery/login/account/name shapes, then each match
was individually reviewed (not trusted by name alone) against real row
data where the table had any. Summary: **~120 sensitive-shaped columns**
reviewed across all 138 tables; **111 handled** (either genuinely
NOT_PERSONAL_DATA after review — e.g. `Character.Leadership`,
`CustomQuest.Quest` matched the regex on a substring coincidence, not a
real IP/question field — or PSEUDONYMIZE/SANITIZE/REMOVE applied and
verified); **9 UNKNOWN/REVIEW_REQUIRED** remain, all inside dormant
`DmN_*` tables with 0 real rows where the exact real-world shape of a
populated row has never been observed (`DmN_Shopp.payment_type`,
`DmN_Support_Departments.payment_type`, `DmN_Vip_Packages.payment_type`,
and a handful of similar enum-shaped `int` columns whose real values
were never seen — these are flagged, not silently assumed safe, and
require inspection if this legacy system is ever revived).

## Dormant legacy tables with sensitive-shaped columns but zero real data

Confirmed **zero rows** in the real restored snapshot, so nothing to
sanitize, but the columns themselves would need the same treatment if
ever populated: `DmN_2CheckOut_Transactions.payer_email`,
`DmN_Donate_Transactions.payer_email`, `DmN_PagSeguro_Transactions.payer_email`,
`DmN_Email_Confirmation.email`, `DmN_Bulk_Emails.recipient_list`,
`DmN_Market.item_password`, `DmN_Refferals.refferal_ip`,
`DmN_User_Salts.session_salt`. **REVIEW_REQUIRED** if a future backup
ever has real rows in these tables.

## What was NOT found (searched for, confirmed absent)

No payment card numbers, no government ID fields beyond the Portal's own
`personalIdHash` (a Portal-side field, not present in this GameServer
database at all), no biometric data, no chat/message content tables with
real rows in this snapshot (`DmN_Support_Tickets`/`DmN_Support_Replies`
are real tables but had 0 rows).

## Terminology note (repeated deliberately, per Bryan's instruction)

Every transformation above is **PSEUDONYMIZATION**: a deterministic,
recorded, reversible-with-the-mapping substitution
(`references/game-data/sql-discovery/gameserver-lab-20260830/sanitize-lab.sql`).
Nothing in the lab database should ever be described as "anonymized."
