---
status: DRAFT
category: beta-readiness
audience: INTERNAL_ONLY -- all 3 events are DISABLED_MUST_LABEL_UNAVAILABLE today; this is technical depth for when/if activated, not player-facing content
confidence: mixed, marked per claim
provenance: event-registry.json "CustomEventZombie", "CustomEventPandora", "CustomEventStopOrDie"
lastVerified: 2026-08-27
---

# Deep dive: Zombie, Pandora, Stop Or Die

Part M of Knowledge Phase 8 -- these 3 events got the richest transcript detail in Phase 7's P0 backlog and are cross-checked here against already-established real config facts.

## Zombie

**DISABLED** (`CustomEventZombieSwitch = 0`).

- **Mechanics**: 4 monster waves (indices 14, 15, 55, 515) spawn in sequence on Map 1. A player killed by a wave monster becomes "infected" (visual state change) rather than removed. `BLOODMOON_LIKELY`, not directly visible in the static config: the infected player must find and click a ground-dropped antidote to cure themselves.
- **Entry**: NPC class 380, Map 0, near (140,140). Not `/participar`-eligible.
- **Requirements**: none confirmed (no level/reset gate found in the config read).
- **Map**: entry on Map 0, event area on Map 1.
- **Objective**: survive the 10-minute duration without being infected, or cure yourself before time runs out.
- **Failure condition**: still infected when the fixed duration expires -- receive no reward, even though never removed from the area.
- **Reward**: Cash/Gold/PcPoint currency (real config value confirmed, exact amounts not extracted this phase).
- **Command**: none -- NPC entry only.
- **Schedule**: fixed daily 02:45, `CONFIRMED_BY_CONFIG`.
- **Special behavior**: antidote drop is 100%-rate, fixed coordinate matching a later wave's (Skeleton King-class) spawn point, deliberately chosen for demo simplicity per the vendor (multiple locations are supported). Optional live ranking (separate `CustomRankingZombieSwitch`, its own enabled state on Blood Moon NOT confirmed this phase) showing infection status and kill count.
- **Cross-check against real config**: CLAIM-107 explicitly confirms the tutorial video's demonstrated values (schedule, NPC class/map, wave count, reward-currency types) are IDENTICAL to Blood Moon's own already-read `CustomEventZombie.txt` -- strong corroboration this video reflects Blood Moon's actual configuration, not generic vendor sample data.
- **claimRefs**: CLAIM-031, CLAIM-107, CLAIM-108, CLAIM-109, CLAIM-110.

## Pandora

**DISABLED** (`CustomEventPandoraSwitch = 0`).

- **Mechanics**: king-of-the-hill. A single special monster (MonsterClass 55, Skeleton King skin) spawns once. Whoever lands the kill takes the skin; any other player who kills the current skin-holder steals it. Whoever holds the skin when the timer expires wins.
- **Entry**: `/participar pandora`. This IS on the confirmed 10-event `/participar` allowlist.
- **Requirements**: any class, 2-20 players. No level/reset requirement confirmed.
- **Map**: 40.
- **Objective**: be holding the skin when the event timer expires.
- **Failure condition**: not holding the skin at timer expiry -- no reward. `BLOODMOON_LIKELY`: an optional configurable max-deaths-losing-skin threshold can eliminate a player after losing the skin N times (e.g. 3), or be left unlimited.
- **Reward**: 100 Cash (real config value, `CONFIRMED_BY_CONFIG`).
- **Command**: `/participar pandora` to join; opened by a GM (mechanism not the focus of this deep-dive, see Command guide).
- **Schedule**: fixed daily 20:00, `CONFIRMED_BY_CONFIG`. As of update 8.8, Pandora DOES support automatic scheduled starts.
- **Special behavior**: joining the lobby via `/participar` immediately flags the player PK-restricted until the event officially starts (`BLOODMOON_LIKELY`). Skin-monster spawn point can be fixed or left on the map's default random-spawn behavior (`PROVIDER_SPECIFIC` -- vendor recommends random for a competitive "search the map" element).
- **Cross-check against real config**: CLAIM-112 confirms the video's demonstrated Map 40 / MonsterClass 55 / 100 Cash values are IDENTICAL to Blood Moon's own real `CustomEventPandora.txt` -- same strength of corroboration as Zombie.
- **claimRefs**: CLAIM-032, CLAIM-111, CLAIM-112, CLAIM-113, CLAIM-114, CLAIM-115.

## Stop Or Die

**DISABLED** (`CustomEventStopOrDieSwitch = 0`).

- **Mechanics**: "red light, green light" (explicitly modeled by the vendor on the Brazilian children's game "batatinha frita 1, 2, 3", with Squid-Game-style audio cues). Any player who moves during the "stop" phase is immediately eliminated.
- **Entry**: `/participar`-eligible (exact keyword not independently confirmed beyond the registry entry). NPC class 684 also exists at Map 1 (22,41) as a waiting-area gate.
- **Requirements**: minimum 2 players (cannot run solo), configurable max (demoed at 20). No level/reset requirement confirmed.
- **Map**: 1.
- **Objective**: as shipped in update 8.8, be the SINGLE LAST player still standing (uneliminated). The vendor explicitly states a future update is planned to instead reward every player who crosses the finish line, not just the sole survivor -- **this is NOT the current behavior and must not be described as such**.
- **Failure condition**: moving during a "stop" phase -- immediate elimination, no re-entry to that round.
- **Reward**: 500/500/500 Cash/Gold/PcPoint (real config value, `CONFIRMED_BY_CONFIG`).
- **Command**: as of update 8.8, NO automatic time-of-day schedule exists -- must be manually opened by a GM (`CONFIRMED_BY_CONFIG`, `CustomEventStopOrDieSwitch` governs the feature, not a schedule field).
- **Schedule**: manual GM-open only, unlike sibling event Pandora (shipped same update, does support auto-schedule).
- **Special behavior**: 60s lobby, 30s countdown, randomized 4-8s move windows, 900ms stop-grace period per round -- vendor explicitly warns admins not to alter these timing values because they are pre-synced to the bundled audio cue files; changing them without re-syncing audio would desync the spoken cues from the actual stop/go windows. Reuses the same waiting-area gate coordinate as the vendor's Racer event (`PROVIDER_SPECIFIC`, a deliberate reuse, not a Blood Moon-specific design choice).
- **Cross-check against real config**: CLAIM-033 read Blood Moon's real `CustomEventStopOrDie.txt` directly and confirms the map, NPC, timing values, and reward exactly as described above.
- **claimRefs**: CLAIM-033, CLAIM-114, CLAIM-116, CLAIM-117, CLAIM-118, CLAIM-119.

## What all 3 share

- All 3 are confirmed via direct real-config file reads (not just vendor video), the strongest evidence tier this sweep uses (`CONFIRMED_BY_CONFIG`).
- All 3 are currently `DISABLED` -- this deep-dive documentation must NOT be published or referenced as describing available content until the team activates them.
- Runtime-only behaviors not visible in static config text (infection/cure mechanic, king-of-the-hill skin-stealing, movement-elimination detection) are kept at `BLOODMOON_LIKELY` per this sweep's standing rule against inferring runtime behavior from config text alone -- even though corroborated by an exact-match video, per this project's convention.
