---
status: NEEDS_VERIFICATION
category: systems
confidence: CONFIRMED_VENDOR_VIDEO
source: 3 independent project-gamers-oficial transcripts (ptFi5mX0eFU, R9jc0kFIlb4, plus scattered references across nearly every event video in this sweep)
bloodMoonStatus: BLOODMOON_LIKELY
readiness:
  rawCoverage: HIGH (dedicated videos plus incidental confirmation in ~15 other event videos)
  sourceCount: 3 dedicated + many incidental
  bloodMoonVerification: UNVERIFIED
  conflictStatus: NONE
  readiness: NEEDS_VERIFICATION
---

# OpenEvent / JoinEvent command family

The vendor engine's 2 core commands for interacting with custom events: `/openevent` (Abrir Evento, GM-only) starts a configured event on demand, and `/join` (participar, player-facing) lets a player enter whichever event a GM currently has open. Both are backed by `Data/Command/` config plus (as of update 8.2) a UI panel opened with the **D** key that wraps the same commands in clickable buttons — see [[get-my-info]].

## Command scope rules (confirmed across 2 dedicated videos)

- `/join` only works for a **whitelisted subset** of events. It explicitly does **not** work for CustomArena, Battle Royale, or DropNpc — those require clicking a dedicated map NPC instead.
- `/openevent`'s syntax depends on whether the target event supports multiple instances: multi-instance events (e.g. CustomArena, 10 slots 0-9) need both an index number and a name string matching the event's registered command string exactly; single-instance events (e.g. Roleta Russa) always use index `0` plus just the name string.
- The GM-only D-key panel (update 8.2) provides one-click buttons wrapping `/openevent` for nearly every custom event this sweep has catalogued: 10 town Arenas, Team vs Team, Russian Roulette, Absorption, Hide and Seek, Drop Event/Drop Npc, BBB, Battle Royale, Racer, the 4 core castle events, Invasion Manager (0-27), Capture the Flag, Guild vs Guild, a generic PvP option, and a raffle option.
- A separate player-facing D-key tab wraps `/join`, letting a player enter whichever event a GM currently has open without typing the command, gated by its own independent config flag.

## A vendor-side inconsistency worth flagging

The GM panel's Invasion Manager button roster (indices 0-27) is one index ahead of the real `InvasionManager.txt` file the vendor's own presenter cross-checked live on screen in the same video (which only goes to index 26) — an acknowledged, unresolved, on-camera vendor bug, not a Blood Moon fact. Recorded because any future tooling built against this command family should not assume the panel and the file are always in perfect sync.

## Why this stays NEEDS_VERIFICATION

This entity is a corroborating index of the whole event system rather than a standalone feature — its value is in cross-referencing nearly every EVENT entity this sweep has extracted from transcripts (CustomAuctionEvent, CustomEventRacer, CustomEventKillVsKill, CustomEventPvP1x1, CustomGuildVsGuild, CustomCaptureTheFlag, CustomEventRobber, CustomEventOnClick — all appear, by name or by category, in the same GM panel this video demonstrates). None of the underlying command config has been checked against Blood Moon's real `Data/Command/` folder.

## Sources

- Research/YouTube/project-gamers-oficial/transcripts/ptFi5mX0eFU.pt.json ("Command Open Event And Join - UPDATED 6.4", 2022-06-03)
- Research/YouTube/project-gamers-oficial/transcripts/R9jc0kFIlb4.pt.json ("Command Open And Join Event Custom Interface - ADDED 8.2", 2024-11-05)
- atomic-claims.json: CLAIM-048, CLAIM-049, CLAIM-050, CLAIM-079, CLAIM-080

## Remaining before Wiki publication

A real read of `Data/Command/` to confirm the OpenEvent/JoinEvent command strings and permission flags actually configured on Blood Moon, and (lower priority) whether Blood Moon's own InvasionManager.txt exhibits the same panel/file index mismatch the vendor demonstrated.
