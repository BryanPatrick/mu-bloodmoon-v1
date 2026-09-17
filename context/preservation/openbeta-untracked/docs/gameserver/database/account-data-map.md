---
status: LIVING_DOCUMENT
category: gameserver/database
audience: internal (engineering)
lastVerified: 2026-08-30
---

# GameServer database — account data map

How a player account exists on the GameServer side, and exactly how the
four GameBridge operations touch it. Cross-reference:
`docs/gamebridge/gamebridge-agent-extension-plan.md` (the original design),
`privacy-data-map.md` (sensitive-field classification),
`logical-relationships.md` (the join keys used below).

## Core account row

`MEMB_INFO` (CONFIRMED) — one row per login. Key columns actually used by
GameBridge: `memb___id` (login, the join key everywhere), `AccountLevel`
(the VIP-tier integer GRANT_VIP/SYNC_VIP_TIER write), plus the
identity-bearing columns catalogued in `privacy-data-map.md`.

## GRANT_VIP (CONFIRMED — real SQL + real Agent tests passing)

Writes `MEMB_INFO.AccountLevel` only, MAX-rule (never downgrades an
existing higher value). No other table touched. Idempotent — re-granting
the same or lower level is a no-op success. Real concurrency proven via
`Task.WhenAll` racing two grants against the same account
(`SqlServerLocalIntegrationTests.cs`) — final state is always the higher
of the two requested levels, never a lost update.

## SYNC_VIP_TIER (CONFIRMED — real SQL + real Agent tests passing)

Writes `MEMB_INFO.AccountLevel` to a Portal-authoritative desired value,
**including downgrade** — this is the reconciliation path, distinct from
GRANT_VIP's MAX-rule. Idempotent (syncing to the already-current value is
a no-op, `Changed=0`). Real test: `labacct02` synced from AL2 down to
AL0 in `lab-gamebridge-test.sql`, confirmed `Changed=1`.

## ANONYMIZE_GAME_ACCOUNT (CONFIRMED — real SQL against real relational data)

Per-account, per-character pseudonymization/tombstoning. Real dependency
walk, in order:

1. **Guild-master check (BLOCKS first)** — `Guild.G_Master` matched
   against any of the account's character names. Real proof:
   `labacct01` (guild master, 104-reset character) and `labacct03`
   (simultaneously guild master AND active market seller) both correctly
   returned `GUILD_MASTER_BLOCKED`, confirming the guild check fires
   *before* the market check when both would apply.
2. **Friend-graph cleanup** — for each character, look up
   `T_FriendMain.GUID` by `Name`; if found, delete matching
   `T_FriendList`/`T_WaitFriend` rows by `GUID`/`FriendGuid`; if not
   found (the account's character was never in `T_FriendMain`, or only a
   stale/orphaned reference exists), fall back to a `FriendName`-only
   sweep. Real proof: `labacct02`'s character `LabChar17` (`Trakinas`)
   removed from `T_FriendMain`; exactly 1 of 17 real rows changed, the 5
   pre-existing orphaned rows (`logical-relationships.md`) left untouched.
3. **Character tombstoning** — `Character.Name` rewritten to a
   non-reversible placeholder (real proof: `labacct02`'s row renamed away
   from `Trakinas`, confirmed via a post-check `Name <> 'LabChar17'`).
4. **`MEMB_INFO` identity fields blanked** — email/IP/password fields
   cleared or replaced, matching the `SANITIZE`/`REMOVE` classification
   in `privacy-data-map.md`.
5. **Character-name-keyed progression/customization data renamed in
   lockstep** — `T_CGuid`, `HelperData`, `MasterSkillTree`, `OptionData`,
   `QuestKillCount`, `QuestWorld`, `CustomRewardItem`, `EventLeoTheHelper`,
   `EventSantaClaus`, `Gens_Rank`, `Gens_Reward`, `CustomDailyReward`,
   `CustomItemVisualBackup`, `CustomItemVisualDefault`, `CustomReBuild`,
   and 11 of the 12 Ranking tables (see the Phase K correction note
   below).
6. **Account-keyed storage/currency tables removed** — `ExtWarehouse`,
   `CustomJewelBank`, `LuckyCoin`, `CashShopInventory`, `CustomGift`,
   `GremoryCase`.

