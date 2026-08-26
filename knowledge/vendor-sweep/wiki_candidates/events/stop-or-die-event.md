---
status: READY_FOR_REVIEW
category: events
confidence: CONFIRMED_RUNTIME
source: Data/Custom/CustomEventStopOrDie.txt (real config, read 2026-08-26)
bloodMoonStatus: BLOODMOON_CONFIRMED
readiness:
  rawCoverage: HIGH (config only, video never even attempted for transcription)
  sourceCount: 1 (REAL_BLOODMOON_CONFIG)
  bloodMoonVerification: CONFIRMED_BY_CONFIG
  conflictStatus: NONE
  readiness: READY_FOR_REVIEW
---

# Stop Or Die

A "red light, green light" style event: move during the window, freeze during the stop signal.

## Timing

Lobby wait 60s, arena countdown 30s, each movement window randomized between 4–8 seconds, a 900ms stop-grace period (movement caught just after the stop signal is likely still tolerated), 3s pause between rounds.

## Location

Map 1 (numeric ID only — same map ID used by the Custom Zombie Event's waves, the most cross-referenced map in this pass), wait/arena coordinates (96,31), a bounded zone from (92,28) to (92,33).

## Entry

NPC class 684, at Map 1, coordinates (22,41). Exit at Map 0, coordinates (125,125).

## Reward

Cash 500, Gold 500, PcPoint 500, with a `CoinSwitch` flag set to 1 (exact effect of this flag not determined from this file alone — possibly toggles which currency is actually paid out).

## Source

Real config: `Data/Custom/CustomEventStopOrDie.txt`, downloaded and read in full 2026-08-26. Corresponds to the vendor tutorial video "Custom Event Stop Or Die - ADDED 8.8" (videoId `qw4GrxEjykI`) — never even attempted for transcription this sweep; captured directly from config instead.

## Unresolved questions

- Exact effect of `CoinSwitch = 1`.
- Whether Map 1/Map 0 have confirmed names.
- Enabled/scheduled status.
