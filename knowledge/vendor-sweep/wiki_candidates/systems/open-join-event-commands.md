---
status: READY_FOR_REVIEW
category: systems
confidence: CONFIRMED_RUNTIME
source: 3 independent project-gamers-oficial transcripts (ptFi5mX0eFU, R9jc0kFIlb4) + real GameServer/DATA/GameServerInfo - Command.dat and CommandGM.dat (read 2026-08-27)
bloodMoonStatus: BLOODMOON_CONFIRMED
readiness:
  rawCoverage: HIGH (dedicated videos plus incidental confirmation in ~15 other event videos, plus real config)
  sourceCount: 3 dedicated PROVIDER_TUTORIAL + many incidental + 1 REAL_BLOODMOON_CONFIG
  bloodMoonVerification: CONFIRMED_BY_CONFIG
  conflictStatus: NONE
  readiness: READY_FOR_REVIEW -- promoted 2026-08-27 after the real command-syntax registries were read in full
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

## Phase 6 real-VPS verification (2026-08-27)

`GameServer/DATA/GameServerInfo - CommandGM.dat` confirms `CommandOpenEventSwitch = 1` (ENABLED, requires GM level 2) with the complete real `StartEventXxxSyntax` registry: Arena, TvT, Russian, Absorption, RunAndCatch, HideAndSeek, Drop, DropNpc, Quiz, BBB, Royale, Robber, BloodCastle, ChaosCastle, DevilSquare, IllusionTemple, InvasionManager, CastleSiege, Crywolf, CastleDeep, CTF, Ranking, GxG, Moss, PvP, PvPAll, Sorteio, KillVsKill, Racer, StopOrDie, Pandora — 31 events, confirmed real. Notably, **CustomEventZombie and CustomEventAuction have no `StartEventXxxSyntax` entry** — `/openevent` cannot open either of them; they must be schedule-only or use a different trigger. `GameServer/DATA/GameServerInfo - Command.dat` confirms the real `JoinEventXxxSyntax` registry: EventGM, Russian, Absorption, TvT, RunAndCatch, BBB, CTF, PvPAll, StopOrDie, Pandora — exactly 10 events, directly confirming this entity's "CustomArena/BattleRoyale/DropNpc are absent from `/join`" finding.

The InvasionManager panel-vs-file off-by-one question (the "vendor-side inconsistency" noted above) was **not** re-checked against Blood Moon's own `InvasionManager.dat` content this pass — that remains open, tracked separately, and does not block this entity's promotion since the core command-scope facts are now fully confirmed.

## Sources

- Research/YouTube/project-gamers-oficial/transcripts/ptFi5mX0eFU.pt.json ("Command Open Event And Join - UPDATED 6.4", 2022-06-03)
- Research/YouTube/project-gamers-oficial/transcripts/R9jc0kFIlb4.pt.json ("Command Open And Join Event Custom Interface - ADDED 8.2", 2024-11-05)
- GameServer/DATA/GameServerInfo - Command.dat, GameServerInfo - CommandGM.dat -- real config, read 2026-08-27
- atomic-claims.json: CLAIM-048, CLAIM-049, CLAIM-050, CLAIM-079, CLAIM-080

## Remaining before Wiki publication

None blocking. Lower-priority follow-up: check whether Blood Moon's own `Data/Event/InvasionManager.dat` content exhibits the same panel/file index mismatch the vendor demonstrated in the source video.
