---
status: NEEDS_VERIFICATION
category: systems
confidence: CONFIRMED_VENDOR_VIDEO
source: 5 independent project-gamers-oficial transcripts (yVXjMheH9qY, lRhePn4cLZ0, KTO4Zk_Qxt8, lWclobV5zm8, plus this sweep's own re-reads)
bloodMoonStatus: BLOODMOON_LIKELY
readiness:
  rawCoverage: HIGH (5 independent videos, spanning 2021-2024)
  sourceCount: 5 (all PROVIDER_TUTORIAL)
  bloodMoonVerification: UNVERIFIED
  conflictStatus: NONE
  readiness: NEEDS_VERIFICATION -- highest transcript corroboration of any entity in this sweep, but zero independent Blood Moon config confirmation yet (see verification-queue.json CLAIM-051)
---

# Custom Event Time (H-key event schedule panel)

A client-side panel (opened with the **H** key) that shows players the schedule of upcoming custom events, driven by a server-side config file this sweep believes is named `Data/Custom/CustomEventTime.txt` — corrected from an earlier working guess of "CustomEventTimer" (see [[glossary]] entry). This is the single best-corroborated SYSTEM entity in this entire sweep: 5 independent vendor tutorial videos, spanning update 5.7 (2021) through update 8.1 (2024), each describe a piece of this same panel.

## What's confirmed across multiple independent sources

- **Structure (5.7, original)**: built from 2 config sections — an "Invasion Manager" list (fixed original events + up to 5 free custom slots at indices 9-13) and a separate "Custom Arena" list (0-9 index range, slot count varies by base engine season).
- **Gating (6.1, 6.6)**: only lists events/invasions that are currently *enabled* — a disabled entry is silently omitted, not shown greyed-out. Two events specific to the `GameServerCS` server instance (Crywolf, Castle Siege) only appear when the viewer is connected to that instance or standing on the Crywolf map.
- **New column (6.6)**: a "monster quantity" column was added per invasion-type entry.
- **Monster preview (8.1)**: hovering an entry now shows a preview of the tied monster's model, plus a 2-field freeform drop-hint text, both configured per-event in the same file.
- **Client sync requirement**: any config edit requires regenerating the client-side `.mpg` file (via `GetMyInfo`) and copying it to the client before changes are visible in-game — the same workflow this sweep has observed for [[get-my-info]]-driven features generally.

## Why this stays NEEDS_VERIFICATION, not READY_FOR_REVIEW

Every fact above comes from vendor tutorial videos (`PROVIDER_TUTORIAL` authority) — none of it has been checked against Blood Moon's actual `Data/Custom/` folder. The filename itself (`CustomEventTime.txt`) is a well-corroborated inference, not a confirmed real path. `verification-queue.json` (CLAIM-051) queues this as a `HIGH`-priority, cheap check: a single targeted `bm-remote` download would resolve the open filename question definitively.

## Sources

- Research/YouTube/project-gamers-oficial/transcripts/yVXjMheH9qY.pt.json ("Custom Event Time Settings - ADDED 5.7", 2021-03-26)
- Research/YouTube/project-gamers-oficial/transcripts/lRhePn4cLZ0.pt.json ("Custom Jewel Bank And Custom Event Time - UPDATED 6.1", 2022-03-19)
- Research/YouTube/project-gamers-oficial/transcripts/lWclobV5zm8.pt.json ("Custom Event Time - UPDATED 6.6", 2022-08-17)
- Research/YouTube/project-gamers-oficial/transcripts/KTO4Zk_Qxt8.pt.json ("Custom Event Time Text Monster Model - UPDATED 8.1", 2024-08-05)
- atomic-claims.json: CLAIM-022, CLAIM-023, CLAIM-051, CLAIM-052, CLAIM-076, CLAIM-077, CLAIM-082, CLAIM-083

## Remaining before Wiki publication

A real read of `Data/Custom/` (via `bm-remote inventory-json`) to (a) confirm the exact filename, (b) confirm whether Blood Moon has any events actually configured in it, and (c) resolve whether it's the same file as the separately-named "Invasion Manager" entity or a distinct one (`entities/system-event-command-registry.json` explicitly leaves this open).
