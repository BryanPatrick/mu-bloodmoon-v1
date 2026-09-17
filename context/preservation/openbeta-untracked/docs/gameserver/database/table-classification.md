---
status: LIVING_DOCUMENT
category: gameserver/database
audience: internal (engineering)
lastVerified: 2026-08-30
---

# GameServer database — full table classification (Phase K, Part 6)

Every one of the 138 real tables classified into a domain, per Bryan's
explicit instruction that no table remain undocumented. Row counts below
are from the pristine, freshly-restored/sanitized lab (before the
GameBridge test run consumed 2 of 4 test accounts) — see
`docs/gameserver/database/lab-environment.md` for the exact source chain.
Confidence: CONFIRMED (real data/columns inspected this round),
STRONG_EVIDENCE (name/shape strongly implies the domain, not traced
through code), UNKNOWN (insufficient evidence).

## ACCOUNT (5)
`MEMB_INFO` (4 rows), `MEMB_STAT` (4), `AccountCharacter` (4),
`DmN_OnlineCheck` (4), `GameServerInfo` (1 — server metadata, STRONG_EVIDENCE).
CONFIRMED.

## CHARACTER (5)
`Character` (12), `T_CGuid` (17), `OptionData` (12), `DefaultClassType`
(7 — class definitions, not per-character, STRONG_EVIDENCE), `MasterSkillTree` (12).
CONFIRMED.

## GUILD (4)
`Guild` (2), `GuildMember` (2), `MuCastle_SIEGE_GUILDLIST` (0),
`Gens_Rank`/`Gens_Reward` (faction/alliance, arguably its own domain —
classified under GUILD since Gens membership is guild-driven,
STRONG_EVIDENCE) (1/0). CONFIRMED for Guild/GuildMember, STRONG_EVIDENCE
for the rest.

## INVENTORY / WAREHOUSE (5)
`warehouse` (2), `ExtWarehouse` (0), `T_PetItem_Info` (0 — pet-item
storage, STRONG_EVIDENCE), `MuMakerFinderMaker` (0 — item-maker tool
state, STRONG_EVIDENCE), `GremoryCase` (0 — reward-case storage).
CONFIRMED for warehouse/ExtWarehouse, STRONG_EVIDENCE for the rest.

## MARKET (1)
`CustomMarketShop` (5, real 8-column shape CONFIRMED this session).

