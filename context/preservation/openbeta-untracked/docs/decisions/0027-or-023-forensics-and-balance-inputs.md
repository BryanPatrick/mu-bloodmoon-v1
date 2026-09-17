---
status: ACTIVE — forensics complete, remediation NOT decided, balance inputs NOT ready
category: decisions
audience: internal (product + engineering)
lastVerified: 2026-09-04
confidence: CONFIRMED (real, hash-verified, multi-checkpoint file comparisons; no production change)
---

# ADR-0027: OR-023 Production Drift Forensics + Balance Input Closure

**DATE**: 2026-09-04 (Phase W)
**STATUS**: ACTIVE. Closes the forensic-investigation half of OR-023
(what changed, when, how broad, and whether this project caused it),
without deciding remediation. Adds real playtime/VIP-power arithmetic
and a real, previously-undocumented finding about the local
non-production lab's readiness. No GameServer write capability was
added, used, or attempted anywhere in this phase.

## CONTEXT

Phase V found OR-023 (map-wide item-drop zeroing, 10 bosses' drop rate
reduced) via a two-point comparison (2026-08-17 vs. 2026-09-03) and
explicitly flagged it OPEN, asking Bryan to confirm intent. Bryan's
Phase W instruction is explicit: **investigate before any drop-balance
decision, do not fix anything yet**, and determine what changed, when,
where, how broad, whether prior evidence explains it, and classify the
drift without guessing intent.

## DECISION 1 — OR-023 is a two-part change, not one, and neither part traces to this project's own tooling

Four real historical checkpoints (a vendor factory baseline, two
independent July VPS backups, the existing Aug17 snapshot, and the
existing Sept3/current snapshot) were compared pairwise. This revealed
a materially richer story than Phase V's own two-point comparison
could show:

