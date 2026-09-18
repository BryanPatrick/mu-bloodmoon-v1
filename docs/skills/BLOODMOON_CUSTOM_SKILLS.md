---
status: ACTIVE
category: skills
audience: internal (product + engineering)
lastVerified: 2026-09-18
---

# Blood Moon custom skills — design

10 candidate Blood Moon-authored skills (Phase 19 Part 9), with
`bloodmoon-knowledge-router` (Part 10), `bloodmoon-khub-query` (Part 11),
`bloodmoon-knowledge-ingestion` (Part 12), and `bloodmoon-runbook-builder`
(Part 13) specified in full detail as instructed. None of these are built
yet — this is the design, informed by `SKILL_ECOSYSTEM_RESEARCH.md`'s
findings on how Claude Code Skills actually work (SKILL.md frontmatter,
progressive disclosure, `allowed-tools`, plugin packaging) and by this
project's own existing skill (`bloodmoon-deploy`) as house-style precedent.

**Cross-branch dependency note (confirmed 2026-09-18)**: this document
was written on `research/agent-skills-ecosystem` (branched from `main`),
but references many `docs/knowledge/*.md` files (`KNOWLEDGE_MASTER_INDEX.md`,
`PROCEDURE_INDEX.md`, `CASH_VIP_INTEGRATION_MAP.md`, `KNOWLEDGE_GAPS.md`,
`CONFLICTS.md`, `KHUB_SOURCE_NORMALIZATION.md`, `validate.mjs`) that
**exist only on `knowledge/legacy-vps-inventory` (Phase 18/18B/18C's
branch, commit `542c13ce`), not yet merged to `main`**. Confirmed directly
this phase (`git show knowledge/legacy-vps-inventory:docs/knowledge/
CASH_VIP_INTEGRATION_MAP.md` succeeds; the same path is absent on this
branch's own working tree). This is the same cross-branch reference
pattern `context/README.md` already documents and flags for its own
content (`OPEN_QUESTIONS.md` OQ-CTX-001) — not a new problem, the same
"worktree sprawl" this project's `AGENTS.md` invariants 2-4 already name.
These 10 skill designs are written assuming that branch eventually merges;
if it doesn't, every reference below needs re-pointing at wherever that
content actually lands. Not resolved by this phase — flagged honestly
rather than silently building on a branch that may not exist by the time
these skills are actually built.

All 10 are designed to be **portable-by-default** (see
`N8N_CLAUDE_SKILL_ARCHITECTURE.md`'s portability section): the SKILL.md
body is plain markdown with no Claude-Code-only syntax beyond the
YAML frontmatter, so the same content is usable as a system-prompt
fragment for a plain API call, an MCP `skill://` resource (per SEP-2640,
per the research), or a Codex-readable doc — only the *loading mechanism*
differs per host.

## §1 `bloodmoon-knowledge-router` — see Part 10 below (full spec)

## §2 `bloodmoon-context-bootstrap`

- **Purpose**: package `docs/protocols/agent-bootstrap.md`'s 15-step
  sequence plus `context/README.md`'s bootstrap order into one invocable
  procedure, so a fresh session doesn't have to be told to do this every
  time.
- **Trigger**: start of a new session/task with no prior context; explicit
  invocation ("bootstrap me on X").
- **Inputs**: task description (freeform), optionally a domain hint.
- **Procedure**: read `AGENTS.md` → `docs/protocols/agent-bootstrap.md` →
  `context/CURRENT_STATE.md` → the matching `context/domains/*.md` stub →
  `context/DECISIONS.md` for that domain → latest relevant
  `docs/handoff/` entry → hand off to `bloodmoon-knowledge-router` for
  anything the bootstrap stubs don't answer directly.
- **References**: `AGENTS.md`, `docs/protocols/agent-bootstrap.md`,
  `context/README.md`.
- **Tools required**: Read, Grep, Glob only — no writes, no network.
- **Security boundary**: read-only by construction; cannot itself
  authorize any action, only orient.
- **Expected output**: a short "here's what I know, here's what I still
  need" summary, not a completed task.

## §3 `bloodmoon-source-authority`

- **Purpose**: apply `docs/knowledge/source-authority.md`'s 10-level scale
  consistently, without an agent having to re-derive it from memory each
  time.
- **Trigger**: whenever a claim's trustworthiness needs to be stated (a
  new knowledge item, a conflict, a decision citation).
- **Inputs**: a source description (file, video, tutorial, decision,
  inference) and what it claims.
- **Procedure**: classify authority level (1-10 per the existing scale) +
  Blood-Moon-relevance (`BLOODMOON_CONFIRMED`/`LIKELY`/`UPSTREAM_MU`/
  `PROVIDER_SPECIFIC_OTHER_SERVER`/`LEGACY`/`UNKNOWN`) + confidence, per
  the existing, already-mature scales — this skill packages the
  *lookup table*, it does not invent a new one.
- **References**: `docs/knowledge/source-authority.md`,
  `docs/knowledge/conflict-resolution.md`.
- **Tools required**: none beyond reading the reference doc.
- **Security boundary**: pure classification, no side effects.
- **Expected output**: a 2-axis classification tag, ready to attach to a
  knowledge item or claim.

## §4 `bloodmoon-runbook-builder` — see Part 13 below (full spec)

## §5 `bloodmoon-khub-query` — see Part 11 below (full spec)

## §6 `bloodmoon-knowledge-ingestion` — see Part 12 below (full spec)

## §7 `bloodmoon-vendor-source-review`

- **Purpose**: apply the same review discipline this project already used
  manually (Phase 18's DMN CMS source trace, the VPS tutorial hash-
  verification) as a repeatable procedure for the *next* vendor source
  found, instead of re-deriving the method each time.
- **Trigger**: a new vendor/supplier artifact is found (a tutorial, a
  config file family, a decompiled tool) and needs cataloging.
- **Inputs**: the artifact's location and a short description of what it
  appears to be.
- **Procedure**: (1) classify format (RAW type per `raw-capture.md`); (2)
  scan for secrets before anything else (per `raw-capture.md`'s secrets
  rule); (3) hash it; (4) classify source authority
  (`bloodmoon-source-authority`); (5) determine Blood-Moon-relevance —
  does it describe THIS server's actual config, or generic/other-server
  content (per `source-authority.md`'s `PROVIDER_SPECIFIC_OTHER_SERVER`
  distinction, which caught the EuSanTiago/RealMU case in this project's
  real history); (6) record in the appropriate index
  (`VPS_DOCUMENTATION_INDEX.md`/`LEGACY_SUPPLIER_INDEX.md`/
  `VIDEO_SOURCES.md`, whichever fits); (7) flag for
  `bloodmoon-knowledge-ingestion` if it needs full extraction.
- **References**: `docs/knowledge/raw-capture.md`,
  `docs/knowledge/source-authority.md`, `docs/knowledge/vps-ingestion.md`.
- **Tools required**: Read, Bash (for hashing only), Write (to update an
  index file) — no network unless the source IS a URL, in which case
  WebFetch, explicitly declared.
- **Security boundary**: treats every artifact as untrusted per
  `SKILL_SECURITY_POLICY.md`; never executes a script/binary found this
  way; secrets are redacted-not-omitted per the existing convention.
- **Expected output**: an index entry (new row in the relevant
  `docs/knowledge/*.md` table) plus a RAW/NORMALIZED/DERIVED status.

## §8 `bloodmoon-gameserver-knowledge`

- **Purpose**: the narrow, GameServer-specific lookup this project's own
  Phase 18C found itself needing repeatedly — "is this config family
  live-reload-safe, and what's the real field-by-field shape" — packaged
  so it doesn't require re-reading `xshop-cashshop-config-field-matrix.md`
  and `CASH_VIP_INTEGRATION_MAP.md` from scratch each time.
- **Trigger**: any task touching a `Data/Custom`, `Data/Command`,
  `Data/Event`, or `GameServer/DATA` config file.
- **Inputs**: the config file name or feature name.
- **Procedure**: (1) check `knowledge/vendor-sweep/` via
  `knowledge-query.mjs` for existing claims about it; (2) check
  `docs/economy/` for a field matrix if it's shop/currency-related; (3)
  check `KNOWLEDGE_GAPS.md`/`CASH_VIP_INTEGRATION_MAP.md` for known
  reload/restart status — `LIVE_RELOAD_CONFIRMED` vs `UNKNOWN`, never
  assume; (4) if nothing exists, say so and route to
  `bloodmoon-vendor-source-review` or the RemoteOps incremental-sweep
  procedure (`docs/knowledge/vps-ingestion.md`) rather than guessing.
- **References**: `docs/economy/*`, `knowledge/vendor-sweep/*`,
  `docs/knowledge/CASH_VIP_INTEGRATION_MAP.md`, `docs/knowledge/vps-
  ingestion.md`.
- **Tools required**: Read, Bash (to run the existing `node scripts/
  knowledge-*.mjs` query tools).
- **Security boundary**: read-only against local files; RemoteOps access
  (if escalated) stays within the existing allowlisted, read-only
  boundary (`vps-ingestion.md`) — this skill never gains new VPS
  privileges of its own.
- **Expected output**: current-knowledge state (CONFIRMED/UNKNOWN) for the
  requested config family, with citations.

## §9 `bloodmoon-security-guardrails`

- **Purpose**: a checklist skill (not an executor) that surfaces
  `AGENTS.md`'s always-on invariants relevant to the CURRENT task, so an
  agent doesn't have to hold all 24 in working memory at once — this is
  the packaging half of `SKILL_SECURITY_POLICY.md`'s always-on-vs-skill
  distinction, applied to `AGENTS.md` itself.
- **Trigger**: before any deploy, migration, credential, or destructive
  action.
- **Inputs**: a short description of the action about to be taken.
- **Procedure**: match the action against the relevant `AGENTS.md`
  invariants (branch/worktree checks, secrets, least-privilege, evidence-
  first, destructive-action authorization, storage preflight) and surface
  exactly the ones that apply — never a blanket dump of all 24, never a
  silent skip of the one that matters for this specific action.
- **References**: `AGENTS.md` itself — this skill never restates its
  content, only routes to the applicable invariant numbers.
- **Tools required**: none — pure reasoning over the task description.
- **Security boundary**: this skill can only ADD friction (surface a
  required check), never remove it — it must never be able to declare an
  invariant satisfied on the agent's behalf.
- **Expected output**: a short list of "confirm X before proceeding" items
  specific to the task.

## §10 `bloodmoon-task-handoff`

- **Purpose**: package the Knowledge Hub's own handoff discipline
  (`hub/docs/agent-handoff.md`) as an invocable end-of-session procedure,
  so a session's real state (git HEAD, what changed, what's blocked,
  next steps) reliably reaches the Hub in the structured shape it expects,
  rather than only living in a chat transcript summary.
