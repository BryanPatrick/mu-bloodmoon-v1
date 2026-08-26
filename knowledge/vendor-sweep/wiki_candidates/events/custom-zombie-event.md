---
status: READY_FOR_REVIEW
category: events
confidence: CONFIRMED_RUNTIME
source: Data/Custom/CustomEventZombie.txt (real config, read 2026-08-26)
bloodMoonStatus: BLOODMOON_CONFIRMED
readiness:
  rawCoverage: HIGH (real config only -- video transcript unavailable, config bypasses that gap entirely)
  sourceCount: 1 (REAL_BLOODMOON_CONFIG)
  bloodMoonVerification: CONFIRMED_BY_CONFIG
  conflictStatus: NONE
  readiness: READY_FOR_REVIEW
---

# Custom Zombie Event

A wave-survival event on Blood Moon, real and fully configured.

## Provider functionality vs. Blood Moon's real state

- **PROVIDER_DESCRIBES**: a generic wave-based zombie/infection event template (part of the `ProjectGamers/eMuGS` `Data/Custom/` event family).
- **BLOODMOON_REAL_STATE**: fully configured with real schedule, waves, drop, reward, and gate values — see below. No per-entry enable/disable flag was found in this file's structure, so this sweep records `SYSTEM_ENABLED_IN_BLOODMOON = UNKNOWN` rather than assuming active or inactive.

## Schedule

Runs daily at **02:45**, for **10 minutes**.

## Waves (4, all on Map 1)

| Wave | Monster index | Named as | Coords | Respawn | Count |
|---|---|---|---|---|---|
| 1 | 14 | (unidentified) | 66,200 | 5s | 10 |
| 2 | 15 | (unidentified) | 70,180 | 10s | 15 |
| 3 | 55 | **Skeleton King** (cross-referenced via `EventItemBagManager.txt`) | 78,191 | 15s | 20 |
| 4 | 515 | (unidentified) | 72,186 | 20s | 25 |

## Cure item

A 100%-rate drop of an unnamed item (Type 14, Index 8, referred to only as "cura/antídoto" in the config's own comments) at Map 1, coords (78,191) — the exact same coordinates as wave 3's Skeleton King spawn. **This is an inference, not a config-explicit fact**: the coordinate match strongly suggests a kill-triggered drop, but the file's structure (location + rate + item) doesn't literally state "this monster drops this item."

## Reward

Cash 10, Gold 20, PcPoint 30.

## Entry

NPC class 380, at Map 0, coordinates (140,140). Event gate: entry at Map 1 (85,197), exit gate 17.

## Source

Real config: `Data/Custom/CustomEventZombie.txt`, downloaded and read in full 2026-08-26. Corresponds to the vendor tutorial video "Custom Event Zombie - ADDED 8.9" (videoId `A2BcRITQjxc`), whose transcript could not be captured (see `failure-manifest.json` — a genuine YouTube-side caption-delivery fault) — this candidate was built entirely from the real config, bypassing that gap.

## Unresolved questions

- Named identity of MonsterIndex 14, 15, and 515 (waves 1, 2, 4) — not yet cross-referenced.
- Name of the "cure/antidote" item (Type 14, Index 8).
- Whether Map 0 and Map 1 correspond to any named map — no confirmed evidence either way.
- Whether the event is actually enabled/scheduled to run, or just configured.
