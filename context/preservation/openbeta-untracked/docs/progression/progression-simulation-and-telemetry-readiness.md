---
status: DRAFT_FOR_REVIEW
category: progression
audience: internal (product + engineering)
lastVerified: 2026-09-03
confidence: HONEST_GAP_ANALYSIS — nothing here is built, this is a readiness inventory only
---

# Progression simulator & telemetry readiness — Phase U Parts 19/20

Neither a simulator nor telemetry collection is built this phase. This
document exists so a future phase that wants to build either one starts
from a real inventory of what's already known vs. missing, rather than
re-deriving it.

## Part 19 — Simulation readiness matrix

A progression simulator (e.g. "how many days to reach 20 resets under
config X") would need every one of these inputs. Status reflects this
phase's own findings — nothing fabricated to fill a gap:

| Input | Status | Source | Notes |
|---|---|---|---|
| Account-tier XP/drop rates | READY | `docs/progression/progression-config-field-matrix.md` | Real, confirmed values for all 4 tiers |
| Effective XP formula (monster level → base XP → final XP) | **NOT_READY** | `docs/progression/xp-stacking-investigation.md` | The single blocking gap — no simulator can produce a real number without this |
| Monster level / XP table per map | NOT_READY | — | `Monster.txt` has no explicit per-monster XP column (confirmed this phase); would need a real per-monster/per-map inventory pass, not attempted here |
| Map drop-rate multipliers | PARTIAL | `MapManager.txt` (real column, convention confirmed — base-100 multiplier) | Real per-map values not re-read this phase (deferred, see field matrix's DROP section) |
| Level curve / total XP required to level N | NOT_READY | — | Not found in any accessible text file; likely binary-only |
| Reset requirements/rewards | READY | Field matrix RESET section | Fully confirmed |
| Master Reset requirements/rewards | READY | Field matrix MASTER_RESET section | Fully confirmed, including that it's currently disabled |
| Kill speed / time-to-kill assumptions | NOT_READY | — | Would require either real player telemetry (Part 20) or a controlled empirical test; no source exists today |
| Gear-progression assumptions | NOT_READY | — | Out of this phase's scope entirely; would need its own item-power audit |
| Party-size XP curve | READY | Field matrix EXPERIENCE section (`PartyGeneralExperience*`/`PartySpecialExperience*`) | Fully confirmed |
| VIP tier mapping (AL0-3 → Free/Bronze/Silver/Gold) | PARTIAL | `docs/vip/vip-deep-audit.md` | Working hypothesis, not confirmed product mapping |
| Playtime/day assumption for "resets per week" targeting | NOT_READY | — | A product/market assumption, not a technical one — needs Bryan's own estimate of realistic daily playtime for the target player, not derivable from any file |

```
PROGRESSION_SIMULATION_READINESS = NOT_READY
MISSING_SIMULATION_INPUTS = [
  "effective XP formula (monster level -> final XP)",
  "per-monster/per-map XP values",
  "level curve (total XP per level)",
  "kill-speed/time-to-kill empirical data",
  "gear-progression assumptions",
  "playtime/day assumption for reset-cadence targeting"
]
```

The single highest-leverage next step, if a simulator is ever wanted, is
resolving the XP formula gap — every other missing input is either
independently gatherable (a real per-map/per-monster file inventory
pass) or fundamentally requires telemetry/product input rather than
more config reading.

## Part 20 — Future telemetry integration (design notes, not built)

**Nothing here is built.** Bryan's own instruction: do not build player
surveillance indiscriminately, use aggregated/appropriate telemetry
concepts. This section documents what *could* validate progression
assumptions once real players exist, in a shape that stays consistent
with that constraint.

### Candidate aggregate metrics (never per-player-identifiable in a report)

- Time-to-first-reset (median, distribution) — validates whether the
  real playerbase reaches reset #1 in a timeframe consistent with
  Bryan's "2-3 resets/week" target once resets accumulate.
- Resets/week (rolling average, server-wide and per VIP tier) — the
  single most direct validation of Part 18's product target; this is
  the metric the "2-3/week" policy note (ADR-0025, Decision 5) exists
  to eventually be checked against.
- Time-to-level milestones (e.g. 100/200/400) — would help separate
  "leveling is slow" from "reset cadence is slow for other reasons"
  (item drops, Zen, gear).
- Map usage distribution — which maps players actually farm on, useful
  context for any future per-map drop-rate work.
- Death rate / PK exposure — relevant to whether PK item-drop settings
  (see field matrix's DROP section) meaningfully affect retention.

### What this would require (not present today)

- A real event/telemetry pipeline from the GameServer or client — none
  exists. The existing GameBridge Agent (`docs/gamebridge/`) is
  purpose-built for narrow, specific command execution
  (GRANT_VIP/SYNC_VIP_TIER/etc.), not a general telemetry ingestion
  path — extending it for this purpose would be a real, separate
  architecture decision, not an incidental add-on.
- An aggregation layer that never stores or reports individually-
  identifiable play patterns in a way a Super Admin could use to
  surveil a specific player's session-by-session behavior — this is a
  real privacy design constraint, not a implementation detail, and
  should be resolved as its own decision before any collection code is
  written (see `docs/privacy/` for this project's existing privacy
  design precedent).
- A place to store/display the resulting aggregates — plausibly a
  future addition to this same `/painel/admin/progressao` page (e.g. a
  read-only "observed" column next to desired/effective), but not
  designed in any detail here.

## Related systems

`docs/progression/progression-config-field-matrix.md`,
`docs/progression/xp-stacking-investigation.md`,
`docs/decisions/0025-progression-control-plane.md`,
`docs/privacy/`, `docs/gamebridge/`.