Idempotent — a second call against an already-anonymized account returns
a defined "already done" result rather than erroring or re-tombstoning.
`CustomMarketShop` block check confirmed CONFIRMED (not hypothetical):
because the table has no status column, ANY existing row for the seller
blocks anonymization — proven structurally correct against `labacct03`'s
5 real active listings.

### Phase K corrections (2026-08-30) — three real gaps found and fixed

A full 138-table audit (`docs/gameserver/database/data-dictionary.md`,
`logical-relationships.md`) found three real defects in the FIRST
version of this procedure, all now fixed and re-tested:

1. **MEMB_INFO fields never actually cleared.** The original procedure
   only reset `AccountLevel`/`memb__pwd` — `mail_addr`/`last_login_ip`/
   `addr_info`/`addr_deta`/`tel__numb`/`fpas_ques`/`fpas_answ`/
   `post_code`/`mail_chek` all survived untouched. An "anonymized"
   account's real email/IP/address/phone/security-question would have
   remained in the database. **Fixed.**
2. **~20 real character/account-keyed tables were never touched at
   all**, discovered by cross-checking against the native engine's own
   `WZ_RenameCharacter`/`WZ_DeleteCharacter` procedures' REAL table
   dependencies (via `sys.sql_expression_dependencies`, not guesswork) —
   see items 5/6 above for the full list. Without this fix, the
   character's real name would keep existing in every one of these
   tables even after "anonymization," and the account's real login
   would keep owning real stored value/items in `ExtWarehouse`/
   `CustomJewelBank`/etc. **Fixed.**
3. **`RankingKingGuild` was targeted incorrectly.** `RankingKingGuild.Name`
   is `VARCHAR(8)` — it is keyed by **guild** name, not character name
   (every other Ranking table is `VARCHAR(10)`, character-keyed,
   confirmed via `sys.columns`). The rename statement that used to target
   it compared a character name against a guild-name column and could
   never match a real row — harmless, but semantically wrong. Removed;
   `RankingKingGuild` is deliberately NOT touched by this procedure —
   guild-level ranking data belongs to the guild collectively, and a
   guild-master account is already `GUILD_MASTER_BLOCKED` before this
   code runs, so no live guild's ranking row is ever this account's alone
   to clean up.

Re-tested after all three fixes: 123/123 `.NET` Agent tests, and the
real-data lab script's ANONYMIZE/guild-master-block scenarios all still
PASS (full detail: `docs/gameserver/database/lab-environment.md`).

## PURGE_GAME_ACCOUNT (CONFIRMED — real SQL against real relational data)

Hard delete, same guild-master block as ANONYMIZE, same friend-graph
walk (via a `@FriendGuids TABLE` built from `T_FriendMain` first), then
removes rows from every table the account/characters appear in
(`MEMB_INFO`, `AccountCharacter`, `Character`, `CashShopData`,
`warehouse`, plus the friend tables above, plus — Phase K — every table
in the dependency matrix below). Real proof:
`labacct04` (real 102-reset character, no guild) fully removed —
verified absent from all tables post-purge, including `extendedCleanupRows:7`
real rows removed from the newly-covered tables (`MEMB_STAT`,
`DmN_OnlineCheck`, `T_CGuid`, `OptionData`, `QuestKillCount`, `QuestWorld`,
`MasterSkillTree` — exactly the 7 tables where this specific real
102-reset character had a row). Idempotent — replay against the same
login returns `ALREADY_PURGED` rather than an error or silent no-op.

### Phase K correction: `ExtWarehouse` is a real, separate table

The original procedure's comment claimed "ExtWarehouse is a column on
AccountCharacter, removed automatically" — true about the FLAG column
(`AccountCharacter.ExtWarehouse INT`, a tier/entitlement indicator), but
there is ALSO a genuinely separate `ExtWarehouse` TABLE
(`AccountID`/`Items` varbinary/`Money`/`Number`) that the original
procedure never touched at all, leaving a purged account's extended-
warehouse contents behind entirely. **Fixed** — see the dependency
matrix below.

## Purge / Anonymize dependency matrix (Part 5 deliverable, 2026-08-30)

Every table either procedure touches, its relation key, what each
operation does, the order it runs in, and confidence. `-` means not
applicable to that operation.

