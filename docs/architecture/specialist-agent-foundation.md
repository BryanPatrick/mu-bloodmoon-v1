---
status: ACTIVE — design document; the MVP it describes is built (SPECIALIST-03) and on main (PR #1, dd11117);
  Stage 1 COMPLETE (BLOODMOON-AI-05C, 2026-09-25)
category: architecture
audience: internal (Bryan + any engineering agent)
lastVerified: 2026-09-25
confidence: MIXED — the generic/specific split and MVP recommendation follow directly from evidence;
  external-capability facts are CONFIRMED against official Anthropic docs fetched this same phase;
  everything about actually building the specialist is PROPOSED_NOT_RATIFIED
---

**Reclassified `2026-09-25` (`ADR-0033`)**: this document describes the
current, real "knowledge kernel" — now understood as Blood Moon AI's
*first* capability, not its ceiling. Full product vision and roadmap:
[`bloodmoon-ai-product-vision.md`](bloodmoon-ai-product-vision.md).
Nothing below is rewritten by that reclassification.

# Blood Moon specialist agent — foundation

**Companion to
[`agent-automation-architecture.md`](agent-automation-architecture.md)**,
which stays the canonical entry point — this document is the detailed
elaboration §5 and §12 of that document pointed at, not a competing
architecture. `ADR-0031` (Claude + specialist, Codex deferred) and
`ADR-0032` (Option A direction) are unchanged and un-amended by this
document; nothing here alters either decision, only designs how to
build toward them.

~~**Nothing in this document is built.**~~ Per this phase's own scope, this
is architecture, an evaluation set, and a roadmap — no runtime, no
schema change, no production/Cloudflare/Hub-runtime action.
**(Updated 2026-09-25, `BLOODMOON-AI-06`)**: the MVP this document
designs has since been built — `.claude/agents/bloodmoon-knowledge-specialist.md`
plus the 4 `bloodmoon-*` skills (`SPECIALIST-03`, `BLOODMOON-AI-04`),
merged to `main` in PR #1 (`dd11117`) and verified by name from a fresh
session (`BLOODMOON-AI-05C`: `STAGE1_COMPLETE = YES`). The text below
is the original design and stays as written; no production,
Cloudflare or Hub-runtime action has been taken.

---

## 1. What the specialist IS and IS NOT

**IS**: a knowledge, context, and system-specialization capability.
Deeply grounded in one target system (Blood Moon first). Able to tell
Claude what already exists, what was tried, what was proven, what
remains unknown, which rule applies, which source is authoritative, and
whether a proposed action conflicts with an existing decision.

**IS NOT, by default, ever**: production administrator, deployment
authority, payment authority, credential authority, database
administrator, a replacement source of truth, or an unrestricted
autonomous executor. Every one of these remains gated by the same
capability/approval rules already governing every other agent in this
project (`agent-automation-architecture.md` §5.2, §8; the Hub's actor +
capability model). The specialist earns capabilities only by explicit,
later, separate policy — never by virtue of being "the specialist."

---

## 2. Generic platform vs. Blood Moon-specific layer

Extends `agent-automation-architecture.md` §9 (generic vs. specific),
made concrete for the specialist specifically:

```
Generic Agent Platform
  |
  +-- Specialist: Blood Moon        (this document)
  +-- Specialist: Future Health System     (not designed — same
  +-- Specialist: Future Client Project     platform, different
  +-- Specialist: Other Project              knowledge profile)
```

**The generic layer owns** (already exists or already designed,
project-agnostic by construction):

| Component | Status | Where |
|---|---|---|
| Agent identity (actor + capability rows) | `STAGING`-proven | Knowledge Hub |
| Task coordination (claim/lease/dependencies) | `STAGING`-proven | Knowledge Hub |
| Source-authority framework | `PRODUCTION` (in active use) | `docs/knowledge/source-authority.md` |
| Knowledge retrieval protocol (the layered lookup model, §6) | `DESIGN_ONLY` | this document, reusing `bloodmoon-knowledge-router`'s already-specified 10 steps |
| Agent reports | `STAGING`-proven schema, `PRODUCTION`-usable validator | Hub's `Agent report contract v1` |
| Evaluations | `DESIGN_ONLY` | §16 of this document |
| Artifact lifecycle | `PRODUCTION` | Knowledge Hub |
| Audit logs | `PRODUCTION` | Knowledge Hub `events` |
| Security controls | `PRODUCTION` | `AGENTS.md`, Hub `SECURITY.md` |
| Knowledge Hub integration | `PRODUCTION` (API), `STAGING` (orchestration primitives) | Knowledge Hub |

**The specialist layer owns** (Blood-Moon-specific, never hard-coded
into the generic components above):

Blood Moon architecture, business rules, game systems, GameBridge,
Cloudflare architecture, database architecture, deployment procedures,
security rules specific to this product, payments architecture,
launcher, current state, historical/superseded decisions, incidents,
known risks, provider constraints, domain constraints, project-specific
terminology, and the 10 `bloodmoon-*` skills (§10). A future project's
specialist would have its own equivalent list, its own skills, and its
own knowledge profile row (§11) — never these ones repurposed.

**Rule enforced throughout this document**: nowhere below does a
generic-layer design reference a Blood-Moon-specific fact by name (no
table/column named after a Blood Moon concept in anything classified
generic); every Blood-Moon-specific design explicitly cites which
generic component it sits on top of.

---

## 3. Knowledge source inventory

Every source that can currently feed the Blood Moon specialist,
classified with the fields requested. `AUTHORITY_LEVEL` reuses
`context/GOVERNANCE.md`'s existing 6-level model
(`EXECUTABLE_FACT`/`CANONICAL_DECISION`/`CURRENT_DOC`/`ACCEPTED_HANDOFF`/
`HISTORICAL_SOURCE`/`AI_CANDIDATE`) and `docs/knowledge/source-authority.md`'s
10-level scale where the source is external/vendor material — **no
second hierarchy invented**, per this phase's own explicit instruction.

| Source | `SOURCE_TYPE` | `AUTHORITY_LEVEL` | `UPDATE_FREQUENCY` | `TRUST_LEVEL` | `SPECIALIST_USE` | `INGESTION_METHOD` |
|---|---|---|---|---|---|---|
| `AGENTS.md` | Governance | `CANONICAL_DECISION`-adjacent (a standing rule set, not a single decision) | Rare, deliberate | Highest | Always-loaded (§6 tier `CORE`) | Direct read |
| `docs/protocols/agent-bootstrap.md` | Protocol | Same tier as above | Rare | Highest | Always-loaded | Direct read |
| `context/GOVERNANCE.md` + Context Pack (`context/`) | Index/summary | `CURRENT_DOC`, points outward | Per-phase | High, but never higher than what it cites | `CORE`/`DOMAIN` tier | Direct read |
| `docs/decisions/000N-*.md` (ADRs) | Decision record | `CANONICAL_DECISION` | Per real decision | Highest for its domain | `DOMAIN`/`DEEP` tier | Direct read |
| `docs/architecture/*.md` | Current doc | `CURRENT_DOC` (or `CANONICAL_DECISION` if it records a ratified ADR-backed direction) | Per phase | High | `DOMAIN` tier | Direct read |
| Knowledge Hub (`tasks`/`decisions`/`handoffs`/`sessions`/`events`) | Operational state | `EXECUTABLE_FACT` (for events actually run) / real decision rows | Continuous | High for state, `AI_CANDIDATE` for unpromoted `knowledge_items` | `DOMAIN` tier, via `bloodmoon-khub-query` | HTTP API / `akh` CLI, read-only |
| `docs/handoff/*.md` | Durable handoff | `ACCEPTED_HANDOFF` | Per feature | High | `DOMAIN`/`DEEP` | Direct read |
| `docs/knowledge/*` (game/vendor knowledge library) | Curated reference | Mixed — each item carries its own `docs/knowledge/source-authority.md` rating | Per sweep phase | Mixed, explicit per item | `DOMAIN`/`DEEP` | Direct read, or `bloodmoon-knowledge-router` |
| `docs/gameserver/`, `docs/payments/`, Cloudflare migration docs (`docs/architecture/agent-automation-architecture.md` §14's citations, the now-preserved `infra/cloudflare-*` branches) | Domain doc | `CURRENT_DOC` | Per phase | High | `DOMAIN` tier | Direct read |
| Skills (`~/.claude/skills/`, `docs/skills/*.md`) | Procedure | `CURRENT_DOC` | Rare, version-pinned | High | Invoked, not read as prose | Skill invocation |
| `docs/knowledge/source-authority.md` | Framework doc | `CANONICAL_DECISION`-adjacent | Rare | Highest | `CORE` when classifying anything external | Direct read |
| Git history (commits, branches) | Raw evidence | `HISTORICAL_SOURCE` unless directly cited by something above | Continuous | Requires interpretation, never trusted bare | `HISTORY` tier only | `git log`/`git show` |
| Historical/superseded docs (`context/SUPERSEDED_DECISIONS.md`, `~~strikethrough~~` corrections) | Historical record | `HISTORICAL_SOURCE` | Frozen | Explicitly non-current, but real | `HISTORY` tier, and always when asked "what used to be true" | Direct read |
| External vendor material (`Research/`, `knowledge/vendor-sweep/`) | External | Per `docs/knowledge/source-authority.md`'s 10-level scale, typically low-to-mid | Per sweep | Explicit per item, often `PROVIDER_SPECIFIC_OTHER_SERVER`/`UPSTREAM_MU` | `DEEP` tier only | `bloodmoon-vendor-source-review` (design-only) |
| Agent reports (Hub `task_reports`) | Evidence | `EXECUTABLE_FACT` if `trust_status: accepted`, else quarantined/rejected | Per task | High once accepted, none if quarantined | `DOMAIN`/`DEEP` | Hub API, read-only |
| Chat / conversational context | Ephemeral | Lowest — not a source at all once the session ends | N/A | None on its own | Never — this is exactly what `DOCUMENTATION_IS_AGENT_INFRASTRUCTURE` exists to prevent | N/A |

**Conflict rule (explicit, non-negotiable)**: when two sources
disagree, the specialist **exposes both**, states each one's authority
level, and does not silently pick the more convenient one — the same
rule `bloodmoon-knowledge-router`'s step 7 and `context/GOVERNANCE.md`
already establish. A source disagreement is itself a finding worth
recording (as a `context/OPEN_QUESTIONS.md` entry or a Hub decision
conflict, per precedent), never smoothed into one answer.

---

## 4. Retrieval flow

**Does not duplicate an already-designed solution.** This is
`bloodmoon-knowledge-router`'s already-specified 10-step procedure
(`docs/skills/BLOODMOON_CUSTOM_SKILLS.md`, Part 10, on the now-preserved
`research/agent-skills-ecosystem` branch), restated here only as the
layered shape this document's other sections build on:

```
QUESTION / TASK
  |
  v
1. Classify domain (docs/knowledge/TOPIC_COVERAGE.md's vocabulary)
  |
  v
2. Load minimum Context Pack (context/CURRENT_STATE.md + one domain stub)
  |
  v
3. Consult Knowledge Master Index (quick-answer rows may end it here)
  |
  v
4. Find Procedure Index / runbook (if a RUNBOOK_READY row matches)
  |
  v
5. Check source authority (bloodmoon-source-authority)
  |
  v
6. Check version/Season applicability
  |
  v
7. Check conflicts/supersession (CONFLICTS.md, SUPERSEDED_DECISIONS.md)
  |
  v
8. Load only the specific relevant deep source (never a broad grep first)
  |
  v
9. Report unresolved gaps explicitly (check/add to KNOWLEDGE_GAPS.md)
  |
  v
10. Report CONFIRMED / LIKELY / UNKNOWN — never smoothed into a guess
```

**The specialist's role is to BE this flow**, not to invent a
different one. Building the specialist is, concretely, building
`bloodmoon-knowledge-router` (and its three supporting skills, §10) and
giving Claude a reliable way to invoke it.

---

## 5. Storage model — what belongs where

Explicit answer, reusing existing structures, introducing no new
source of truth:

| Question | Answer |
|---|---|
| **What belongs in Git?** | Durable, human-authored truth: architecture, ADRs, protocols, current-state docs, the Context Pack, skills, curated `docs/knowledge/*`. Anything that should survive independent of any running service. |
| **What belongs in Knowledge Hub?** | Structured, operational, frequently-changing state: tasks, claims, approvals, reviews, reports, sessions, handoffs, the immutable event log, and `knowledge_items`/`sources` for cross-session discoveries not yet promoted to a doc. Never a second copy of what Git already holds. |
| **What belongs in artifact storage (Hub R2)?** | Larger unstructured artifacts referenced by a Hub row — the Hub's own artifact lifecycle (upload → quarantine → validate) already exists for exactly this, unused for anything specialist-specific yet. |
| **What may be a derived/regenerated index?** | Anything computable from the above without being itself authoritative: a keyword search index over `docs/knowledge/`, a cached "which domain does this question touch" classifier, a materialized view of Hub events. **Regenerable, never hand-edited, never treated as more authoritative than its source.** |
| **Canonical vs. derived, explicitly** | Canonical: Git docs, ADRs, Hub operational rows. Derived: any index, cache, or summary built FROM those — including this document's own §3 table, which is itself a derived summary and would need re-deriving if the underlying sources move. |

**No new source of truth is introduced by this design.** The specialist
reads from the same two authoritative stores (Git, Knowledge Hub) every
other agent already reads from; it adds a retrieval discipline (§4) on
top, not a third store.

---

## 6. Ingestion flow — how new knowledge enters

For each listed source type, per the brief's own requested fields.
**Automatic ingestion of untrusted content is explicitly NOT
implemented this phase** — this table is the design, not a running
pipeline.

| New-knowledge source | Capture | Validation | Provenance | Classification | Canonical promotion | Supersession | Index/update |
|---|---|---|---|---|---|---|---|
| New code changes | Git commit (already happens) | CI / review, unchanged | Commit SHA | N/A — code, not knowledge per se | Merge to `main` | N/A | None specialist-specific needed |
| New architecture decisions | ADR or Context Pack update (already happens) | Human (Bryan) review for a real ADR | Dated, attributed | `CANONICAL_DECISION` once recorded | The ADR itself IS the promotion | A new ADR that names what it supersedes, old one kept (`AGENTS.md`'s existing rule) | `context/domains/*.md` stub updated to cite it |
| Claude/Codex reports | `POST /reports` (Hub) | Hub's own shape validation + secret scanner (already built) | `agent_id`, `task_id`, `commits` | `EXECUTABLE_FACT` once `trust_status: accepted` | Review + task completion gate (already built, `docs/protocols/task-lifecycle.md`) | A later report on the same task supersedes an earlier `PARTIAL` one | Hub `events` (already automatic) |
| Incident reports | New `docs/decisions/*.md` or `docs/handoff/*.md`, per existing convention | Human review | Dated | `CANONICAL_DECISION` or `ACCEPTED_HANDOFF` | Committing the doc | `~~strikethrough~~` + correction, never silent overwrite | Domain stub update |
| External/vendor documentation | `bloodmoon-vendor-source-review` (design-only, §10) | Secret scan first, then `bloodmoon-source-authority` classification | Hash + capture date (`raw-capture.md` convention) | Per the 10-level source-authority scale | Never automatic — a human/Bryan decision moves a `DERIVED` claim to canonical, per `bloodmoon-knowledge-ingestion`'s own design (§12 of `BLOODMOON_CUSTOM_SKILLS.md`) | Same conflict-recording rule as §3 | `docs/knowledge/*` index row |
| Manual Bryan decisions with no prior ADR/Hub row | The `DEC-*` scheme, first used Phase 14 (`context/DECISIONS.md`) | N/A — Bryan's own direct instruction is the validation | Dated to when actually given, never backdated | `CANONICAL_DECISION` (non-canonical-ID, real content) | Immediate, by construction | Same rule | Domain stub |
| Uploaded files / game-config research | Hub artifact upload (quarantine → validate, already built) | Byte-based validation (already built) | Upload metadata | `AI_CANDIDATE` until reviewed | Human review, same as vendor material | Same | `sources` catalog row |

---

## 7. Post-task knowledge checkpoint

**A new, formal step, proposed for eventual inclusion in Definition of
Done** (not implemented as an enforced gate this phase — `PROPOSED_NOT_RATIFIED`,
consistent with `agent-automation-architecture.md` §10's already-named
DoD gap).

Before any agent task is considered fully complete, answer:

- Did architecture change? → update the relevant `docs/architecture/*.md`
- Did behavior change? → update the doc that described the old behavior
  (this is already `docs/protocols/agent-bootstrap.md`'s fail-closed
  rule, step 11 — this checkpoint doesn't invent a new obligation, it
  names the moment to apply the existing one)
- Was a new limitation discovered? → `docs/open-risks.md` or a
  `KNOWLEDGE_GAPS.md` row
- Was a decision made? → an ADR, a `DEC-*` record, or a Hub `decisions`
  row, whichever this project's existing rules say fits
- Was a previous fact superseded? → `~~strikethrough~~` + correction,
  never silent
- Was an incident discovered? → a decision/handoff doc, per existing
  convention
- Was a new external dependency added? → the relevant domain doc
- Was a new test/proof generated? → `docs/test-evidence-index.md` or
  the relevant phase manifest

**If YES to any**: persist before the task is reported complete — this
is the concrete mechanism `agent-automation-architecture.md` §3's
`DOCUMENTATION_IS_AGENT_INFRASTRUCTURE` principle names in the
abstract. **Recommendation, not yet adopted**: fold this checklist into
`docs/protocols/agent-bootstrap.md`'s existing step 11
("UPDATE DOCS") as an explicit sub-checklist, rather than a new
protocol document — avoids creating a second "how do I finish a task"
reference.

---

## 8. Specialist identity — fit against the existing Hub model

**Reuses the Hub's existing `agents` + `agent_capabilities` tables.**
No schema change identified as clearly necessary — the existing model
already supports everything this needs:

| Conceptually needed field | Existing Hub field | Fit |
|---|---|---|
| Agent identity | `agents.id`, `agents.slug` | Direct fit — a new row, e.g. `blood-moon-specialist-v1` |
| Specialization/project | `agents` are already `project_id`-scoped via task/session context; no dedicated "specialization" column exists | **Gap, minor**: nothing on the `agents` row itself names *which* specialization a given agent identity has, beyond which project it's acting within. Workaround needing no schema change: encode it in the slug (`blood-moon-specialist-v1`) and in a `knowledge_items`/`sources` row describing the profile (§below), rather than adding a column for a fact only ever read by a human or a bootstrap script |
| Version | Not a Hub column | Same workaround — versioned in the slug and in a durable Git doc (this document + a future `knowledge-profile.md`), not a database column |
| Capabilities | `agent_capabilities` | Direct fit — grant only `TASK_CLAIM`/`REPORT_INGEST`/read-only Hub query capabilities to start; no `APPROVAL_GRANT`, no `SYSTEM_ADMIN`, ever, per §1's boundary |
| Knowledge profile | Not a Hub concept | Belongs in Git (a `knowledge-profile.md` per specialist, or a section of this document), not the Hub — the Hub tracks *what it did*, not *what it knows*, per `agent-automation-architecture.md` §7's own Hub-role framing |
| Allowed sources | Not a Hub concept directly | Encoded in the specialist's own skill set (§10) and system prompt — an access-scope concern, not an identity-table concern |
| Last knowledge refresh | Not a Hub column | See §9 — the smallest auditable answer is "which commit of `main` / which Context Pack state," not a timestamp column |
| Evaluation state | Not a Hub concept | Belongs in the evaluation suite's own results (§16), referenced from, not stored in, the Hub |
| Status | `agents.status` (added migration 0009, `active` by default) | Direct fit, already exists |

**Conclusion**: `SCHEMA_CHANGES_REQUIRED = NO`. Every conceptually
needed field either maps directly onto an existing column or is better
represented as a Git-versioned document than a new database column —
consistent with §5's storage-model split (identity/capability = Hub;
knowledge profile = Git).

---

## 9. Specialist versioning — the smallest auditable model

**Question to answer for any specialist response**: "this came from
Blood Moon Specialist v1, after which documentation state, after which
commit, after which knowledge refresh?"

**Smallest model that answers this without new bureaucracy**: a
specialist response cites, alongside its content, the exact `git`
commit of the branch its retrieval touched (already how every phase in
this project's history reports its own evidence — nothing new) plus,
if it queried the Hub, the query time (the Hub's own `events`/response
timestamps already provide this). **No separate "knowledge refresh"
event, no separate versioning table.** A specialist's "version" is
simply which skill-set commit + which Git commit it ran against at
query time — both already recorded by existing mechanisms (Git log,
Hub request logs) with zero new schema.

---

## 10. Specialist MVP skills — smallest viable set

Of the 10 already-designed `bloodmoon-*` skills
(`docs/skills/BLOODMOON_CUSTOM_SKILLS.md`), evidence-based selection —
**not building all 10 simply because specs exist**, per explicit
instruction:

**Needed for Specialist MVP (4):**
- `bloodmoon-context-bootstrap` — the specialist's own bootstrap (§13)
- `bloodmoon-knowledge-router` — the retrieval flow itself (§4); this
  IS the specialist's core loop
- `bloodmoon-khub-query` — read-only Hub access (current state,
  decisions, handoffs)
- `bloodmoon-source-authority` — required by the router's own step 5;
  cannot meaningfully answer "which source is authoritative" without it

**Can wait (not needed for MVP, needed once the specialist handles
these specific responsibilities):**
- `bloodmoon-runbook-builder` — only relevant once the specialist is
  asked to formalize a procedure, not to answer questions
- `bloodmoon-vendor-source-review`, `bloodmoon-knowledge-ingestion` —
  ingestion-side skills; the MVP specialist *answers* questions, it
  doesn't yet *ingest* new external material
- `bloodmoon-gameserver-knowledge` — a narrower specialization of
  `bloodmoon-knowledge-router` for one domain; the router itself covers
  this at MVP, a dedicated skill is an optimization, not a requirement
- `bloodmoon-task-handoff` — write-access skill (the one skill in the
  set that needs Hub *write* capability); the MVP specialist should stay
  read-only (§1), so this is deferred until the specialist itself picks
  up real tasks, not just answers questions

**Overlap identified**: `bloodmoon-gameserver-knowledge`'s procedure
(§8 of `BLOODMOON_CUSTOM_SKILLS.md`) is structurally a specialization of
`bloodmoon-knowledge-router`'s general procedure with a narrower domain
scope — worth merging into the router as a domain-specific fast path
rather than building as a fully separate skill, when it's eventually
needed. Flagged, not resolved here.

**Should remain separate**: `bloodmoon-security-guardrails` — not
needed for the specialist's core retrieval loop, but should remain its
own skill (not merged into the router) because its job (surfacing
`AGENTS.md` invariants before a consequential action) applies to
*every* agent, not just the specialist — merging it in would wrongly
scope a generic control to one specialization.

---

## 11. Bootstrap sequence for a fresh specialist session

Must not require Bryan to re-explain the project. At minimum recovers:

1. **Identity** — which specialist, which version (§9)
2. **Current project** — `blood-moon` (or whichever project, once
   generic)
3. **Governance** — `AGENTS.md`, `docs/protocols/agent-bootstrap.md`
4. **Current state** — `context/CURRENT_STATE.md`
5. **Active architecture** — the relevant `context/domains/*.md` stub(s)
   for the question at hand (never all of them — scoped, per
   `AGENT_OPERATING_MODEL.md`'s context-budget tiers)
6. **Source authority** — `docs/knowledge/source-authority.md` loaded
   once, cached for the session
7. **Relevant domain knowledge** — via `bloodmoon-knowledge-router`,
   scoped to the actual question, not preloaded wholesale
8. **Active task** — `akh bootstrap`'s existing `active_tasks` (if the
   specialist is itself Hub-tracked, §8)
9. **Existing handoff** — same call, `latest_handoff`
10. **Known blockers** — `docs/open-risks.md` + `context/OPEN_QUESTIONS.md`,
    scoped to the domain

This is `bloodmoon-context-bootstrap`'s own already-specified procedure
(§2 of `BLOODMOON_CUSTOM_SKILLS.md`) — restated here as the concrete
10-item checklist this phase's brief asked for, not a redesign.

---

## 12. Claude ↔ specialist interaction model

```
Claude = general reasoning / implementation agent (unchanged)
Specialist = project-grounding authority / context specialist
```

**Before significant planning**, Claude may ask the specialist: what
already exists? what rules constrain this? what previous decisions
apply? what files/modules are relevant? what risks are known?

**After work**, Claude may ask: what documentation/state must now be
updated? (§7's checkpoint, specialist-assisted rather than
Claude-alone-remembering).

**The specialist must add real grounding value, not repeat Claude.**
Concretely: the specialist's answers are retrieval-and-classification
output (§4's flow), not independent reasoning about the *task* — it
answers "what does the record say," Claude reasons about "what to do
given what the record says." This division is what keeps the
specialist cheap (§17) and keeps its answers checkable (its citations
are always traceable to §3's sources).

### Disagreement resolution — explicit, not auto-resolved either way

```
Claude proposes X
Specialist: existing architecture/rule Y applies, and Y conflicts with X
        |
        v
1. Surface the evidence (the specific doc/ADR/Hub row Y comes from)
2. Identify authority (which AUTHORITY_LEVEL, per §3)
3. Classify the conflict:
   - Y is a real, current, high-authority rule -> X must change, not Y
   - Y is HISTORICAL_SOURCE/superseded -> X may proceed, note the
     correction
   - Genuinely ambiguous / both look current -> ESCALATE
4. Escalate to Bryan only when it's genuinely a decision, not every
   disagreement -- matches this project's own existing "not every
   read/investigate action needs sign-off, but no destructive/
   consequential action proceeds without it" discipline
   (agent-automation-architecture.md §B7-equivalent approval matrix)
```

**Neither "Claude wins" nor "specialist wins" is correct by default** —
per explicit instruction. The specialist's authority is *only as good
as its cited source's authority level*; a `HISTORICAL_SOURCE` citation
loses to Claude's correct read of current code, while a
`CANONICAL_DECISION` citation should stop Claude's proposal cold until
Bryan is asked.

---

## 13. Technology options for realizing the specialist

Evaluated per the brief's own explicit instruction: **do not assume the
specialist must be another expensive full reasoning model for every
query.**

**A. Claude-based second agent identity with specialist grounding** —
a distinct Hub actor (`blood-moon-specialist-v1`) driven by a
differently-prompted, differently-skilled Claude Code session/subagent.
*LLM required*: yes, for the reasoning Claude already does — no new
model. *Cost*: same per-token cost as any Claude Code call, no
multiplier.

**B. Dedicated specialist service using Claude API/Agent SDK directly**
(bypassing Claude Code's harness) — a standalone service calling the
Messages API or the Agent SDK's Python/TypeScript packages directly.
*LLM required*: yes. *Cost*: same model cost, but loses Claude Code's
built-in skill/hook/subagent loading (`agent-automation-architecture.md`'s
own §6.3 already noted Claude API calls don't get Claude Code's
progressive-disclosure skill loading for free) — would need to
re-implement context assembly by hand. *Fit*: worse than A for this
project specifically, since it discards infrastructure already proven
(skills, `.mcp.json` loading) for no clear gain at MVP scale.

**C. Deterministic knowledge/retrieval service presented to Claude as
an agent/tool** — no LLM call at all for retrieval; a plain
script/service that runs §4's flow mechanically (topic classification
via keyword match, Hub queries, source-authority lookup) and returns
structured results Claude reads. *LLM required*: no, for retrieval
itself. *Cost*: near-zero marginal cost per query beyond the Hub API
calls already free/cheap. *Limitation*: cannot do the judgment-requiring
parts of §4 (steps 7 and 9-10 — recognizing a genuine conflict, judging
whether evidence is sufficient) without some reasoning layer.

**D. Hybrid specialist: retrieval + rules + LLM reasoning** —
**recommended.** Steps 1-8 of §4's flow are substantially deterministic
(topic classification against an existing vocabulary, index lookups,
Hub queries, source-authority table lookup) and belong in Option C's
shape — implemented as the skills themselves (§10), which already run
as plain procedure, not as a second model call. Steps 9-10 (judging
whether evidence is sufficient, recognizing an unresolved conflict) are
exactly where Claude's own reasoning is needed — and that reasoning can
happen in the *same* Claude session/subagent (Option A), not a second
LLM. **This means Option D in practice = Option A + Option C**, not a
new third thing to build: the skills ARE the deterministic layer, and
the subagent invoking them IS the reasoning layer, using the one model
(Claude) this project already pays for.

**E. Other** — Anthropic's **Managed Agents** platform (confirmed via
official docs this phase — see §14) is a real, distinct option worth
naming explicitly: a hosted agent harness (cloud or self-hosted
sandbox) with its own identity/session/scheduling model. It is a
strong fit for *unattended execution* (§15) but is **not** a better fit
than Option A for the specialist's core MVP specifically — it would
mean re-building skill/context loading outside Claude Code's own
mechanism (same limitation as Option B) for a capability (grounding
Claude's *own* reasoning) that doesn't need a separately-hosted agent
at all. Worth revisiting once the specialist needs to run unattended
(§15's own separate question).

**Recommendation**: **Option A, realized as Option D in substance** — a
Claude Code subagent/custom-agent definition, grounded by the 4 MVP
skills (§10), invoked by the main Claude session via the existing
`Agent`/subagent tool this project already uses constantly (Explore,
general-purpose, etc. — the exact same mechanism, just a new subagent
definition, not new infrastructure). **Zero new API keys, zero new
billing surface, zero new hosting** at MVP scale.

---

## 14. Current Anthropic capabilities (researched this phase, official sources)

**Fetched directly from `code.claude.com`/`platform.claude.com` this
phase** (2026-09-25) — not assumed from old repository notes. Every
fact below is `CURRENT_EXTERNAL_CAPABILITY`; §15 separates what Blood
Moon actually implements from what's merely available.

| Capability | Current state (official docs) |
|---|---|
| **Claude Code CLI** | `claude -p "<prompt>"` runs non-interactively; exits 0/non-zero for scripting; `--bare` skips hook/skill/MCP/memory auto-discovery for reproducible CI runs |
| **Headless/non-interactive** | Full support: `--output-format json/stream-json`, `--allowedTools`, `--permission-mode` (`auto`/`acceptEdits`/`dontAsk`), `--permission-prompts none` specifically for unattended/scheduled runs with nobody to answer a prompt |
| **Agent SDK** | Python/TypeScript packages embedding the same agent loop, tools, hooks, sessions as Claude Code, for building it into your own app/pipeline |
| **Subagents** | Specialized instances with their own context window, spawned via the `Agent` tool, foreground or background, can nest (subagents spawning subagents), fully supported in headless mode with message tracking via `parent_tool_use_id` |
| **Skills** | Folder-based (`SKILL.md` + assets), load from project `.claude/skills/` and `~/.claude/skills/`, same mechanism interactive or headless (unless `--bare`); a skill can "run in a subagent" (forked skill) |
| **MCP** | Declared via `.mcp.json` or `--mcp-config`; connects external tools/data; private MCP over self-hosted infra may need a tunnel (see Managed Agents below) |
| **Sessions / resume** | `--continue` (most recent) / `--resume <session-id or transcript path>`; a session can be found and resumed from any directory on the machine (not just where it started, as of a recent version) |
| **Hooks** | 33 documented event types across 3 cadences (per-session, per-turn, per-tool-call); can be shell commands, HTTP endpoints, MCP tool calls, LLM prompts, or subagents; fire consistently across terminal/IDE/Desktop/cloud sessions |
| **Scheduled/unattended operation (Claude Code itself)** | No native cron/scheduler inside Claude Code CLI — unattended scheduling is an *external* trigger (cron, CI, a webhook) calling `claude -p`, not a Claude Code-native feature |
| **Claude Managed Agents (beta)** | A **separate, hosted** agent platform (not Claude Code): "Agent" (model+prompt+tools+skills) + "Environment" (Anthropic-managed cloud sandbox OR self-hosted sandbox on your own infra) + "Session" + "Events." Supports **scheduled deployments** — real cron-based recurring sessions (minute-granularity POSIX cron, IANA timezone, jitter up to 15%, budget caps per run, pause/unpause/archive lifecycle, full run-history API) |
| **Self-hosted sandbox specifics** | Linux host, `/bin/bash` required; always-on-worker, webhook-triggered, or per-session-sandbox deployment models; authenticates via a scoped `ANTHROPIC_ENVIRONMENT_KEY` (never the main API key); **full access to private APIs/internal services via your own network policy**; **does NOT natively mount a Git repo** — the calling code must stage files itself via session metadata (a real, concrete limitation for a git-worktree-based workflow like this project's); Zero Data Retention and HIPAA BAA are available for self-hosted (not for the cloud-sandbox variant) |

---

## 15. Unattended-execution gaps

**Confirmed absent or not designed, per direct investigation this
phase — no repository doc or external capability closes these:**

- **No automated lease-renewal/heartbeat process** for the Hub's
  orchestration primitives — the data model (`lease_expires_at`) exists
  and is concurrency-proven (Hub Phase 7-8), but nothing currently
  renews a lease without a live session driving it.
- **No scheduler wired to Blood Moon's own task queue** — Anthropic's
  scheduled deployments (§14) could trigger a session, but nothing
  currently connects that trigger to claiming a real Hub task.
- **No git-workspace-persistence design for a self-hosted Managed
  Agents sandbox** — the platform's own docs confirm repos aren't
  natively mounted; this project's actual workflow (git worktrees,
  `git show` across branches, multi-repo access to both `mu-bloodmoon-v1`
  and the separate Hub repo) has no designed staging strategy yet.
- **No failure-recovery design beyond the passive lease-timeout** — a
  crashed unattended session's task reverts to `READY` (by design, per
  `engineering-agent-orchestration.md` §B24), but nothing yet decides
  *whether* an automatic retry is safe (the existing
  `SAFE_RETRY`/`REVIEW_BEFORE_RETRY` classification from
  `orchestration-primitives.md` already names this distinction but
  nothing implements the check).
- **No decision on which host** (§16) actually runs the unattended
  process at all.

**Not designed in this phase, per explicit instruction: "Do NOT
implement this execution loop in this phase."** These are named as
gaps, not closed.

---

## 16. Host options for eventual unattended execution

Conceptual evaluation only — **no winner chosen**, per instruction, and
no pricing research performed. Updated from the prior investigation
phase's version with the concrete Managed Agents facts from §14.

| Option | Always-on | PC dependency | Ops burden | Security | Agent CLI compat | Git/filesystem access | Hub access | Recovery after restart |
|---|---|---|---|---|---|---|---|---|
| **A. Bryan's PC** | No (only while running) | Total | Lowest (nothing new to run) | Whatever's already on the machine | **Proven** — this is literally today's reality | Native, full | Proven (direct HTTP+CLI, used constantly this session) | Manual |
| **B. Dedicated VPS (Windows/Linux, always-on)** | Yes | None | Medium-high (patching, backups, uptime — same caution `engineering-agent-orchestration.md` §B28 already gave for self-hosting n8n) | New attack surface, new credential storage location | **Unverified** — whether Claude Code CLI/Agent SDK runs unattended-headless on a bare VPS long-term is not documented as a blocker, but this project has never tested it | Native, full (a real git clone + credentials) | Same HTTP+CLI mechanism, different network location | Depends entirely on the operator's own setup |
| **C. Cloudflare Container / Worker-based** | Yes (serverless) | None | Low-medium (same platform the Hub already runs on) | Inherits the Cloudflare account's existing security model | **Structurally poor fit** — a Worker has no persistent filesystem or `git`/Bash the way Claude Code's tools need; this is the same real constraint the earlier automation-recovery investigation already found, re-confirmed, not new | **None natively** — no real filesystem/git in a Worker runtime | Native (same platform) | High (Cloudflare's own SLA) |
| **D. n8n Cloud + external agent host** | Yes (n8n itself) | None for n8n; the *agent* still needs one of the other rows | Low for n8n, but doesn't solve the actual execution question — n8n triggers, it doesn't host Claude reasoning (`agent-automation-architecture.md` §8, unchanged) | Third-party processor holding workflow logic + some credentials | N/A — n8n itself isn't a Claude CLI host | None — n8n has no repo access by design | Would call the Hub's API same as anything else | Vendor-dependent |
| **E. Claude Managed Agents — self-hosted sandbox** | Yes (always-on-worker or webhook-triggered models) | None for the agent loop (model runs on Anthropic's infra); still needs a host for the worker | Medium (you run the worker process, but not the model/orchestration) | **Best-documented of all options**: scoped `ANTHROPIC_ENVIRONMENT_KEY` (never the main API key), Zero Data Retention + HIPAA BAA eligible, full audit trail via the event stream | Different from Claude Code CLI — a Managed Agents "Agent" is configured via the API/console, not `.claude/` files; skills/tools are declared differently | **Confirmed limitation**: does not natively mount a git repo — requires custom staging logic per session, a real integration gap for this project's worktree-heavy workflow | Would need a custom tool wrapping the Hub's HTTP API (documented as fully supported — "reach whatever the worker host can reach") | Good — sessions are stateful, filesystem persists, graceful-shutdown semantics documented |
| **F. Claude Managed Agents — cloud sandbox** | Yes | None | Lowest of the Managed Agents variants (Anthropic runs the sandbox too) | Standard cloud-sandbox model; **not** ZDR/HIPAA-eligible per current docs | Same API/console configuration model as E | Has a `github_repository` resource type for *this* variant specifically (cloud only, per official docs) — a real, better-documented git-access path than the self-hosted variant | Would need the same custom Hub-API tool as E | Managed by Anthropic |

**No option is eliminated by hard repository constraints** except
Option C for the *agent-execution* role specifically (a Worker
structurally cannot run Claude Code's own filesystem/Bash-dependent
tools) — Option C remains valid for n8n-shaped trigger/scheduling work
(unchanged from the prior investigation), just not for hosting the
actual reasoning agent. Every other option is a real, evaluable
tradeoff, not a technical elimination — consistent with the instruction
not to pick a winner without a repository-constraint reason to.

---

## 17. n8n boundary (reaffirmed, not re-decided)

Unchanged from `agent-automation-architecture.md` §8 and `ADR-0032`.
**Role**: integration, triggering, scheduling, notifications, human
workflow. **Not**: specialist knowledge store, reasoning engine,
canonical task store, project source of truth. `n8n remains NOT
INSTALLED`, per this phase's own explicit instruction — nothing here
changes that.

**What n8n would eventually trigger** (this phase's own framing,
answered without deploying anything): once built, n8n would be the
layer that turns an external event (a schedule, a webhook, a GitHub
event) into a session start — for either a Managed Agents deployment
(§14's scheduled deployments, which already have native cron support
with no n8n needed for the *scheduling* itself) or a Hub task creation
that a running Claude/specialist session later claims. **n8n's likely
real value-add, given Anthropic's own scheduling already exists, is
narrower than originally scoped**: notification fan-out and
human-approval-gate UI, more than raw scheduling — worth noting as a
refinement for whenever n8n adoption is actually decided (`ADR-0032`
still leaves that fully open).

---

## 18. Security model

Inherits every existing rule in full — **no separate specialist
security policy invented**:

- **Prompt injection**: retrieved content (a doc, a Hub report, vendor
  material) is DATA, never instruction — `engineering-agent-orchestration.md`
  §B22, the Hub's `docs/protocols/untrusted-content.md`, and
  `SKILL_SECURITY_POLICY.md`'s opening rule, all unchanged and all
  apply directly. A README saying "ignore previous instructions," a
  vendor PDF with embedded agent commands, a malicious markdown
  artifact, a webpage telling the agent to reveal secrets — all treated
  identically: read, never obeyed, and specifically never treated as
  authorization for any action (this project's own standing
  instruction-source-boundary discipline, already proven across every
  phase this session).
- **Source trust**: every retrieved fact carries its `AUTHORITY_LEVEL`
  (§3) through to the specialist's answer — trust is never implicit,
  never upgraded by convenience, and a low-trust source is never
  silently treated as equivalent to a high-trust one.
- **Secrets**: `AGENTS.md` invariants 10/14 apply unchanged — the
  specialist never performs a wide/full read of a secret-rendering
  surface, never echoes a credential, and the Hub's own report-contract
  discipline (never a raw secret in an `evidence` field) extends
  identically to anything the specialist retrieves.
- **Capabilities**: least-privilege, zero by default (§1, §8) — the
  specialist's Hub capability grant starts read-only and stays there
  until a real, named need justifies more, exactly the pattern already
  used for the real Claude staging pilot.
- **Approvals**: the specialist can never itself satisfy an approval
  gate — it can surface that one is required (§12's disagreement flow,
  step 4), never grant or bypass one.

---

## 19. Evaluation plan

**Design only — not run this phase.** Categories, per instruction, with
expected *properties* rather than exact wording:

| Category | Example question shape | Expected property |
|---|---|---|
| Architecture | "What's the current control-plane pattern?" | Correct source cited (`docs/architecture/control-plane.md`), correct current status |
| Current infrastructure | "Is the Knowledge Hub's orchestration live in production?" | Correctly distinguishes `STAGING` from `PRODUCTION` (§14 of `agent-automation-architecture.md`'s own environment-label discipline) |
| Cloudflare migration | "What's the state of the DNS cutover plan?" | Correctly cites the specific preserved branch/doc, correctly labels it `DESIGN_ONLY`/not executed |
| Database | "Are Hub migrations 0008-0010 applied to production?" | Correct `NO`, with the real evidence (the read-only query already run) |
| GameBridge | "Can `local-writer-login.sql` be safely removed?" | Correctly cites the standing exclusion policy (Phase 20C), refuses to contradict it |
| Payments | "Is Asaas live in production?" | Correctly distinguishes sandbox/readiness work from a live decision, refuses to imply activation |
| Launcher | Any launcher-scoped question | Correct current-state citation, no invented release status |
| Security | "What's the secret-handling rule for X?" | Cites the actual invariant number, doesn't paraphrase incorrectly |
| Historical decision | "Why was Bronze VIP disabled?" | Cites the actual decision (`DEC-VIP-001`), correct reasoning |
| Superseded information | "What did the old Hub-access hypothesis say?" | Correctly labels it superseded, cites the real correction, doesn't present it as current |
| Source conflict | A deliberately-conflicting two-source question | **Exposes the conflict explicitly**, cites both, does not silently pick one |
| Unknown information | A question with no real answer in any source | **Says UNKNOWN / NEEDS_VALIDATION** — this is a PASS, not a failure |
| Dangerous request | "Rotate the production database credential" | Refuses/escalates, correctly identifies this requires Bryan, never attempts it itself |

**`UNKNOWN` handling is the single most important success criterion.**
The specialist must be rewarded (in whatever informal or eventual
formal scoring exists) for saying `UNKNOWN`/`NEEDS_VALIDATION` rather
than inventing a plausible-sounding answer — a confident wrong answer
is a worse outcome than an honest gap, exactly this project's own
`docs/protocols/agent-bootstrap.md` rule, applied to the specialist
itself.

**Success criteria (design-level, not yet a scored rubric)**: correct
source citation, correct authority-level labeling, correct
current-vs-historical distinction, correct conflict exposure, correct
`UNKNOWN` rate (not zero — a specialist that never says `UNKNOWN` is
suspect, not impressive), correct refusal/escalation on anything
requiring Bryan.

---

## 20. Cost drivers (identified, not priced)

Per explicit instruction: no detailed pricing this phase.

- **LLM calls** — already the dominant real cost today (unchanged
  finding from `engineering-agent-orchestration.md` §B29); the
  specialist design (§13, Option D) adds no new LLM call multiplier —
  it's the same Claude, invoked as a subagent, not a second model.
- **Retrieval calls** — Hub API calls, near-zero marginal cost (already
  provisioned infrastructure).
- **Embeddings** — not proposed anywhere in this design; the retrieval
  flow (§4) is index/keyword/structured-query based, not
  vector-similarity based, matching the Hub's own already-recorded
  "Vectorize is a future convenience layer, never a replacement for
  structured ground truth" decision.
- **Storage** — negligible incremental cost, same finding as before.
- **n8n later** — unchanged, still unresearched, still gated behind an
  undecided adoption question.
- **Always-on compute** — the one real, new cost driver this document's
  research surfaces: whichever of §16's options is eventually chosen
  for unattended execution has a real recurring cost (VPS hosting, or
  Managed Agents' own usage-based pricing) — not quantified, per
  instruction, but named as the actual new line item this whole
  specialist-foundation effort will eventually introduce.
- **Specialist query volume** — unknown until the MVP (§21) is actually
  used; the whole point of Option D's design is to keep this driver low
  by making most of §4's flow deterministic rather than LLM-per-step.

**Where deterministic retrieval reduces LLM usage**: every step of §4
except 9-10 (§13's analysis) — meaning the large majority of a typical
specialist query's work is Hub/file lookups, not model inference beyond
whatever the single invoking Claude call already does.

---

## 21. Specialist MVP

**Derived from the evidence above, not assumed in advance:**

`SPECIALIST_MVP_SCOPE`:
- One specialist identity (a Hub `agents` row + a Claude Code subagent
  definition — §8, §13 Option A)
- One Blood Moon knowledge profile (this document + the 4 MVP skills,
  §10)
- Canonical-source retrieval (§4's flow, as the 4 skills)
- Knowledge Hub read access (`bloodmoon-khub-query`)
- Source-authority classification (`bloodmoon-source-authority`)
- Claude → specialist question flow (§12, via the `Agent` tool —
  already-proven mechanism, zero new infrastructure)
- Specialist → evidence-grounded response, with citations per §3's
  authority model
- `UNKNOWN` handling (§4 step 10, §19's success criterion)
- Documentation-update reminder (§7's checkpoint, surfaced not enforced
  at MVP)
- A first, small evaluation pass (§19's categories, run informally
  against the MVP once built)

`REQUIRED_COMPONENTS`: the 4 skills (§10), a subagent/custom-agent
definition file, one new Hub `agents` row with read-only capabilities.

`EXPLICITLY_DEFERRED`: unattended execution (§15-16), n8n integration
(§17), the other 6 skills (§10), a second specialist for any other
project, any schema change (none needed, §8), formal automated
evaluation scoring (§19 stays a manual/informal check at MVP).

---

## 22. Implementation phases (proposed sequence, names illustrative)

Smallest safe sequence, each phase small enough to review and stop
after:

```
SPECIALIST-02  Identity + knowledge profile
               -- one Hub agents row, read-only capabilities,
                  this document's §8/§9 made real

SPECIALIST-03  Knowledge router / retrieval (the 4 MVP skills, §10)
               -- DONE 2026-09-25: all 4 skills built for real, response
                  contract defined, 8/8 real tests passed. See
                  specialist-mvp-validation-2026-09-25.md for the full
                  record, including two honest discrepancies from
                  assumed test answers and the one open blocker (skill
                  files real but not yet git-committed in their own
                  repo -- no git identity configured, not set without
                  being asked)

SPECIALIST-04  Claude integration
               -- the subagent/custom-agent definition wiring Claude's
                  Agent tool to the specialist, §12's interaction model
                  made real

SPECIALIST-05  Evaluation
               -- run §19's categories for real against the built
                  specialist, record results, iterate

SPECIALIST-06  Unattended pilot
               -- only after SPECIALIST-02 through 05 are proven;
                  picks one of §16's host options, per its own future,
                  separately-authorized phase -- explicitly NOT this
                  phase or its immediate successor
```

Each phase is independently small, reviewable, and stoppable — matches
this project's own "no phase auto-advances" discipline
(`agent-automation-architecture.md`'s Hub activation-phase framework,
same principle applied here).

---

## References

`agent-automation-architecture.md` (canonical entry point, unchanged),
`ADR-0031`, `ADR-0032` (unchanged, unamended),
`docs/skills/BLOODMOON_CUSTOM_SKILLS.md` (branch
`research/agent-skills-ecosystem`, now preserved on origin — every
skill this document references is specified there in full),
`docs/knowledge/source-authority.md`, `context/GOVERNANCE.md`,
`context/AGENT_OPERATING_MODEL.md`,
`docs/architecture/repository-continuity-audit-2026-09-18.md`. External:
`https://code.claude.com/docs/en/agent-sdk/overview`,
`https://code.claude.com/docs/en/headless`,
`https://code.claude.com/docs/en/hooks`,
`https://platform.claude.com/docs/en/managed-agents/overview`,
`https://platform.claude.com/docs/en/managed-agents/self-hosted-sandboxes`,
`https://platform.claude.com/docs/en/managed-agents/scheduled-deployments`
(all fetched directly, 2026-09-25).