- **Trigger**: end of a work session, or explicitly ("hand off this
  session").
- **Inputs**: what was done this session (the agent's own summary).
- **Procedure**: (1) capture real git state (branch, HEAD, dirty/clean —
  matching what `akh bootstrap`'s own `git_state`/`git_drift` fields
  already check for); (2) `akh handoff create` with `--current-state`/
  `--completed`/`--problems`/`--next-steps` populated from real session
  facts, never placeholder text; (3) flag any `git_drift` (Hub's last
  known HEAD vs. actual current HEAD) explicitly rather than silently
  proceeding.
- **References**: `hub/docs/agent-handoff.md`, `hub/docs/cli.md`.
- **Tools required**: Bash (`git`, `akh` CLI) — write access to the
  Knowledge Hub (a real mutation, unlike the read-only
  `bloodmoon-khub-query`) — this is the one skill in this set that
  legitimately needs Hub write access, and it should be the *only* one.
- **Security boundary**: writes only to the `handoffs`/`sessions` tables
  via the existing `akh` CLI (never raw SQL, never a direct D1 write);
  never fabricates "completed work" — only records what the session
  summary actually states.
- **Expected output**: a real Hub handoff record, plus the `git_drift`
  flag if relevant.

---

# Part 10 — `bloodmoon-knowledge-router` (full detail, designated first build)

**Purpose**: the default knowledge-lookup skill for engineering agents —
answers "how do I find out about X" by routing through the layers this
project already built (Context Pack → Knowledge Master Index → Procedure
Index → source → deep material), instead of an agent re-deriving the
right search order from scratch or jumping straight to a full-repo grep.

**Trigger**: any task-start question shaped like "how do I do X" / "where
is X documented" / "what do we know about X" — either explicit invocation
or the harness's own description-matching (SKILL.md's `description` field
states this trigger shape so Claude Code can invoke it automatically,
per the progressive-disclosure model `SKILL_ECOSYSTEM_RESEARCH.md`
documents).

**Inputs**: a task or question in natural language.

**Procedure** (the exact 10 steps requested):

1. **Classify task/domain** — match the question against the topic
   vocabulary already established in `docs/knowledge/TOPIC_COVERAGE.md`
   (CASH_WCOIN, XSHOP_CASHSHOP, GAMESERVER, MARKETPLACE, etc.) — never
   invent a new topic name if an existing one fits.
2. **Load minimum Context Pack** — read `context/CURRENT_STATE.md` and
   the one matching `context/domains/*.md` stub, nothing more at this
   stage (per `AGENT_OPERATING_MODEL.md`'s "context budget" principle,
   already established).
3. **Consult Knowledge Master Index** — `docs/knowledge/
   KNOWLEDGE_MASTER_INDEX.md`'s router table and "Legacy & vendor
   knowledge" section; if the question is already one of its quick-answer
   rows, that IS the answer, stop here.
4. **Find Procedure Index/runbook** — `docs/knowledge/PROCEDURE_INDEX.md`;
   if a `RUNBOOK_READY` row matches, surface it with its risk/approval
   fields intact, never stripped.
5. **Check source authority** — invoke `bloodmoon-source-authority` on
   whatever source the answer traces to.
6. **Check version applicability** — per `docs/knowledge/conflict-
   resolution.md`'s "Version/Season discipline": does the answer's source
   carry a Season/build/date, and does it match the CURRENT question's
   implied context? Flag if unknown, never assume compatibility.
7. **Check conflicts/supersession** — `docs/knowledge/CONFLICTS.md` and
   `context/SUPERSEDED_DECISIONS.md`; if two sources disagree, surface
   both per the existing never-silently-pick-a-winner rule, don't average
   them into a single answer.
8. **Load only relevant deep source** — only now, if the above didn't
   fully answer it, open the specific `knowledge/vendor-sweep/` claim, the
   specific `docs/economy/*` doc, or the specific raw archive file named
   by the router — never a broad `grep -r` across `D:\MU\` as a first
   resort.
9. **Report unresolved knowledge gaps** — if steps 1-8 leave a real gap,
   say so explicitly and check whether it's already tracked in
   `docs/knowledge/KNOWLEDGE_GAPS.md`; if not, that's itself a finding
   worth recording, not silently absorbing into a best-guess answer.
10. **Execute only if evidence is sufficient** — this skill's own
    output is a routing decision plus an evidence trail, not an
    authorization to act; whether "sufficient evidence" exists is
    reported honestly (CONFIRMED / LIKELY / UNKNOWN), and an UNKNOWN
    result correctly blocks a confident action downstream rather than
    being smoothed over.

**References**: every doc in `docs/knowledge/` (this skill IS the
router that ties them together — it should never duplicate their
content, only sequence access to it), `context/README.md`.

**Tools required**: Read, Grep, Glob, Bash (for `node scripts/
knowledge-*.mjs` and `akh` read commands only) — no Write, no network by
default (an explicit escalation to `bloodmoon-knowledge-ingestion` or
`bloodmoon-vendor-source-review` is a separate, named step, never
implicit).

**Security boundary**: read-only; cannot itself approve or perform a
consequential action (that's `bloodmoon-security-guardrails`'/`AGENTS.md`'s
job); treats every deep source it eventually opens as subject to the same
untrusted-content rule as any other RAW material.

**Expected output**: a structured answer — `DOMAIN`, `ANSWER` (with
citation), `SOURCE_AUTHORITY`, `VERSION_APPLICABILITY`,
`CONFLICTS_FOUND` (Y/N), `EVIDENCE_SUFFICIENT` (Y/N), `GAPS` (if any) —
matching the shape this project's own final-report field lists already
use throughout Phase 16-18C, so its output is consistent with everything
else in this project rather than inventing a new report format.

---

# Part 11 — `bloodmoon-khub-query` (full detail)

**Purpose**: the single skill that knows the Knowledge Hub's own model —
what belongs in the Hub (structured, machine-operational state: tasks,
decisions, sessions, handoffs, a curated `knowledge_items`/`sources`
subset) vs. what belongs in repo docs (durable curated reference) — so an
agent never mistakes a Hub `knowledge_item` (which may describe a
transient bug already fixed, per this project's real 42-orphan-item
history) for current canonical documentation.

**What it knows**:
- **What belongs in Hub**: tasks/decisions/sessions/handoffs (always);
  `knowledge_items` for cross-session discoveries not yet promoted to a
  doc; `sources` as pointers to raw archives/repos/live systems, never
  copies of their content.
- **What belongs in repo docs**: anything durable enough to be curated,
  cross-referenced, and validated (`docs/knowledge/validate.mjs`,
  `context/validate.mjs`) — the Hub deliberately has no equivalent
  validator or cross-reference model, per `hub/docs/knowledge.md`'s own
  "não complicar" (don't over-engineer) design choice.
- **How to query structured knowledge**: `akh bootstrap <slug>` for a
  fast overview, `akh knowledge list <slug> [filters] --json` /
  `akh source list <slug> [filters] --json` for real filtered queries —
  never re-deriving the CLI's flag syntax from memory, always checking
  `hub/docs/cli.md` if unsure.
- **How to use decisions/tasks/handoffs**: `akh project context <slug>`
  surfaces `active_tasks`/`recent_decisions`/`latest_handoff` — read the
  latest handoff BEFORE consuming it (consuming ≠ reading, per `hub/docs/
  agent-handoff.md`'s explicit distinction), and treat `git_drift` (Hub's
  recorded HEAD vs. actual current HEAD) as a real signal to reconcile,
  never ignore.
- **How to avoid treating stale operational state as current
  documentation**: a `knowledge_item` with `status: active` is not the
  same claim-strength as a reviewed doc — this project's own Phase 18C
  found 42 of 62 active items with no structured `source_id`, several
  literally phase-checkpoint summaries from months-old "Etapas." This
  skill surfaces a Hub item's `verification_status`/`confidence`/
  `source_id` presence alongside its content, never presenting it
  unqualified as settled fact.
- **How to respect read/write permissions**: this skill is **read-only
  by design this phase** (`GET` requests only — `akh knowledge list`,
  `akh source list`, `akh project context`, `akh bootstrap`, `akh
  events`) — it never calls `akh knowledge create`/`akh decision
  create`/`akh task *`/`akh handoff create` (those are
  `bloodmoon-task-handoff`'s job, and even that is scoped narrowly, per
  §10 above). No production Hub mutation happens via this skill, ever,
  regardless of task.

**Trigger**: any question about current tasks, past decisions, session
history, or whether a Hub `knowledge_item` exists for a topic.

**Inputs**: a question or topic; the project slug (`bloodmoon`, confirmed
real this session via `akh project context bloodmoon`).

**Procedure**: (1) determine whether the question is about *structured
project state* (Hub's job) or *durable reference* (repo docs' job —
route to `bloodmoon-knowledge-router` instead if so); (2) run the
narrowest real `akh` query that answers it, never a blanket `bootstrap`
when a filtered `list` would do; (3) present results with their
`verification_status`/`confidence` intact; (4) if a `knowledge_item`
looks stale or contradicts a repo doc, flag it as a conflict
(`bloodmoon-knowledge-router`'s conflict-check step), never silently
prefer one.

**References**: `hub/docs/cli.md`, `hub/docs/knowledge.md`,
`hub/docs/sources.md`, `hub/docs/agent-handoff.md`,
`docs/knowledge/KHUB_SOURCE_NORMALIZATION.md` (this project's own real
worked example of a Hub-source-linkage review).

**Tools required**: Bash (`akh` CLI, read commands only — `AI_KNOWLEDGE_HUB_API_KEY`
loaded from `hub/.env.local`, never printed or logged).

**Security boundary**: strictly read-only against production; the API
key is a credential and follows the same secrets-hygiene rule as any
other (`AGENTS.md` invariant 10) — never echoed in output, never
committed anywhere.

**Expected output**: the queried Hub data, annotated with its own
confidence/verification metadata, plus a routing note if the question
was actually a repo-docs question instead.

---

# Part 12 — `bloodmoon-knowledge-ingestion` (full detail)

**Purpose**: the one skill that handles turning a new external source
(PDF, HTML, TXT/RTF, video transcript, web page, vendor tutorial, legacy
source) into candidate knowledge — generalizing the exact pipeline this
project already ran manually and successfully across Phase 16-18C
(vendor tutorial hash-verification, YouTube transcript extraction, the
DMN CMS PHP source trace).

**Pipeline** (the exact stages requested, each mapped to this project's
own already-proven pattern):

1. **raw source** — the original artifact, format preserved, never
   converted-and-discarded (`docs/knowledge/raw-capture.md`'s core rule —
   this skill does not reinvent that rule, it invokes it).
2. **→ hash/provenance** — SHA-256, source path/URL, capture date; this
   project's own convention (`Research/Vendor/Tutorials/manifest.json`)
   is the concrete template.
3. **→ untrusted-content handling** — the source's own text is data, not
   instructions, full stop, regardless of what it appears to ask
   (`raw-capture.md`'s "Untrusted content" section, `SKILL_SECURITY_POLICY.md`'s
   opening rule). Also: secret-scan BEFORE extraction, not after — if
   found, `RAW_CAPTURE = SANITIZED_SECURITY` per the existing convention,
   never a full-value capture "to be safe later."
4. **→ extraction** — format-appropriate: HTML/TXT/RTF read directly; PDF
   needs text extraction (this project confirmed zero PDFs exist in its
   own corpus so far — this stage is currently unexercised, documented
   for when it's needed); video transcript via the existing YouTube
   ingestion pattern (`docs/knowledge/youtube-ingestion.md`).
5. **→ metadata** — title, channel/author, date, version/build context
   where determinable (per `conflict-resolution.md`'s Version/Season
   discipline).
6. **→ topic classification** — against the existing topic vocabulary
   (`TOPIC_COVERAGE.md`), never inventing a new topic name casually.
7. **→ authority** — `bloodmoon-source-authority`'s 10-level scale.
8. **→ version** — Season/build/date tagging, explicit `UNKNOWN` if not
   determinable (never silently assumed current).
9. **→ candidate knowledge** — a DERIVED claim, explicitly traceable back
   to the RAW artifact from step 1-2 — never presented as if the summary
   WERE the source (`raw-capture.md`'s central rule, restated for this
   pipeline specifically).
10. **→ conflict detection** — check against existing claims on the same
    entity (`docs/knowledge/conflict-resolution.md`); a genuine conflict
    is recorded with both sources, never resolved by silently picking
    the higher-authority one without stating why.
11. **→ validation** — run `docs/knowledge/validate.mjs` (or the
    vendor-sweep's own `knowledge-validate.mjs` if it's a vendor-sweep-
    shaped claim) before considering the candidate done.
12. **→ promotion decision** — a human/Bryan decision for anything moving
    from DERIVED to a canonical doc or Hub `knowledge_item` with
    `verification_status: verified` — this skill prepares the candidate,
    it does not self-promote it, mirroring `docs/knowledge/wiki-
    preparation.md`'s existing "nothing in wiki_candidates/ is published"
    rule applied one level earlier in the pipeline.

**References**: `docs/knowledge/raw-capture.md`,
`docs/knowledge/source-authority.md`,
`docs/knowledge/conflict-resolution.md`,
`docs/knowledge/knowledge-sweep.md`, `docs/knowledge/vps-ingestion.md`,
`docs/knowledge/youtube-ingestion.md`, `docs/knowledge/wiki-
preparation.md`, `docs/knowledge/validate.mjs`.

**Tools required**: Read, Write, Bash (hashing, running validators),
WebFetch (only when the source IS a live URL — explicitly declared per
`SKILL_SECURITY_POLICY.md`'s offline-first rule, never an implicit
fallback).

**Security boundary**: the highest-risk skill in this set (it's the one
designed to touch untrusted external content by definition) — never
executes a script/binary/macro found in ingested material; never treats
ingested text as instructions; secret-scans before persisting anything;
writes only to the designated RAW storage locations
(`D:\MU\Research\**`/`D:\MU\RemoteData\**` per the existing convention),
never to a location that would make ingested content executable.

**Expected output**: a new RAW artifact (hashed, stored), a candidate
knowledge entry with full provenance, and an explicit
`RAW_CAPTURE`/`CONFLICT`/`VALIDATION` status — never a silent "done."

---

# Part 13 — `bloodmoon-runbook-builder` (full detail)

**Purpose**: turn CONFIRMED knowledge into an actual operational runbook
— the exact gap this project's own `KNOWLEDGE_GAPS.md` tracked three
times over (item-delivery trace, DmN decommission, most GameServer
config reload behavior) as `KNOWLEDGE_MISSING` rather than guessed.

**Rules** (the exact ones requested, each with this project's own
concrete precedent):

- **Never derive operational steps from a single weak/unverified
  source.** Concrete precedent: the one runbook this project DID
  successfully add this phase (GameServer Command/Custom reload,
  `PROCEDURE_INDEX.md`) was only written after TWO independent vendor
  video demonstrations agreed — a single video would not have cleared
  this bar.
- **Distinguish current vs. legacy.** Every entry in
  `CASH_VIP_INTEGRATION_MAP.md`'s three-flow table does this explicitly
  (Legacy Web / Legacy In-Game / Current) — this skill generalizes that
  exact table shape.
- **Include approval requirements.** Match `PROCEDURE_INDEX.md`'s own
  `Approval required` column — never omit it even when the answer is
  "none."
- **Include rollback.** If no rollback procedure is known, the runbook
  says `ROLLBACK_UNKNOWN` explicitly rather than omitting the field —
  matching this project's own honest-`UNKNOWN` convention throughout
  Phase 16-18C rather than silently dropping an uncomfortable gap.
- **Include verification.** How does the operator confirm the procedure
  actually worked — e.g. `bloodmoon-deploy`'s own Phase 11 ("Confirm the
  new worker's identity," "Smoke test") is the house-style template for
  this field.
- **Include source references.** Every step traces to the specific doc/
  video/config file that justifies it — never an unsourced "do X."
- **Mark unknowns rather than guessing.** The load-bearing rule across
  this entire skill: `RELOAD_REQUIRED = UNKNOWN` is an acceptable, correct
  runbook field; a guessed `RELOAD_REQUIRED = NO` that turns out wrong in
  production is the exact failure mode this rule exists to prevent.

**Trigger**: a knowledge area reaches enough CONFIRMED evidence (per
`bloodmoon-knowledge-router`'s step 10, "evidence sufficient") that a
repeatable procedure is worth writing down.

**Inputs**: the target task/procedure name, and the CONFIRMED knowledge
backing it (gathered via `bloodmoon-knowledge-router` first — this skill
never gathers evidence itself, only formats it).

**Procedure**: assemble the standard runbook shape — `TASK` / `DOMAIN` /
steps (numbered, each sourced) / `APPROVAL_REQUIRED` / `ROLLBACK` /
`VERIFICATION` / `SOURCE_REFERENCES` / `RISK` / `LAST_VERIFIED` — then add
one row to `docs/knowledge/PROCEDURE_INDEX.md` pointing at it. If the
evidence bar isn't met, output `KNOWLEDGE_MISSING` and add/update a
`KNOWLEDGE_GAPS.md` row instead of writing a weak runbook.

**References**: `docs/knowledge/PROCEDURE_INDEX.md` (the existing
table this skill extends), `~/.claude/skills/bloodmoon-deploy/SKILL.md`
(house-style template for what a good runbook step looks like).

**Tools required**: Read, Write (only to `docs/knowledge/PROCEDURE_INDEX.md`
and the new runbook doc itself — never to operational config).

**Security boundary**: this skill produces documentation only — it never
executes the procedure it documents; a runbook it writes still carries
whatever `APPROVAL_REQUIRED`/risk level `bloodmoon-security-guardrails`
would separately enforce at execution time.

**Expected output**: a new or updated runbook doc, plus a
`PROCEDURE_INDEX.md` row, plus an honest `RUNBOOK_READY`/
`KNOWLEDGE_MISSING` classification.