| Table | Relation key | ANONYMIZE action | PURGE action | Order | Confidence |
|---|---|---|---|---|---|
| `Guild`/`GuildMember` (master check) | `G_Master`/character Name | BLOCK if master | BLOCK if master | 0 (gate) | CONFIRMED |
| `CustomMarketShop` (seller check) | `SellerName` | BLOCK if any row | BLOCK if any row | 0 (gate) | CONFIRMED |
| `T_FriendMain`/`T_FriendList`/`T_WaitFriend` | `GUID`/`Name` bridge | DELETE via GUID lookup | DELETE via GUID lookup | 1 | CONFIRMED |
| `GuildMember` (non-master) | Name | DELETE (kick from guild) | DELETE | 2 | CONFIRMED |
| `CustomMarketShop` | SellerName | DELETE (0 rows possible, gate already checked) | DELETE | 3 | CONFIRMED |
| `T_CGuid`,`HelperData`,`MasterSkillTree`,`OptionData`,`QuestKillCount`,`QuestWorld`,`CustomRewardItem`,`EventLeoTheHelper`,`EventSantaClaus`,`Gens_Rank`,`Gens_Reward`,`CustomDailyReward`,`CustomItemVisualBackup`,`CustomItemVisualDefault`,`CustomReBuild` | Name | RENAME to tombstone | DELETE | 3b/5b | CONFIRMED (Phase K) |
| 11 of 12 Ranking tables (all except `RankingKingGuild`) | Name | RENAME to tombstone | DELETE | 3b/5 | CONFIRMED (Phase K) |
| `RankingKingGuild` | Guild name (VARCHAR(8), NOT character-keyed) | NOT TOUCHED (deliberate) | NOT TOUCHED (deliberate) | — | CONFIRMED (Phase K correction) |
| `CashShopData` | AccountID | ZERO balances | DELETE | 4/6 | CONFIRMED |
| `warehouse` | AccountID | DELETE | DELETE | 4/7 | CONFIRMED |
| `ExtWarehouse` (real table) | AccountID | DELETE | DELETE | 4b/6b | CONFIRMED (Phase K — real gap fixed) |
| `CustomJewelBank`,`LuckyCoin`,`CashShopInventory`,`CustomGift`,`GremoryCase` | AccountID (+Name for GremoryCase) | DELETE | DELETE | 4b/6b | CONFIRMED (Phase K) |
| `CustomQuest` | Name (the one real FK, `ON DELETE CASCADE`) | RENAME (via `NOCHECK`/`CHECK CHECK`) | DELETE (explicit, not relying on cascade) | 3a/8 | CONFIRMED |
| `AccountCharacter` | Id | field rewrite (GameID slots) | DELETE | 3c/9 | CONFIRMED |
| `Character` | Name | RENAME to tombstone | DELETE | 3d/10 | CONFIRMED |
| `MEMB_INFO` | memb___id | field clear (Phase K: now complete) | DELETE | 5/11 | CONFIRMED |
| `MEMB_STAT`,`DmN_OnlineCheck` | memb___id | NOT touched (see note) | DELETE | -/6b | CONFIRMED (Phase K, PURGE only) |
| `MuCastle_*` | Guild-keyed, not character/account-keyed | NOT TOUCHED | NOT TOUCHED | — | CONFIRMED — out of scope, these belong to the guild/castle-siege system, not an individual account |
| Legacy `DmN_*` (all except `MEMB_STAT`/`DmN_OnlineCheck` above) | various | NOT TOUCHED | NOT TOUCHED | — | CONFIRMED — deliberately out of scope (`legacy-unknown-structures.md`); mostly zero real rows anyway |

**Note on `MEMB_STAT`/`DmN_OnlineCheck` for ANONYMIZE**: not deleted,
because ANONYMIZE does not delete the login itself (`memb___id` is
unchanged by design — only the character names and PII fields are
removed) — an anonymized account can, in principle, still be connected
to under its unchanged (but now credential-scrambled and PII-free)
login, so its connection-state/online-time rows are left as harmless
operational telemetry, not identity. PURGE deletes the login entirely,
so these become genuinely orphaned if not also removed — hence PURGE
(but not ANONYMIZE) cleans them up.

## What GameBridge does NOT touch (confirmed scope boundary)

`Guild` itself (the guild row, as opposed to membership) is never
deleted or rewritten by either operation — this is *why* the
guild-master block exists: neither procedure has any logic to reassign
or dissolve a guild, so a guild-master account must be handled manually
(transfer mastership or disband the guild) before it can be
purged/anonymized. `MuCastle_*` (castle siege, guild-keyed) and the
legacy `DmN_*` family are also untouched — evaluated and deliberately
excluded (see the matrix above), not silently missed.
