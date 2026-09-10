---
status: INVESTIGATION_COMPLETE — formula remains UNKNOWN, not for lack of effort
category: progression
audience: internal (product + engineering)
lastVerified: 2026-09-04
confidence: HONEST_UNKNOWN — see body; nothing below asserts a formula that isn't proven
---

# XP stacking investigation — Phase U Part 4

## The question

Does `AddExperienceRate_AL0 = 50` mean the server multiplies base
monster XP by 50 (a literal "50x" server), or does it mean something
else — a flat +50% bonus over a baseline of 100, an additive term, or
an input to a formula this document hasn't found? **Bryan's own
instruction for this phase is explicit: do not answer this by
assumption, and do not call this server "50x" without proof.**

## KNOWN_COMPONENTS

Every one of these is a real, confirmed config key that participates in
XP calculation somehow — confirmed to *exist* and be *live*, not
confirmed as to *how* they combine:

- `AddExperienceRate_AL0-3` (50/60/60/60) — vendor doc: "value by which
  server XP will be multiplied," per account tier.
- `AddMasterExperienceRate_AL0-3` (20/22/22/22) — same language, for
  Master XP.
- `AddEventExperienceRate_AL0-3` (300/300/300/300) — same language, for
  event XP.
- `AddQuestExperienceRate_AL0-3` (100/100/100/100) — same language, for
  quest XP.
- `ExperienceMultiplierConstA` / `ExperienceMultiplierConstB` (10 /
  1000) — vendor doc, verbatim: *"Padrão 10 (para nível máximo 1000 =
  1)"* / *"Padrão 1000 (para nível máximo 1000 = 6)."* This is a real,
  vendor-acknowledged formula input, tied somehow to the server's
  configured max character level (this server: `MaxLevel=400`, not
  1000 — the vendor's own example uses a different max-level value than
  this server runs, which is itself a reason not to trust a naive
  "plug in the vendor's numbers" reading).
- `PartyGeneralExperience1-7` / `PartySpecialExperience1-7` — real,
  vendor-confirmed percentage table for party-size XP scaling
  (100/75/80/80/80/80/80, same for same-class vs mixed-class parties
  today).
- `PetExperienceMultiplierConstA` / `PetExperienceRateDivisor` (100/10)
  — a separate formula pair for pet XP specifically.
- `ExperienceRandomAditional` (0) — a random-variance term, currently
  inert.
- `MaxLevelUp` / `MaxLevelUpEvent` / `MaxLevelUpQuest` (all 1) — caps
  how many character levels a single XP grant can produce, regardless
  of how much raw XP that grant computes to.
- `Monster.txt` has **no explicit per-monster XP column** (re-confirmed
  this phase against the already-catalogued header) — base XP is
  necessarily *derived* from something else, most likely monster
  `Level`, but the derivation is not written anywhere as text.

## UNKNOWN_COMPONENTS

- The actual mathematical relationship between monster `Level` and base
  XP. No config file, no stored procedure, no vendor tutorial fragment
  found so far states this formula in numbers.
- Whether `AddExperienceRate_AL0=50` is a **multiplier** (final =
  base × 50), a **percentage bonus** (final = base × 1.5, i.e. "+50%"),
  or an **additive term** feeding into `ExperienceMultiplierConstA/B`'s
  own formula. The vendor's own word "multiplicada" (multiplied) is
  suggestive but not dispositive — "multiplied by a factor derived from
  50" is consistent with any of the three readings above.
- How `ExperienceMultiplierConstA/B` actually combine with monster
  level, `AddExperienceRate`, and each other. The vendor doc gives two
  isolated example outputs ("for max level 1000 → 1" and "→ 6") without
  showing the formula that produced them, and those examples use a
  max-level value (1000) that doesn't match this server's own
  `MaxLevel=400` — so even if the formula shape could be reverse-guessed
  from those two data points, the guess would need to be re-validated
  against this server's own actual max level, which this investigation
  has not attempted (that would be exactly the kind of unproven
  inference this phase explicitly forbids).
- Whether `AddExperienceRate`/`AddEventExperienceRate`/
  `AddQuestExperienceRate` stack **additively** or **multiplicatively**
  with each other for a kill that happens to be both an event kill and
  a quest kill simultaneously (if that's even a real, reachable game
  state).
- Whether `ExperienceRandomAditional=0` participates in the formula at
  all when it's zero, or whether it's a term that's structurally always
  added.

## KNOWN_ORDER

Only one ordering fact is real and confirmed: `MaxLevelUp*` caps apply
**after** whatever XP-to-level conversion happens (it caps *level gain
from one grant*, which necessarily happens after XP is computed and
compared against a next-level threshold). Nothing else about execution
order is confirmed.

## UNKNOWN_ORDER

