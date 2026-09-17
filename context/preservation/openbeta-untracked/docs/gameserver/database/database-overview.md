---
status: LIVING_DOCUMENT
category: gameserver/database
audience: internal (engineering)
lastVerified: 2026-08-30
---

# GameServer database — overview

The real production database is `MuOnline`, hosted on a SQL Server¹
instance separate from the Portal's MySQL database. This document is the
top-level inventory; see the companion documents in this same folder for
depth on each area.

**Confidence markers used throughout `docs/gameserver/database/`**:
`CONFIRMED` (verified via real metadata or real data this session or a
prior one), `STRONG_EVIDENCE` (name/shape strongly implies a role but the
exact behavior wasn't traced through code), `HYPOTHESIS` (plausible but
unverified), `UNKNOWN` (genuinely not investigated).

## Real inventory (CONFIRMED, 2026-08-30)

| Object type | Count |
|---|---|
| Tables | 138 |
| Stored procedures² | 86 |
| Views | 2 (`Gens_Duprian`, `Gens_Varnert`) |
| Triggers | 1 (`DmN_Update_Killer_Ranking`, on `Character`) |
| Foreign keys | 1 (`FK_CustomQuest_Character`, `CustomQuest.Name → Character.Name`, `ON DELETE CASCADE`) |

Source: restored, validated local copy — see `lab-environment.md` for the
full provenance. Confirmed identical to live production for every table
checked directly (schema, not full inventory — see that document's Part 3
validation table).

## Two broad table families (CONFIRMED)

1. **The real, active GameServer engine tables** — the ones the actual
   game client/server binaries read and write during live play:
   `MEMB_INFO`, `Character`, `AccountCharacter`, `Guild`/`GuildMember`,
   `warehouse`, `CustomMarketShop`, `CashShopData`, `T_FriendMain`/
   `T_FriendList`/`T_WaitFriend`/`T_FriendMail`, the `Ranking*` family,
   `MuCastle_*` (castle siege), `Gens_Rank`/`Gens_Reward` (faction
   system), `CustomQuest`, `QuestWorld`/`QuestKillCount`, `MasterSkillTree`,
   `DefaultClassType`, `OptionData`, and others.
2. **The legacy "DmN CMS"** — a dormant, previously-undocumented
   third-party web panel's own 74+ tables (`DmN_*` prefix), covering a
   parallel payment-gateway integration (2CheckOut, PagSeguro, Interkassa,
   PayCall, CuentaDigital), its own VIP system (`DmN_Vip_*`), its own
   marketplace (`DmN_Market*`), referral rewards, vote rewards, and admin
   logs. **Confirmed dormant** (zero real transactions across every
   payment-related `DmN_*` table in the real snapshot examined) — see
   `legacy-unknown-structures.md`.

## Real vs. GameBridge-relevant subset

The GameBridge extension's four new operations
(`GRANT_VIP`/`SYNC_VIP_TIER`/`ANONYMIZE_GAME_ACCOUNT`/`PURGE_GAME_ACCOUNT`)
only ever touch a small, explicit subset of these 138 tables — see
`docs/gamebridge/gamebridge-agent-extension-plan.md` Part 4/5 for the
exact dependency map, now cross-validated against this real restored
copy (`lab-environment.md` Part 12).

## What this overview does NOT claim

This document does not claim exhaustive, line-by-line understanding of
all 138 tables or all 86 stored procedures — most of the legacy `DmN_*`
surface and the native `WZ_*`/`MMK_*` engine procedures were catalogued
by name and confirmed real, but their internal logic was not traced
through decompiled server code this round. See `stored-procedures.md`'s
own confidence markers per procedure, and
`docs/README.md`'s documentation roadmap for the honest completeness
status of each domain.

## Glossary of this document

1. **SQL Server**: see `docs/glossary.md`.
2. **Stored procedure**: see `docs/glossary.md`.
