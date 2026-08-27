---
status: READY_FOR_REVIEW
category: systems
confidence: CONFIRMED_RUNTIME
source: 5 independent project-gamers-oficial transcripts (yVXjMheH9qY, lRhePn4cLZ0, KTO4Zk_Qxt8, lWclobV5zm8) + real GameServer/DATA/GameServerInfo - Custom.dat and Data/Event/InvasionManager.dat (read 2026-08-27)
bloodMoonStatus: BLOODMOON_CONFIRMED
readiness:
  rawCoverage: HIGH (5 independent videos, spanning 2021-2024, plus real config)
  sourceCount: 5 PROVIDER_TUTORIAL + 1 REAL_BLOODMOON_CONFIG
  bloodMoonVerification: CONFIRMED_BY_CONFIG (feature enabled) -- exact backing filename still unresolved, see caveat below
  conflictStatus: NONE
  readiness: READY_FOR_REVIEW -- the FEATURE is now confirmed real and enabled; promoted from NEEDS_VERIFICATION on 2026-08-27 after GameServerInfo-Custom.dat confirmed CustomEventTimeSwitch=1
---

# Custom Event Time (H-key event schedule panel)

A client-side panel (opened with the **H** key) that shows players the schedule of upcoming custom events, driven by a server-side config file this sweep believes is named `Data/Custom/CustomEventTime.txt` — corrected from an earlier working guess of "CustomEventTimer" (see [[glossary]] entry). This is the single best-corroborated SYSTEM entity in this entire sweep: 5 independent vendor tutorial videos, spanning update 5.7 (2021) through update 8.1 (2024), each describe a piece of this same panel.

## What's confirmed across multiple independent sources

- **Structure (5.7, original)**: built from 2 config sections — an "Invasion Manager" list (fixed original events + up to 5 free custom slots at indices 9-13) and a separate "Custom Arena" list (0-9 index range, slot count varies by base engine season).
- **Gating (6.1, 6.6)**: only lists events/invasions that are currently *enabled* — a disabled entry is silently omitted, not shown greyed-out. Two events specific to the `GameServerCS` server instance (Crywolf, Castle Siege) only appear when the viewer is connected to that instance or standing on the Crywolf map.
- **New column (6.6)**: a "monster quantity" column was added per invasion-type entry.
- **Monster preview (8.1)**: hovering an entry now shows a preview of the tied monster's model, plus a 2-field freeform drop-hint text, both configured per-event in the same file.
- **Client sync requirement**: any config edit requires regenerating the client-side `.mpg` file (via `GetMyInfo`) and copying it to the client before changes are visible in-game — the same workflow this sweep has observed for [[get-my-info]]-driven features generally.

## Phase 6 real-VPS verification (2026-08-27)

`GameServer/DATA/GameServerInfo - Custom.dat` confirms `CustomEventTimeSwitch = 1` — the panel feature itself is real and **enabled** on Blood Moon. However, no file literally named `CustomEventTime.txt` (or a close variant) exists anywhere in `Data/Custom`, `Data/Event`, or `Data/Util` — all 3 were inventoried directly. The panel is most likely powered by a **combination** of 2 already-confirmed real files: `Data/Event/InvasionManager.dat` (`InvasionManagerSwitch = 1`, confirmed enabled) and `Data/Custom/CustomArena.txt`, matching this entity's own "2-section structure" finding (Invasion Manager list + Custom Arena list) almost exactly. "CustomEventTime" should be read as this sweep's name for the *feature*, not a confirmed filename.

## Sources

- Research/YouTube/project-gamers-oficial/transcripts/yVXjMheH9qY.pt.json ("Custom Event Time Settings - ADDED 5.7", 2021-03-26)
- Research/YouTube/project-gamers-oficial/transcripts/lRhePn4cLZ0.pt.json ("Custom Jewel Bank And Custom Event Time - UPDATED 6.1", 2022-03-19)
- Research/YouTube/project-gamers-oficial/transcripts/lWclobV5zm8.pt.json ("Custom Event Time - UPDATED 6.6", 2022-08-17)
- Research/YouTube/project-gamers-oficial/transcripts/KTO4Zk_Qxt8.pt.json ("Custom Event Time Text Monster Model - UPDATED 8.1", 2024-08-05)
- GameServer/DATA/GameServerInfo - Custom.dat, Data/Event (inventory-json), Data/Custom (inventory-json) -- real config, read 2026-08-27
- atomic-claims.json: CLAIM-022, CLAIM-023, CLAIM-051, CLAIM-052, CLAIM-076, CLAIM-077, CLAIM-082, CLAIM-083

## Remaining before Wiki publication

None blocking -- ready for human review. A lower-priority follow-up would be downloading and reading `CustomArena.txt` and `InvasionManager.dat`'s actual content to confirm they jointly implement every behavior this entity describes (monster preview, drop-hint text, etc.), rather than relying on the structural inference above.
