---
status: LIVING_DOCUMENT
category: gameserver/database
audience: internal (engineering)
lastVerified: 2026-08-30
---

# GameServer database — character data map

## Core character row

`Character` (CONFIRMED) — one row per character, keyed by `Name`
(`VARCHAR(10)`, the same key used across `AccountCharacter.GameID*`,
`Guild.G_Master`, `GuildMember.Name`, `CustomMarketShop.SellerName`,
`CustomQuest.Name`, and the friend tables — see
`logical-relationships.md`). `AccountID` links back to `MEMB_INFO.memb___id`.

Confirmed-present columns relevant to GameBridge/reset tracking: reset
count and master-reset count columns (the fields the Portal's rankings
and VIP-adjacent features read — real values observed during discovery
included accounts with 104 and 102 resets, both flagged `DO_NOT_PURGE`
test fixtures per prior-session classification, reused deliberately as
real high-value edge cases in this round's lab tests).

## One account, many characters (CONFIRMED)

`AccountCharacter` is the per-account character-slot table
(`GameID1`..`GameID10` plus `GameIDC`, i.e. up to 10 regular slots plus a
current/selected-character pointer) — confirmed structurally during
`sanitize-lab.sql` authoring (every populated slot had to be
pseudonymized in lockstep with the corresponding `Character.Name`).

## Character → guild (CONFIRMED)

`GuildMember.Name` (membership) and `Guild.G_Master` (mastership) both
key off `Character.Name` — see `logical-relationships.md` for the full
chain and the real compound test case (`labacct03`'s `LabChar12`, master
of `LabGld02`).

## Character → market listings (CONFIRMED)

`CustomMarketShop.SellerName` — real 8-column shape confirmed this
session (`privacy-data-map.md`), no status column, existence alone is
the "active" signal.

## Character → friend graph (CONFIRMED)

`T_FriendMain.Name`/`.GUID` is the per-character friend-list header;
`T_FriendList`/`T_WaitFriend` reference it by the numeric `GUID`, with a
`FriendName` fallback for stale rows. Full detail and the real orphan
case in `logical-relationships.md`.

## Character → quests (CONFIRMED — the one real declared FK)

`CustomQuest.Name → Character.Name`, `ON DELETE CASCADE`
(`database-overview.md`). Real snapshot had 0 rows in `CustomQuest`, so
this cascade path was not exercised by any test this round — noted as a
gap: if a future snapshot has real `CustomQuest` rows, `bm_PurgeGameAccount`
should be re-verified against it even though the native `ON DELETE
CASCADE` should handle the cleanup automatically once `Character` rows
are deleted.

## Character → rankings, castle siege, factions (STRONG_EVIDENCE, not traced this round)

`Ranking*`, `MuCastle_*`, `Gens_Rank`/`Gens_Reward`/`Gens_Duprian`/
`Gens_Varnert` — all plausibly keyed by character name based on naming
convention and general MU Online schema knowledge, but no join was
proven with real data this round. See `logical-relationships.md` and
`stored-procedures.md`/`views-triggers-functions.md` for what's known
about the procedures/views that likely populate them.

## Character rename/delete outside GameBridge (STRONG_EVIDENCE)

`WZ_RenameCharacter`/`WZ_DeleteCharacter` (`stored-procedures.md`) are
the native, in-client character-management path — distinct from
`bm_AnonymizeGameAccount`'s tombstone-rename and `bm_PurgeGameAccount`'s
hard delete. Their interaction with `DmN_Update_Killer_Ranking`
(the one confirmed trigger on `Character`, `views-triggers-functions.md`)
was not traced.

## What this document does NOT claim

This document maps what GameBridge actually touches, cross-validated
against real data. It is not a complete character-system schema
reference — item/inventory placement (equipped items, inventory slots),
skill trees, and quest *progress* (as opposed to `CustomQuest` itself)
were not part of this round's scope and remain UNKNOWN/unmapped in this
document; see `docs/README.md`'s roadmap.
