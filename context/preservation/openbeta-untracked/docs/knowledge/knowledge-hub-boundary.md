---
status: ESTABLISHED
category: knowledge
audience: internal (any agent or engineer working across Blood Moon and adjacent projects)
lastVerified: 2026-08-31
confidence: CONFIRMED for what the Knowledge Hub IS (real, separate, deployed infrastructure); the responsibility-split RECOMMENDATION below is this document's own design proposal, not a pre-existing written policy
---

# Knowledge Hub boundary — what lives where

## What the Knowledge Hub actually is (confirmed, not assumed)

The "AI Knowledge Hub" is a **real, separate project and infrastructure
deployment** — not a Blood Moon module, not a concept, not this repo's
`docs/knowledge/` folder (which is a same-named but unrelated ingestion
pipeline for the in-game Wiki feature — see
[`docs/knowledge/knowledge-sweep.md`](knowledge-sweep.md) etc.; that
naming collision is exactly why this boundary needs to be written down
explicitly).

Confirmed, with real citations already in this repo:

- **Its own Cloudflare Worker and D1 database**, logically and physically
  separate from Blood Moon's: `ai-knowledge-hub` (Worker) /
  `ai-knowledge-hub-db` (D1), versus Blood Moon's own
  `bloodmoon-game-data-worker` / `bloodmoon-game-data`
  (`docs/game-data/cloudflare-resources.md`). No shared bindings, nothing
  renamed or repurposed between them.
- **Its own repository, with its own protocols** — e.g. a destructive-
  actions protocol at `docs/protocols/destructive-actions.md` *inside the
  Knowledge Hub's own repo*, referenced from this project's docs but not
  duplicated here (`docs/handoff/community-current-state.md`).
- **Formal decisions get registered there** — e.g. a beta-launch `NO-GO`
  decision (`docs/handoff/site-beta-checklist.md`) and a Community-module
  readiness decision (`docs/handoff/community-current-state.md`) are both
  described as "registered in the AI Knowledge Hub," not written into
  this repo's own docs.
- **It spans more than one project** — the explicit warnings in this
  repo ("logically separate," "unrelated external project," "never
  assume shared infrastructure") only make sense if the Knowledge Hub is
  a cross-project system Bryan uses for more than Blood Moon alone, not
  a Blood-Moon-specific subsystem.

In an interactive Claude Code session, the Knowledge Hub is most likely
reachable via the `mcp__ccd_session_mgmt__*` tool family (session
list/get/archive, event listing, transcript search, cross-session
messaging) — those tools match the "projects / sessions / tasks /
decisions / handoffs / artifacts / events" shape this document assigns to
it below. This repo's own docs do not (and should not attempt to)
describe the Knowledge Hub's internal schema or implementation — it is
out of scope, literally a different codebase.

## Responsibility split (this document's recommendation)

**REPOSITORY DOCUMENTATION (`docs/` in this repo) = durable technical/product truth.**
Answers "how does Blood Moon work, right now, and why." Survives across
every session, every agent, every year. Reviewed and corrected in place
(never silently overwritten — see the `~~strikethrough~~` convention
already used in `docs/gameserver/database/legacy-unknown-structures.md`).
This is what a new engineer, or a new agent session with zero prior
context, should be able to read cold and understand the system from.

**KNOWLEDGE HUB = operational continuity.** Answers "what happened, when,
who/what session did it, what's still open, where's the handoff." Tracks
the *process* of building Blood Moon (and other projects), not the
*state* of Blood Moon itself. This is where a go/no-go call, a cross-
session task queue, or "what was session X actually doing" lives.

| Belongs in… | Examples |
|---|---|
| **Repo docs only** | Current architecture, current schema, current API contracts, ADRs (`docs/decisions/`), manuals, security posture, current VIP/payment/GameBridge design, module boundaries, anything a future engineer needs to be correct about *how the system works today* |
| **Knowledge Hub only** | Session-to-session task handoff mechanics, cross-project coordination, formal go/no-go launch decisions as a process artifact, raw session transcripts/events, anything that's about *how the work got done* rather than *what the system is* |
| **Both, deliberately** | A major decision like ADR-0001 (Portal = VIP source of truth) is written in full in repo docs (so it survives as durable truth) AND may also be registered as a decision event in the Knowledge Hub (so it's discoverable in the cross-session/cross-project operational history) — the repo doc is authoritative for the decision's *content*; the Knowledge Hub entry is a *pointer/record* that the decision happened, not a second copy of the reasoning |

## What NOT to duplicate

Do not copy full technical reasoning into the Knowledge Hub, and do not
copy raw session/task tracking into repo docs. If a Knowledge Hub entry
and a repo doc ever say different things about the *same current
technical fact* (not "what happened" but "how it works"), **the repo doc
wins** — it's the one held to this project's freshness/confidence
standard (`docs/README.md`, `docs/protocols/agent-bootstrap.md`) and the
one every future session is required to consult first.

## How agents should bootstrap from both

Per `docs/protocols/agent-bootstrap.md`, the *first* source is always
this repo's own `docs/README.md` and the relevant domain docs — that
answers "how does the system work." Only after that, if the task is
session/handoff-shaped (resuming someone else's in-progress work,
checking whether a decision was already formally approved, coordinating
across a task queue), check the Knowledge Hub via whatever tool surface
is available in the current session (e.g. `mcp__ccd_session_mgmt__*`).
Do not treat a Knowledge Hub lookup as a substitute for reading the repo
docs — the Hub does not describe *how Blood Moon works*, only *what
happened while building it*.

## Conflict resolution

1. **Repo docs vs. code**: investigate, document the discrepancy
   explicitly (per `docs/protocols/agent-bootstrap.md`'s fail-closed
   rule) — never silently trust one over the other without saying so.
2. **Repo docs vs. Knowledge Hub, on a *current technical fact***: repo
   docs win (see above) — but if the Hub's record is newer and looks
   authoritative, treat the repo doc as possibly stale and flag it for
   review rather than silently trusting the older written copy.
3. **Repo docs vs. Knowledge Hub, on *what happened/was decided***:
   Knowledge Hub wins — it's the operational record of process; a repo
   doc describing a decision's *content* is not a substitute for the
   Hub's record of *when/how it was formally approved*, if that
   distinction matters for the task at hand.

## Why this split, not a merged system

A single merged system would either bloat every technical doc with
session-tracking noise, or bloat every session record with duplicated
technical reasoning that immediately goes stale the next time the
underlying system changes. Keeping them separate, with a clear "repo
docs are the current-truth source, Knowledge Hub is the process-history
source" rule, lets each stay useful for its own purpose without the two
copies of the same fact silently drifting apart.