Whether `AddExperienceRate_AL*` is applied before or after
`ExperienceMultiplierConstA/B`'s own formula; whether party-size
scaling (`PartyGeneralExperience*`) applies to the raw base XP or to
the already-tier-multiplied XP; whether `AddEventExperienceRate`
replaces or stacks with `AddExperienceRate` during an event.

## MULTIPLICATIVE / ADDITIVE / OVERRIDE / CONDITIONAL

None of these four relationships can be assigned with real evidence for
any pair of components above. The vendor's own language ("multiplied")
is the only lexical hint available, and it describes each field's
individual effect on "server XP" in isolation, not how two or more of
these fields combine with each other. Assigning any of
MULTIPLICATIVE/ADDITIVE/OVERRIDE/CONDITIONAL between components without
that evidence would be exactly the invented-formula mistake this phase
was written to prevent.

## What was searched and came up empty

- No GameServer engine source (C++ or otherwise) exists anywhere in
  `D:\MU` (`source-map.md`, re-confirmed) — this is a `BINARY_ANALYSIS_
  CANDIDATE`, not a text-searchable fact.
- No stored procedure on the live SQL Server computes or stores an XP
  formula (`bm-sql schema` surface is account/character/guild/ranking
  data, not a calculation engine — GameServer.exe does XP math
  in-process, not via SQL).
- No log line observed anywhere in this project's log samples records
  "base XP" separately from "final XP awarded" for a given kill — there
  is no empirical before/after pair to reverse-engineer a multiplier
  from.
- The vendor's own `Tutoriais/*.htm` files (already exhaustively read
  for `Common.dat`, see `common-dat-semantic-map.md`) do not contain a
  worked numeric example tying a specific monster level, a specific
  `AddExperienceRate` value, and a specific resulting XP number
  together.

## Conclusion

```
XP_STACKING = UNKNOWN
XP_EFFECTIVE_FORMULA = UNKNOWN — real components identified (above),
  real relationship between them not provable from any source this
  project has access to
ADD_EXPERIENCE_RATE_AL0_MEANING = "value by which server XP will be
  multiplied" (vendor's own words) — CONFIRMED as the vendor's
  description; NOT CONFIRMED as "literal Nx final multiplier" in a way
  that would make "50" mean "50x"
~~CAN_CALL_SERVER_50X = NO~~
```

**Correction (Phase X, 2026-09-04, not a silent overwrite — see
[`xp-stack-inventory.md`](xp-stack-inventory.md) Part 4/5 and
[ADR-0028](../decisions/0028-xp-stack-and-progression-calculator.md)
Decision 1)**: this line above is struck through, not deleted, because
the underlying technical finding it was based on is still entirely
correct — `AddExperienceRate_AL0=50` alone still does not prove a
literal 50x multiplier, and `XP_EFFECTIVE_FORMULA` above is still
genuinely `UNKNOWN`. What changed is that Bryan made a real, dated
product-policy decision that `BASE_SERVER_RATE = 50x` is now official
Blood Moon terminology, independent of whether that config value
proves it mathematically. The current, correct statement is:

```
CAN_CALL_BASE_SERVER_50X = YES (Bryan's product policy, Phase X)
CAN_CLAIM_EFFECTIVE_XP_WITH_ALL_BONUSES = NO (still UNKNOWN, unchanged)
```

This is the honest ceiling of what static configuration analysis, SQL
schema inspection, and available vendor documentation can establish.
Resolving it further requires one of: (a) real GameServer engine source
(C++), (b) a controlled empirical test on a non-production instance
(kill a specific monster at a known level with `AddExperienceRate` set
to a known value, record exact XP granted, repeat with a different rate
to isolate the relationship) — which itself requires a real,
authorized non-production GameServer environment this project does not
currently have (see `docs/environment/sql-server-test-environment.md`
for the parallel, already-documented blocker on the SQL side), or
(c) direct vendor clarification.

## What this means for the Portal control plane (forward reference)

Because the formula is unknown, `desiredValue`/`effectiveValue` for
`AddExperienceRate_AL*` in the progression control plane
(`docs/decisions/0025-progression-control-plane.md`) are stored and
displayed as **raw config values with an explicitly unconfirmed unit**
— never labeled "x" or "%" — per Part 13's mandatory unit-safety rule.
See `apps/web/pages/painel/admin/progressao.vue`'s own display logic
for the enforced version of this rule.

## Related systems

`docs/progression/progression-config-field-matrix.md`,
`docs/decisions/0025-progression-control-plane.md`,
`D:\MU\docs\gameplay-call-flow.md` (operator reference, same
conclusion reached independently in an earlier investigation),
`D:\MU\docs\common-dat-semantic-map.md` (operator reference, source of
the vendor-doc quotes used above).
