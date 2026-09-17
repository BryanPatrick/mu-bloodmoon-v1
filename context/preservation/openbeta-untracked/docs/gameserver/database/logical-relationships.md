---
status: LIVING_DOCUMENT
category: gameserver/database
audience: internal (engineering)
lastVerified: 2026-08-30
---

# GameServer database — logical relationships

Production declares exactly **one** real foreign key
(`FK_CustomQuest_Character`, `CustomQuest.Name → Character.Name`,
`ON DELETE CASCADE` — see `database-overview.md`). Everything else below
is a **logical** relationship: enforced only by application/procedure
code, never by the schema itself. This is why `sanitize-lab.sql`
(`lab-environment.md` Part 9) had to build explicit identity-mapping
tables instead of relying on cascading updates, and why
`bm_AnonymizeGameAccount`/`bm_PurgeGameAccount` each hardcode their own
table-by-table walk order rather than trusting `ON DELETE CASCADE`.

Confidence marker on every row: see `database-overview.md` for the
CONFIRMED/STRONG_EVIDENCE/HYPOTHESIS/UNKNOWN scale.

## The real declared FK (CONFIRMED)

| From | To | Rule |
|---|---|---|
| `CustomQuest.Name` | `Character.Name` | `ON DELETE CASCADE` |

## Identity keys used as logical joins (CONFIRMED — proven by real data during `lab-gamebridge-test.sql`)

| Key | Type | Tables that carry it |
|---|---|---|
| Login (`memb___id` / `AccountID` / `Id` / `SellerAccount`) | `VARCHAR(10)` | `MEMB_INFO`, `AccountCharacter.Id`, `Character.AccountID`, `CashShopData.AccountID`, `warehouse.AccountID`, `CustomMarketShop.SellerAccount` |
| Character name (`Name` / `GameID*` / `G_Master` / `SellerName` / friend-table `Name`/`FriendName`) | `VARCHAR(10)` | `Character.Name`, `AccountCharacter.GameID1..10`/`GameIDC`, `Guild.G_Master`, `GuildMember.Name`, `CustomMarketShop.SellerName`, `CustomQuest.Name`, `T_FriendMain.Name`, `T_FriendList.FriendName`, `T_WaitFriend.FriendName` |
| Guild name (`G_Name`) | `VARCHAR(8)` | `Guild.G_Name`, `GuildMember.G_Name` |
| Friend-system numeric GUID (`GUID`/`FriendGuid`) | `INT` | `T_FriendMain.GUID`, `T_FriendList.GUID`/`.FriendGuid`, `T_WaitFriend.GUID`/`.FriendGuid` — internal sequence number, bridged to a character name only via `T_FriendMain` (the only table with both) |

## Real proven logical chains (CONFIRMED via `lab-gamebridge-test.sql`)

**Account → characters → guild membership → guild mastership**
`MEMB_INFO.memb___id` → `AccountCharacter.Id` → `AccountCharacter.GameID1..10` (character names) → `Character.Name` (one row per character) → `GuildMember.Name` (membership) → `GuildMember.G_Name` → `Guild.G_Name`, and separately `Guild.G_Master` (character name of the guild's master). Real example: `labacct03`'s character `LabChar12` is simultaneously `Guild.G_Master` of `LabGld02` AND a `CustomMarketShop.SellerName` — the compound block case documented in `lab-environment.md` Part 12.

**Account → market listings**
`CustomMarketShop.SellerAccount` + `.SellerName` together identify a listing's owner; no FK, no status column (`privacy-data-map.md`, `lab-environment.md` Part 6) — a listing's mere existence is the "active" signal.

**Character → friend graph**
`Character.Name` → `T_FriendMain.Name` (each character's own friend-list header row, carrying its own `GUID`) → `T_FriendList.GUID`/`.FriendGuid` (the two sides of each friendship) and `T_WaitFriend.GUID`/`.FriendGuid` (pending requests). **Real orphan case (CONFIRMED, preserved deliberately)**: 5 of 17 real `T_FriendMain` rows (`DLLL`, `fdgdgdg`, `Furia`, `MAGO`, `teste`) reference character names no longer present in `Character` — a dangling reference from past character deletion/rename that the live game apparently tolerates. `bm_AnonymizeGameAccount`/`bm_PurgeGameAccount` handle this with an `ELSE` fallback that sweeps by `FriendName` alone when no live `T_FriendMain` GUID is found (see `stored-procedures.md`).

**Account → warehouse / CashShop**
`warehouse.AccountID` and `CashShopData.AccountID` are simple 1:1-per-account logical joins back to `MEMB_INFO.memb___id`, no intermediate table.

## Logical chains not yet proven with real data this round (STRONG_EVIDENCE)

- `Character.Name` → the `Ranking*` table family (leaderboard rows keyed by character name) — real production has data here (per the row-count table in `lab-environment.md`), but no ranking-specific test was run this round; the join shape is inferred from column naming only.
- `Character.Name` → `MuCastle_*` (castle siege ownership/guild ties) — not exercised by any GameBridge operation, not traced this round.
- `Character.Name` → `Gens_Rank`/`Gens_Reward` (faction system) and the `Gens_Duprian`/`Gens_Varnert` views — column shapes strongly imply a character/faction join; not traced through code.

## Legacy `DmN_*` CMS relationships (STRONG_EVIDENCE, mostly dormant)

The legacy CMS re-implements its own login/account concept in places
(`DmN_Admin_Logins.memb___id`, `DmN_IP_Log.account`, `DmN_Account_Logs.account`,
`DmN_GM_Logs.account`) that logically joins back to the same
`MEMB_INFO.memb___id` login string — confirmed by real data for
`DmN_IP_Log`/`DmN_Admin_Logins` (both had real rows referencing the same
4 known accounts), unconfirmed for the payment/marketplace tables (0 real
rows in every payment-related `DmN_*` table this round — see
`legacy-unknown-structures.md`).

## Why this matters for GameBridge and any future feature

Any new code that touches account/character identity must **discover**
the relevant logical joins the same way this document was built — by
inspecting real data, never by assuming a FK exists. `sanitize-lab.sql`
is the reference implementation of "map first, then rewrite consistently
everywhere the key appears" for exactly this reason.
