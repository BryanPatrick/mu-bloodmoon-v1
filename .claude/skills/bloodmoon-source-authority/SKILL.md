---
name: bloodmoon-source-authority
description: Use whenever a claim's trustworthiness or currency needs to be stated — a new knowledge item, a source conflict, a decision citation, or any answer that must distinguish current/historical/superseded/external evidence. Trigger on "which source wins", "is this current", "how trustworthy is this", or as a required step inside bloodmoon-knowledge-router's own retrieval flow.
license: Internal — Blood Moon project only, not for redistribution.
---

# Blood Moon specialist — source authority

**Status: MVP, built `SPECIALIST-03` (2026-09-25).** Packages the
already-existing, already-mature authority scales this project uses —
**does not invent a new hierarchy**, per explicit standing instruction
across every phase of this design. Design source:
`docs/skills/BLOODMOON_CUSTOM_SKILLS.md` §3 (branch
`research/agent-skills-ecosystem`, preserved on origin).

## The two reused models (never forked)

1. **`docs/knowledge/source-authority.md`** — the 10-level scale for
   external/vendor material (game-content sources, tutorials, legacy
   documentation), plus a Blood-Moon-relevance axis:
   `BLOODMOON_CONFIRMED` / `LIKELY` / `UPSTREAM_MU` /
   `PROVIDER_SPECIFIC_OTHER_SERVER` / `LEGACY` / `UNKNOWN`.
2. **`context/GOVERNANCE.md`**'s 6-level internal model —
   `EXECUTABLE_FACT` / `CANONICAL_DECISION` / `CURRENT_DOC` /
   `ACCEPTED_HANDOFF` / `HISTORICAL_SOURCE` / `AI_CANDIDATE`.

Use model 1 for anything sourced outside this repository/Hub
(vendor tutorials, legacy CMS artifacts, YouTube transcripts). Use
model 2 for anything sourced from this project's own documentation,
ADRs, or Knowledge Hub rows. A single answer may need to cite sources
under both models — state which model each citation uses, never blend
them into one invented scale.

## When to use

- Whenever an answer's trustworthiness needs to be stated explicitly.
- As step 5 of `bloodmoon-knowledge-router`'s own 10-step flow — this
  skill is a required subroutine of the router, not an alternative to
  it.
- Whenever two sources disagree (feeds `bloodmoon-knowledge-router`
  step 7's conflict-exposure requirement).

## Inputs

A source description (a file path, a Hub row, a vendor artifact, a Git
commit) and the specific claim it's being used to support.

## Procedure

1. Identify which of the two models above applies (internal project
   source → `context/GOVERNANCE.md`'s 6 levels; external/vendor →
   `docs/knowledge/source-authority.md`'s 10 levels).
2. Classify the authority level per that model's own existing
   definitions — this skill packages the lookup, it does not
   re-derive the scale from first principles each time.
3. **Separately** classify current-vs-historical status:
   - `CURRENT` — the source is the live, un-superseded state of the
     fact.
   - `HISTORICAL` — real, but describes a past state, cited only
     because the question is itself historical.
   - `SUPERSEDED` — explicitly replaced by a later, named source
     (check `context/SUPERSEDED_DECISIONS.md` and any
     `~~strikethrough~~`-marked correction in the doc itself).
4. If the claim's supporting source cannot be found at all: the
   correct output is `UNKNOWN`, not a downgraded-confidence guess.
5. Never let a source's *authority* implicitly answer whether it's
   *current* — a `CANONICAL_DECISION` can still be `SUPERSEDED`; a
   `HISTORICAL_SOURCE` is never automatically wrong, only dated. Both
   axes are reported, independently, every time.

## Tools required

Read only — this skill classifies, it does not retrieve. (The caller —
`bloodmoon-knowledge-router` — already has the content in hand by the
time this skill runs.)

## Security boundary

Pure classification, no side effects, no network, no write. Cannot
itself resolve a conflict between two similarly-authoritative sources —
that stays `bloodmoon-knowledge-router` step 7's job (expose both,
escalate if governance doesn't resolve it).

## Expected output

A structured 2-axis tag: `{authority_model, authority_level,
temporal_status: CURRENT|HISTORICAL|SUPERSEDED, blood_moon_relevance
(external sources only)}` — ready to attach to a knowledge item, a
citation, or a `bloodmoon-knowledge-router` response's own `authority`
field (see `bloodmoon-knowledge-router/references/response-contract.md`).

## Worked example (real, run `SPECIALIST-03`)

Question: *"Which source wins if `context/` conflicts with
`AGENTS.md`?"* — `context/GOVERNANCE.md`'s own precedence list (read
directly, not assumed) states: security gates > `AGENTS.md` >
canonical domain doc > ADR > Context Pack (`context/`) > phase
manifest/handoff > chat. `AGENTS.md` is `CANONICAL_DECISION`-adjacent
(a standing invariant set); `context/` is explicitly `CURRENT_DOC`,
"an index/summary layer... never higher precedence than what it points
to" (`context/GOVERNANCE.md`'s own words). **`AGENTS.md` wins,
always** — this is not a judgment call this skill makes, it is a
direct citation of an existing, explicit rule.