- **July→Aug17** (no RemoteOps log coverage exists before Aug 16 —
  this window's origin is `UNKNOWN`, not assumed): 224 of 545 monsters'
  `ItemRate` were set to a `999999999` "always drop" sentinel; a
  separate 28 monsters set to a normal `100`; the account-tier
  `ItemDropRate_AL0-3` in `Common.dat` went from `0/0/0/0` to
  `100/120/120/120` in the same window (already documented in
  `production-vs-backup-diff.md`, correlated with a GameServer restart
  ~2026-08-15).
- **Aug17→Sept3** (full RemoteOps log coverage exists for this entire
  window — every logged operation against these files is `download`,
  never `upload`; zero git history references these files anywhere):
  all 67 maps' `ItemDropRate` zeroed (100→0) and `ExcItemDropRate` cut
  10x (1000→100); exactly 10 named boss/unique monsters (Hydra,
  Kundun, Erohim, Nightmare, Maya Hand×2, Selupan, Medusa, Farao,
  BloodMoon) had their `ItemRate` reverted from the sentinel back to
  `100` — leaving **214 other monsters still at the sentinel today**.

```
PROJECT_CHANGE_ATTRIBUTION (Aug17-Sept3) = PROJECT_CHANGE_NOT_FOUND,
  HIGH_CONFIDENCE (full log coverage, zero writes logged, zero git
  history, no Portal code path capable of writing these files)
PROJECT_CHANGE_ATTRIBUTION (July-Aug17) = UNKNOWN (no log coverage
  exists for this window -- genuinely cannot rule this project in or
  out, so it is not assumed either way)
```

Full detail, exact tables, hashes, and the vendor-baseline comparison:
[`docs/drop/or-023-forensics.md`](../drop/or-023-forensics.md).

## DECISION 2 — Impact is classified as MEDIUM, with magnitude and proof kept explicitly separate

Per Bryan's own instruction not to conflate "the config changed a
lot" with "players were proven to be affected":

```
CONFIG_CHANGE_MAGNITUDE = HIGH (67/67 maps, 224/545 then 214/545
  monsters at an extreme sentinel value, 10 precise reverts)
PROVEN_PLAYER_IMPACT = UNKNOWN (no telemetry or gameplay log exists to
  confirm real drop behavior changed for real players)
OR023_INTENT = DELIBERATE (the precision of both windows argues
  against accidental drift -- not an accusation of who or why)
OR023_IMPACT = MEDIUM
```

`docs/open-risks.md`'s OR-023 row is updated to reflect this
resolution (forensics complete, remediation still open) — see the
"forensics complete" status change there, not a closure, since Bryan
has not yet decided whether/how to remediate.

## DECISION 3 — No remediation performed or proposed as an action; drop values stay `EFFECTIVE_BUT_UNAPPROVED`

No file was restored, no production write made, no GameServer config
altered, regardless of how the older values might look more
"reasonable." The existing `policyStatus` axis (ADR-0026 Decision 2)
already correctly represents every drop-related `ProgressionConfigItem`
row as `EFFECTIVE_BUT_UNAPPROVED` — this phase confirms that framing
extends cleanly to the map/monster layers OR-023 concerns, which are
not individually modeled as `ProgressionConfigItem` rows today
(Phase U/V deliberately scoped that model to account-tier fields only;
extending it to per-map/per-monster granularity is a real, undecided
scoping question, not attempted this phase).

## DECISION 4 — Drop-mechanism runtime interaction remains genuinely unproven

Whether a map-level `ItemDropRate=0` actually zeroes drops for a
monster whose own `ItemRate` sits at the `999999999` sentinel (a
multiplicative reading) or whether the engine special-cases such an
extreme per-monster value as an override (an alternative, real pattern
in some MU forks) cannot be determined from config text alone.

```
MAP_ITEMDROP_ZERO_RUNTIME_EFFECT = UNKNOWN_RUNTIME_EFFECT
```

This is the same category of gap as Decision 2 in ADR-0026
(`PROGRESSION_RUNTIME_SYNC = BLOCKED_BY_RUNTIME_EVIDENCE`) — it stays
open until a real, authorized non-production instance can observe
actual drop behavior, not guessed from the multiplicative-pipeline
model alone.

## DECISION 5 — The non-production lab is materially more ready than previously documented

A real, pre-existing local lab (`D:\MU\docs\local-muserver-lab.md`,
prepared in an earlier session, outside this git repo) was
re-verified this phase. Its previously-recorded #1 blocker — no local
SQL Server engine — is **no longer accurate**: a real `MSSQLSERVER`
service is now running, with a database (`bloodmoon_gameserver_lab`,
145 tables, 11 real test `Character` rows) that already matches
production's real schema scale. The remaining gap is a single ODBC
DSN (a system-configuration change, correctly withheld this phase —
outside a read-only mandate and outside this session's authority to
make unilaterally) plus this session's standing refusal to execute
unsigned, unverified third-party server/client binaries (unchanged,
independent of the SQL Server finding). Full detail:
[`docs/gameserver/non-production-test-instance-status.md`](../gameserver/non-production-test-instance-status.md).
This does not authorize any runtime test — Decision 2 of ADR-0026
still governs any future use of this lab, and Bryan would need to
authorize each specific test against it individually.

## DECISION 6 — VIP final-power audit: one real advantage survives the reset-cap fix

Beyond `reset.cap` (already classified `POLICY_DRIFT` in ADR-0026),
`reset.stat_points` (450 Free vs. 500 Bronze/Silver/Gold) is a genuine
`FINAL_POWER_ADVANTAGE`, not an `ACCELERATION_ONLY`/`CONVENIENCE`
effect — it changes per-action yield, not speed. At 20 resets each
(the approved-policy cap for every tier), Free players are permanently
1,000 stat points behind, regardless of playtime. `xp.rate`/
`xp.master_rate` are `ACCELERATION_ONLY`; `drop.zen_rate` is
`CONVENIENCE`; `drop.item_rate` is `UNKNOWN` pending a scarcity
determination this phase did not resolve. Full audit and the exact
20-reset end-state comparison:
[`docs/progression/balance-inputs-playtime-and-vip-power.md`](../progression/balance-inputs-playtime-and-vip-power.md).
**This document does not recommend changing `reset.stat_points`** — it
surfaces a real fact for Bryan's own product judgment, the same way
`reset.cap`'s drift was surfaced before Bryan ruled on it.

## DECISION 7 — Balance readiness: still NOT_READY, now with a precise blocker list

```
READY_FOR_NUMERIC_PROGRESSION_BALANCE = NOT_READY
```

4 of 13 tracked balance inputs are `CONFIRMED` and usable today (map
dataset, monster dataset stats, reset stat points, reset cadence
arithmetic); 1 is a pending owner decision (playtime reference
profile); the remainder require either the still-unresolved XP formula
or a running non-production instance. Full table:
`balance-inputs-playtime-and-vip-power.md` Part 19.

## Related systems

`docs/drop/or-023-forensics.md`, `docs/gameserver/non-production-test-instance-status.md`,
`docs/progression/balance-inputs-playtime-and-vip-power.md`,
`docs/progression/xp-vendor-package-pt-br.md`,
`docs/progression/vendor-response-intake-template.md`,
`docs/decisions/0025-progression-control-plane.md`,
`docs/decisions/0026-progression-evidence-and-balance-readiness.md`,
`docs/open-risks.md` (OR-023).