## CASHSHOP / X-SHOP (5)
`CashShopData` (2), `CashShopInventory` (0), `CashShopPeriodicItem` (0),
`LuckyCoin` (0), `LuckyItem` (15 — a real, populated catalog table,
STRONG_EVIDENCE it's the X-Shop/lucky-item drop table). CONFIRMED for
CashShopData, see `economy-data-map.md` for the rest.

## VIP (1)
None natively beyond `MEMB_INFO.AccountLevel` (a column, not a table) —
see `vip-data-flow.md`. The legacy `DmN_Vip_*` family (3 tables, DEAD) is
classified under LEGACY_DMN instead, since it's a separate, unused
system, not the live VIP mechanism.

## RESET / MASTER_RESET (0 dedicated tables)
Reset/master-reset counters live as columns on `Character` itself
(CONFIRMED — no dedicated table exists).

## QUEST (3)
`CustomQuest` (0, the one real FK), `QuestKillCount` (12), `QuestWorld` (12).
CONFIRMED.

## EVENT (2)
`EventLeoTheHelper` (0), `EventSantaClaus` (0). STRONG_EVIDENCE
(seasonal/event-specific character participation tables).

## RANKING (12 + 1 trigger)
All 12 `Ranking*` tables (`BloodCastle`/`CaptureTheFlag`/`CastleSiege`/
`ChaosCastle`/`Custom`/`DevilSquare`/`Duel`/`IllusionTemple`/`KingGuild`/
`KingPlayer`/`MataMata`/`TvT`, all 0 rows in this snapshot — real
schemas documented in `logical-relationships.md`), plus the
`DmN_Update_Killer_Ranking` trigger (fires on `Character`, feeds a
ranking mechanism — `views-triggers-functions.md`). CONFIRMED schema,
STRONG_EVIDENCE for exact trigger behavior.

## FRIEND_SOCIAL (4)
`T_FriendMain` (17), `T_FriendList` (0), `T_WaitFriend` (0),
`T_FriendMail` (0 — friend-to-friend mail, not used by any GameBridge
operation). CONFIRMED.

## CASTLE SIEGE (5 — a GUILD-adjacent sub-domain)
`MuCastle_DATA` (1), `MuCastle_MONEY_STATISTICS` (0), `MuCastle_NPC`
(10 — real NPC catalog for the castle), `MuCastle_REG_SIEGE` (0),
`MuCastle_SIEGE_GUILDLIST` (0). CONFIRMED (real dependency data from
14 `WZ_CS_*` procedures, `stored-procedures.md`).

## SOCIAL/OTHER GAMEPLAY (2)
`Marry` (0 — in-game marriage system), `WZ_CW_INFO` (1 — a real,
populated single-row table, purpose STRONG_EVIDENCE only: name suggests
"class war" or similar event-config state, not traced further).

## CUSTOM CONTENT (10)
`CustomDailyReward` (0), `CustomGift` (0), `CustomItemVisualBackup` (0),
`CustomItemVisualDefault` (0), `CustomJewelBank` (2), `CustomPlayToEarn`
(0), `CustomReBuild` (0), `CustomRewardItem` (0), `HelperData` (4 — a
per-character "helper"/pet configuration blob), `WeaponKillCount` (0 —
per-weapon PvP kill tracking, STRONG_EVIDENCE).

## PAYMENTS (1, previously undocumented)
`PixPayments` (0) — a real Brazilian PIX payment table living directly
in the GameServer schema, outside both the DmN CMS and the Portal's own
payment system. See `economy-data-map.md` Part 9 for the full finding.
CONFIRMED to exist, UNKNOWN what (if anything) currently writes to it.

## SANCTION (0 dedicated tables in this scope)
No dedicated ban/sanction table was found among the 138 outside the
legacy `DmN_Ban_List` (classified under LEGACY_DMN) — real production
sanction mechanics (`ctl1_code`/`bloc_code` on `MEMB_INFO`) are columns,
not a table.

## LOGGING (4, live engine)
`MEMB_STAT` (classified under ACCOUNT above, also serves a logging role),
`DmN_IP_Log`/`DmN_Admin_Logins`/`DmN_OnlineCheck` — classified under
LEGACY_DMN below despite being ACTIVE_CONFIRMED, since they are part of
the DmN schema family, not a native engine logging system.

## GAMEBRIDGE (0 native tables)
The four `bm_*` procedures write only to already-classified native
tables above — GameBridge has no tables of its own in this database (by
design; all GameBridge state that needs its own storage lives in
Cloudflare D1, per `docs/game-data/architecture.md`).

## LEGACY_DMN (75)
All 75 `DmN_`-prefixed tables — full inventory and per-table
classification (ACTIVE_CONFIRMED/READ_ONLY_LEGACY/DORMANT/DEAD/UNKNOWN)
in `legacy-unknown-structures.md`, not repeated here.

## OTHER / UNKNOWN (2)
`DmN_Account_Invt`, `DmN_Mmotop_Stats` — already flagged UNKNOWN in
`legacy-unknown-structures.md` (ambiguous purpose, 0 real rows).

## Reconciliation

5+5+4+5+1+5+1+0+3+2+13+4+5+2+10+1+0+4+0+75 = 145 listed above because
several tables are deliberately cross-referenced under two headings
(e.g. `MuCastle_*` under both CASTLE SIEGE and implicitly GUILD,
`MEMB_STAT` under both ACCOUNT and LOGGING) — the real, non-duplicated
total is 138, matching `database-overview.md`. This is stated explicitly
so the classification table is never mistaken for an independent table
count.
