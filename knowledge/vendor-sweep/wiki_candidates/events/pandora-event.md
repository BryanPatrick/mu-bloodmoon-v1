---
status: READY_FOR_REVIEW
category: events
confidence: CONFIRMED_RUNTIME
source: Data/Custom/CustomEventPandora.txt (real config, read 2026-08-26)
bloodMoonStatus: BLOODMOON_CONFIRMED
readiness:
  rawCoverage: HIGH (config only, video transcript unavailable)
  sourceCount: 1 (REAL_BLOODMOON_CONFIG)
  bloodMoonVerification: CONFIRMED_BY_CONFIG
  conflictStatus: NONE
  readiness: READY_FOR_REVIEW
---

# Pandora Event

A daily map-instance event where participants' character skins change to a monster's appearance.

## Schedule

Daily at **20:00**.

## Location & requirements

Map 40 (numeric ID only, no confirmed name), gate range 600–601, bounded play area (10,10) to (240,240). 2–20 players, all 7 base classes eligible (DW/DK/FE/MG/DL/SU/RF).

## Mechanic

`SkinChange = 55` — players' appearance changes to MonsterClass 55 during the event, the same class identified elsewhere as **Skeleton King** (`EventItemBagManager.txt` index 1). `MonsterClass = 55` also appears in this file, likely the same reference used twice for related purposes (exact distinction between the two fields not determined from this file alone).

## Reward

Cash 100.

## Source

Real config: `Data/Custom/CustomEventPandora.txt`, downloaded and read in full 2026-08-26. Corresponds to the vendor tutorial video "Custom Event Pandora - ADDED 8.8" (videoId `ivDj7I9elZA`), whose transcript could not be captured (diagnosed root cause: real YouTube caption-delivery fault, see `failure-manifest.json`) — bypassed via direct config read.

## Unresolved questions

- Precise distinction between the `MonsterClass` and `SkinChange` fields (both = 55 here; may always match, or may serve different purposes not visible from a single example).
- Whether Map 40 has a confirmed name.
- Enabled/scheduled status — no per-entry flag found in this file.
