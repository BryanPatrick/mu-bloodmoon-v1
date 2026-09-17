---
status: DESIGN — audit and proposal, nothing implemented
category: architecture
audience: internal (Bryan + any engineering agent)
lastVerified: 2026-09-16
confidence: MIXED — B1 audit findings are CONFIRMED (real files/tools checked); everything from B4 onward is a design proposal, not a decision
---

# Engineering agent orchestration — audit and design

**DATE**: 2026-09-16. **SCOPE**: design/audit only — nothing in this
document has been implemented, installed, or activated. No n8n
install, no external infrastructure, no production touch, no automation
running unattended. See `docs/architecture/bloodmoon-ai-assistant.md`
and `docs/architecture/notification-intelligence.md` for the two
adjacent design documents this phase also produced.

## Why this exists

Today's process (illustrated by this very session): Bryan writes a
large, explicit, phased prompt in chat → an agent (Claude or Codex)
works through it, often across many tool calls and several rounds of
back-and-forth → the agent returns a single structured report → Bryan
reviews and decides the next step, sometimes cross-checking with a
second tool (ChatGPT). It works — this session alone closed a real,
multi-day CI/migration-compatibility investigation end to end, with
real evidence at every step — but it's manual: every decomposition,
every safety gate, every report format is redesigned by hand, in the
prompt, each time. This document audits what already exists toward
automating the repeatable parts of that loop, and proposes a path that
does not have to be built from zero.

## B1 — What already exists (audited, not assumed)

Checked directly rather than guessed, per this project's own standing
rule (`AGENTS.md` invariant 22, "no memory-only work"):

- **`AGENTS.md`** (this repo): 24 numbered invariants, the closest
  thing this project has to a machine-followable agent rulebook today.
  Covers branch/worktree discipline, secrets hygiene, evidence-first
  process actions, host storage preflight, and (as of this same
  session) applied-migration immutability. Read by any agent at session
  start, self-referential to `docs/`.
- **`docs/protocols/agent-bootstrap.md`**: a 15-step mandatory sequence
  before any non-trivial engineering action (read `docs/README.md`,
  identify domain, check ADRs/open-risks/open-questions, only then
  act). This is, in effect, a hand-written **planner prompt template**
  — exactly the kind of thing a `PLANNER` role (B6) would encode
  structurally instead of restating in every session.
- **`docs/decisions/`**: a real ADR log (CONTEXTO/DECISÃO/POR QUÊ/
  ALTERNATIVAS/CONSEQUÊNCIAS format), 17+ entries as of Phase M
  (2026-08-31), including entries that honestly document a gap instead
  of inventing a decision. This is a working `Decision` artifact type
  already, just filed as markdown, not as structured/queryable records.
- **`docs/sessions/`**: a formal session-record template
  (`TEMPLATE.md`) with fields close to a machine-readable report
  contract already (`SESSION_ID`/`TASK`/`DOCS_CONSULTED`/`WORK_DONE`/
  `TESTS`/`HANDOFF`) — a real precedent for B9's `AGENT_REPORT_SCHEMA_V1`,
  used for non-trivial sessions, not every edit.
- **`docs/handoff/`**: real handoff docs per feature/decision (e.g.
  `site-beta-checklist.md`, `community-current-state.md`), each
  recording what state a piece of work was left in and what's still
  open — the closest existing artifact to a `Handoff` record.
- **`docs/open-risks.md` / `docs/open-questions.md`**: intended as
  centralized indexes (per `docs/README.md`'s own description); as of
  this exact worktree/branch, `docs/open-risks.md` does not currently
  exist (`test -f` confirmed missing this session) — a real, small gap,
  not a design problem to solve, just a fact to record.
- **The Knowledge Hub**: confirmed, via
  `docs/knowledge/knowledge-hub-boundary.md` (found in the
  `mu-bloodmoon-v1-openbeta` worktree — not present in this exact
  worktree, another real cross-worktree drift fact worth its own
  follow-up), to be a **real, separate, already-deployed** system: its
  own Cloudflare Worker (`ai-knowledge-hub`) and D1 database
  (`ai-knowledge-hub-db`), its own repository, its own protocols
  (including a destructive-actions protocol), spanning more than one
  project. It is explicitly **not** the same thing as this repo's
  `docs/knowledge/` folder (an unrelated, same-named in-game Wiki
  ingestion pipeline — a real naming collision, already flagged in that
  doc). See B2.
- **`mcp__ccd_session_mgmt__*` tools**: real, available in this exact
  session. That boundary doc hypothesized these might be the Knowledge
  Hub's own access surface — **checked directly this session, not
  assumed**: `list_sessions` is real and returned "No other sessions
  found" for this account/window. This is Claude Code Desktop's own
  local multi-session management (list/get/archive sessions, read
  another session's transcript, cross-session messaging) — a genuinely
  useful primitive for B10/B11 (conflict detection, task claiming), but
  it is **not** the `ai-knowledge-hub` Cloudflare Worker/D1 system;
  that remains unreached from this session. The boundary doc's own
  hypothesis about reachability does not hold as stated — worth a
  correction there, not treated as fact here.
- **Multi-agent reality, already observed, not hypothetical**: this
  exact session found real evidence of a concurrent second agent
  ("Codex") working the same project — a branch it created
  (`docs/incident-2026-09-15-lsapi-closeout`), a file it edited mid-session
  (`docs/operations/host-storage-preflight.md`), and — directly
  relevant to Part A of this same request — `bloodmoon_local` is
  explicitly documented (`docs/operations/local-test-database-isolation.md`)
  as Codex's own dedicated local database, separate from
  `bloodmoon_local_claude`. Two real, independent, differently-named
  agents are already operating on this codebase without a shared
  orchestration layer — exactly the gap Part B is scoping.

`EXISTING_ORCHESTRATION_FOUNDATION`: substantial and real, but entirely
document-based and human-mediated today — no queue, no task state
machine, no automatic assignment, no automatic review, no machine-
readable report format actually enforced (the session-record template
exists but isn't required for every task, as its own file says).
Nothing here needs to be built from zero; it needs a state machine and
a report contract wrapped around it.

## B2 — Knowledge Hub fit

`KNOWLEDGE_HUB_AS_CORE = PARTIAL_FIT`.

Good fit for: `Session`, `Decision` (as an event/pointer, not full
reasoning), `Handoff`, `Event`/`Artifact` in the audit-trail sense — it
is *designed* to answer "what happened, when, who did it, what's still
open," which is most of what an orchestration layer's bookkeeping needs
(B12's event model maps directly onto this).

Not designed for: `Task` as a live work-queue with claim/lease/retry
semantics, worker assignment, or dependency graphs — its own boundary
doc frames it as a *process history*, not a *live scheduler*. Using it
as the literal queue backend would likely mean either extending a
system explicitly scoped as "operational continuity, not orchestration
engine," or building a thin queue layer that *writes into* the
Knowledge Hub as its audit trail rather than *being* the Knowledge Hub.

Recommended framing: Knowledge Hub = the durable record orchestration
writes to (Decision, Handoff, Event, Session), not the orchestration
engine itself. See Option A/B in B4.

## B3 — n8n evaluation (not installed, evaluation only)

n8n is a visual workflow-automation tool: trigger nodes (webhook,
schedule, manual), a large library of integration nodes, branching/
merging, retries, and a self-hostable runtime.

**What it's genuinely good at**, relevant to this project's needs:
scheduling (a nightly "check bloodmoon_local drift" job is a perfect
n8n use case), webhook-driven fan-out/fan-in, notification routing to
multiple channels (email/Discord/etc. — directly relevant to
`docs/architecture/notification-intelligence.md`), and gluing together
external APIs without writing bespoke integration code for each one.

**What it's poorly suited for**, also relevant here: it is not an
agent-reasoning engine — a node either calls an API/script or runs
simple logic, it does not itself do the kind of multi-step, evidence-
gathering, judgment-calling work this whole session has been doing
(e.g., deciding a migration is semantically safe by reading its SQL,
or root-causing an npm error from a log). It handles short synchronous
steps well; this project's real tasks (a CI investigation, a production
audit) run for many minutes to hours with dozens of tool calls — n8n
workflows are not the natural home for that reasoning, only for
triggering it and handling its outcome. Task locking/concurrency,
fine-grained secret management, and per-step auditability exist but are
generic, not tailored to "did agent X actually touch production" the
way this project's own AGENTS.md invariants are. Self-hosting adds real
ops burden (its own database, backups, availability, patching) for a
team of one.

`N8N_ROLE_RECOMMENDATION = INTEGRATION_LAYER` (specifically:
scheduler + notification/webhook fan-out), not `ORCHESTRATOR_CORE`. The
actual task decomposition, agent assignment, and review logic belongs
in something that understands *this project's* task/report/approval
shape — n8n is the plumbing around that, not the brain.

## B4 — Architecture options

**Option A — Knowledge Hub core + n8n integration layer.**
Knowledge Hub stores Task/Decision/Handoff/Event as its native records;
n8n handles scheduling, external webhooks, and notification fan-out
triggered by Knowledge Hub events.
*Complexity*: medium (two systems to keep in sync). *Scalability*:
good — Knowledge Hub already spans projects. *Observability*: good, if
events are written consistently. *Agent autonomy*: depends entirely on
whether the Knowledge Hub exposes a task-claim API — unconfirmed this
session (out of scope: a different repo). *Security*: inherits
Knowledge Hub's own protocols (already has a destructive-actions
protocol). *Cost*: n8n hosting only; Knowledge Hub is already paid for.
*Recoverability*: as good as Knowledge Hub's own. *Vendor lock-in*:
low for the core (it's already Bryan's own system), medium for n8n.
*Fit for Blood Moon*: good. *Fit for other company apps*: good — this
is literally what the Knowledge Hub is already for (cross-project).

**Option B — Knowledge Hub core + custom worker/orchestrator.**
Same core, but a small custom service (not n8n) does task
decomposition/assignment/claim-lease, calling out to Claude Code/Codex
sessions directly (e.g. via `mcp__ccd_session_mgmt__*`-style APIs or a
CLI).
*Complexity*: higher upfront (custom code to write and maintain).
*Scalability*: good, purpose-built. *Observability*: as good as you
build it. *Agent autonomy*: highest — full control over claim/lease/
retry semantics tailored to how Claude/Codex sessions actually behave.
*Security*: fully your own responsibility, but no third-party workflow
engine in the loop with production-adjacent triggers. *Cost*: only
compute for the small service; no n8n license/hosting. *Recoverability*:
depends entirely on your own implementation quality. *Vendor lock-in*:
lowest. *Fit for Blood Moon*: good. *Fit for other company apps*: good,
same reasoning as Option A — the worker is generic if built that way.

**Option C — n8n-centric architecture, agents external.**
n8n owns the workflow/state machine; agent sessions are just another
node type it triggers and waits on.
*Complexity*: lower to start (n8n's visual builder). *Scalability*:
weaker for this project's actual task shape — long-running,
judgment-heavy agent work doesn't fit n8n's node execution model well
(see B3). *Observability*: good for what n8n tracks, poor for *why* an
agent made a call inside its own reasoning. *Agent autonomy*: lowest —
agents become subordinate to a workflow engine not designed for their
kind of work. *Security*: n8n becomes the thing holding
task/credential state, a bigger blast radius if compromised or
misconfigured. *Cost*: n8n hosting, likely more workflow complexity
over time as edge cases accumulate. *Recoverability*: tied to n8n's own
uptime/backup discipline. *Vendor lock-in*: highest — the actual task
graph lives inside n8n's proprietary workflow format. *Fit for Blood
Moon*: poor — this project's real work (this session is the proof) is
agent-reasoning-heavy, not integration-heavy. *Fit for other company
apps*: depends entirely on whether those apps are more integration-
shaped than Blood Moon is.

`RECOMMENDED_ARCHITECTURE = Option A` (Knowledge Hub core + n8n
integration layer), with the explicit caveat that this recommendation
assumes the Knowledge Hub actually exposes (or can be extended to
expose) a task-claim/lease API — unconfirmed this session, since it's a
separate repository out of this audit's reach. If that assumption
proves false, Option B is the fallback, not Option C.

## B5 — Parallel task model

Worked example, using this project's own real language (VIP/payments/
monitoring, not abstract placeholders):

```
OBJECTIVE: Prepare Open Beta
├─ Task A: Payments hardening           (no deps)
├─ Task B: Monitoring/alerting          (no deps)
├─ Task C: Regression test sweep        (depends on: A, B)
├─ Task D: Launcher readiness           (no deps)
├─ Task E: Security review              (depends on: A, D)
├─ Task F: Docs/manual updates          (depends on: A, B, D)
└─ Release review                       (depends on: C, E, F)
```
A and B and D can start immediately, in parallel. C waits on both A and
B finishing (not just starting). Release review is a synthetic
"aggregation" task with no work of its own — it exists purely to
represent "all inputs are in, ready for Bryan's go/no-go."

`TASK_STATUS_MODEL`:
```
BACKLOG    -- decomposed, not yet ready (dependencies unmet)
READY      -- dependencies satisfied, unclaimed
CLAIMED    -- an agent has leased it (see B11)
IN_PROGRESS -- actively being worked, heartbeats expected
BLOCKED    -- agent hit something needing a decision or another task
REVIEW     -- implementer done, awaiting reviewer(s)
APPROVED   -- review passed, ready to count toward dependents
DONE       -- fully closed, downstream tasks may now go BACKLOG->READY
FAILED     -- could not complete; needs Bryan or replanning
```
This is a state machine that could live as a Knowledge Hub `Task`
record type (per B2) with these exact status values, and dependency
edges as a small adjacency list per task.

## B6 — Agent roles

Conceptual roles, not necessarily distinct models — a single Claude
session can play more than one role across a task's lifecycle, exactly
as this session did (planner, implementer, and its own first-pass
reviewer, all in one continuous conversation):

- **PLANNER** — turns a Bryan objective into a task graph (B5). Can
  write task descriptions and dependencies. Cannot touch code or
  production.
- **IMPLEMENTER** — claims a READY task, writes code/config/docs,
  produces the report (B9). Can touch code, cannot deploy or write
  production without a separate approval gate (B7).
- **REVIEWER** — reads an implementer's diff/report, validates it
  against the task's own acceptance criteria, does not write code
  (an "ultrareview"-style independent read is exactly this role,
  already used in this project's own tooling).
- **SECURITY_REVIEWER** — a narrower reviewer specifically checking
  for secrets, permission scope, and this project's own security
  invariants (AGENTS.md rules 10-14); required whenever a task touches
  auth, payments, or credentials.
- **TESTER** — runs/writes the actual verification (unit/e2e/CI), not
  the same as REVIEWER (a reviewer can read a diff and still miss a
  behavior only a real test run catches — this session's own migration
  investigation is a direct example: static reasoning alone would have
  missed several of the real bugs actually found).
- **RELEASE_REVIEWER** — the role that looks at the *whole* aggregated
  picture across every task in an objective, not one task in isolation
  — the human-facing gate before B7's approval matrix kicks in.
- **REPORT_AGGREGATOR** — see B13; consumes many task reports and
  produces one executive brief.

Who can write code: PLANNER (task descriptions only, not application
code), IMPLEMENTER. Who can touch production: nobody, by default — see
B7, every production action is a named exception. Who only reviews:
REVIEWER, SECURITY_REVIEWER, RELEASE_REVIEWER. Who can request
approval: any role, by raising a `DECISION_REQUIRED` event (B12) — only
Bryan can grant it.

## B7 — Human approval gates

`APPROVAL_MATRIX` — always requires Bryan, regardless of task status:

| Action | Always requires Bryan |
|---|---|
| Production deploy | YES |
| Production database write | YES |
| Secret/credential rotation | YES |
| Payments enablement/config change | YES |
| GameBridge activation or write-path change | YES |
| Any destructive action (drop, delete, force-push, reset) | YES |
| Economic rule change (prices, currency rates, drop rates) | YES |
| Public release / public-facing content publish | YES |
| Any externally-consequential message (email, DM, public post) | YES |
| Merging a branch into `main` | YES (this project's own standing rule — no auto-merge) |
| Migration history edit (post-application) | YES (AGENTS.md invariant 24, this same session) |

Everything else — reading code, running local tests, drafting a design
doc, writing to a disposable/local database, opening a PR without
merging it — can proceed without a synchronous approval gate, subject
to REVIEWER sign-off. This matches how this entire multi-day session
has actually operated: dozens of read/investigate/propose actions
without individual sign-off, and a hard stop at every single item in
the table above, every time, no matter how many times a similar action
was approved earlier in the same conversation (already this project's
own explicit invariant 21).

## B8 — Automatic review flow

```
IMPLEMENTER completes task, submits report (B9) + diff
        ↓
REVIEWER reads diff + report, checks against task's own
acceptance criteria (not a vague "looks fine")
        ↓
   touches auth/payments/secrets? ──yes──> SECURITY_REVIEWER
        │no                                        │
        ↓                                          ↓
   TESTER runs/confirms real verification (not just review-by-reading)
        ↓
   any reviewer found a real problem? ──yes──> task -> BLOCKED,
        │no                                    reviewer writes exactly
        ↓                                       what's wrong + why
   REPORT_AGGREGATOR (B13) folds this task's
   result into the running executive brief
```
A `BLOCKED` task never silently retries itself — it raises
`DECISION_REQUIRED` (B12) and Bryan sees exactly the reviewer's
finding plus the implementer's original report, not a vague "something
went wrong." This mirrors exactly how this session's own JSON-CAST
investigation surfaced a real disagreement (production succeeding where
a fresh CI probe failed) as a named, evidence-backed question rather
than guessing past it.

## B9 — Report contract

The core problem this solves: every report so far in this project's
history has been a differently-shaped wall of text, readable by a human
but not diffable/queryable by another agent or a dashboard. Proposal:

```
AGENT_REPORT_SCHEMA_V1 (JSON, with a Markdown rendering for humans)
{
  "task_id": "string",
  "objective": "string (one sentence)",
  "status": "DONE | BLOCKED | FAILED | PARTIAL",
  "branch": "string | null",
  "commits": ["sha, sha, ..."],
  "changes": [{"path": "string", "kind": "add|modify|delete"}],
  "tests": [{"name": "string", "result": "PASS|FAIL|SKIPPED", "evidence": "string"}],
  "risks": ["string, ..."],
  "production_touched": "NO | READ_ONLY | YES",
  "decisions_needed": ["string, ..."],
  "blockers": ["string, ..."],
  "next_step": "string",
  "evidence": ["string (log excerpt, run URL, file:line), ..."]
}
```
This is not a hypothetical shape — it's a direct generalization of the
exact field lists Bryan has been hand-writing into every phased prompt
this whole session (`BRANCH=`, `FINAL_COMMIT=`, `BLOCKERS=`,
`NEXT_SAFE_ACTION=`, etc.). The schema formalizes a pattern that
already works in practice; it doesn't invent a new one. Markdown
rendering is a template over the same JSON, so a human reads prose
while a REPORT_AGGREGATOR reads structure.

## B10 — Conflict detection

Three checkpoints, not one:

- **Before starting** (ownership/dependency check): does this task's
  target file/branch/migration/database overlap a task already
  `CLAIMED`/`IN_PROGRESS`? This project already has a real, painful
  precedent for skipping this check — the 2026-08-24 `bloodmoon_local`
  reset incident (`docs/operations/local-test-database-isolation.md`),
  where a destructive action ran against a database a concurrent Codex
  session depended on, discovered only afterward. A pre-start ownership
  check would have caught this before it happened, not after.
- **During work** (heartbeat/status): a task emits a periodic
  `TASK_CHECKPOINT` event (B12); if a second agent tries to claim an
  overlapping resource, it sees the live claim, not a stale task list.
- **Before integration** (conflict review): base-commit staleness (did
  `main` move since this branch's base?), schema conflicts (two
  branches both adding a migration with the same timestamp prefix),
  and config conflicts (two branches both touching the same env var
  contract) are checked explicitly before any merge — exactly the
  fast-forward-only discipline already used to close out this same
  session's CI/migration work (`git merge-base --is-ancestor` checked
  before every merge, never assumed).

## B11 — Task claim / lease model

```
agent claims a READY task  -> status: CLAIMED, lease_expires_at = now + N min
agent sends heartbeat       -> lease_expires_at extended
lease expires, no heartbeat -> task reverts to READY automatically,
                                claim is not honored by anything else
                                (an agent that comes back late must
                                re-claim, not assume its old claim
                                still holds)
```
N should be generous for this project's real task shape (this session's
own single investigations ran for hours across many tool calls) —
minutes-scale leases with heartbeats, not seconds-scale, and a lease
renewal is cheap (a single event write), so erring toward a longer
lease with real heartbeats is safer than a short lease that expires
mid-legitimate-work. Maps directly onto a Knowledge Hub `Task` record's
own `claimed_by`/`lease_expires_at` fields (B2), no new subsystem
needed beyond those two columns and a periodic sweep.

## Cross-reference

B12 (event model), B13 (report aggregator), B21 (worked example),
B22 (security), B23 (observability), B24 (recovery), B25 (MVP), B26
(roadmap), B27 (repository placement), B28 (n8n deployment options),
B29 (cost model), and B30 (documentation) continue below.

## B12 — Event model

```
TASK_CREATED        TASK_CLAIMED       TASK_STARTED
TASK_CHECKPOINT      TASK_BLOCKED       TASK_COMPLETED
REVIEW_REQUESTED     REVIEW_APPROVED    REVIEW_REJECTED
DECISION_REQUIRED    DECISION_RECORDED
DEPLOY_REQUESTED     DEPLOY_APPROVED    DEPLOY_COMPLETED
```
Each event: `{event_type, task_id, agent_id, timestamp, payload}`.
Maps directly onto the Knowledge Hub's own `Event` concept (B2) — this
project doesn't need a new event store, it needs this specific vocabulary
written consistently into the one that already exists. `DECISION_REQUIRED`
is the single most important event type: it's the *only* thing that
should ever interrupt Bryan outside a scheduled check-in, matching the
executive-brief philosophy in B13.

## B13 — Report aggregator design

```
reads every task report (B9) since the last brief
        ↓
de-duplicates (two tasks reporting the same underlying finding,
e.g. two agents both flagging the same flaky test)
        ↓
detects conflicts (two reports disagreeing about the same fact —
directly modeled on this session's own real MariaDB-version
contradiction, which had to be resolved with a fresh empirical test,
not by picking a report and trusting it)
        ↓
classifies risk per report's own `risks`/`production_touched` fields
        ↓
produces EXECUTIVE_BRIEF:
  WHAT FINISHED       (status: DONE tasks, one line each)
  WHAT IS RUNNING      (IN_PROGRESS, with elapsed time)
  WHAT FAILED           (FAILED tasks, with the blocking reason)
  WHAT NEEDS YOUR DECISION (every open DECISION_REQUIRED, with the
                             evidence needed to decide, not just "please
                             decide")
  RISKS                 (rolled up from every report's risks field)
  NEXT AUTOMATIC ACTIONS (what will happen without further input)
```
This is the one artifact Bryan should actually read day to day — every
other report exists to feed this one, not to be read individually
unless something in it needs drilling into.

## B14 — Notification router design

See `docs/architecture/notification-intelligence.md` for the full
design (separated deliberately, per B30, since it's a distinct
subsystem with its own event/channel/preference model, not an
orchestration concern). Summary: `EVENT` (e.g. `MarketplaceItemSold`)
is decoupled from `CHANNEL` (app/email/WhatsApp/Discord) — the event
fires once, a per-user preference table decides which channels receive
it, and the notification-intelligence document covers dedup/cooldown/
priority/quiet-hours rules on top of that split.

## B21 — Worked example: "Quero integrar um novo payment provider"

Bryan states the objective in chat. What today happens manually (a big
written prompt, one agent, sequential phases) would, under this design,
decompose as:

```
Bryan: "Quero integrar um novo payment provider"
        ↓
DECISION CAPTURE (event: DECISION_RECORDED)
  -- Bryan's own constraints captured verbatim: which provider, which
     currencies, sandbox-only for now, no production credentials yet
        ↓
TASKS GENERATED (PLANNER role)
  Task A: Architecture — how does this provider's webhook/API model
          map onto the existing PaymentRiskCase/ChargebackCase schema
          (both real tables, added this same session's Part A pending
          migrations)? No code yet -- a design doc + open questions.
  Task B: Implementation — the actual client/webhook handler, gated on
          Task A's approval.
  Task C: DB review — does this introduce new tables/columns, and does
          it collide with any in-flight migration? (Directly the kind
          of conflict B10 exists to catch.)
  Task D: Security review — webhook signature verification, secret
          storage, least-privilege DB user for the new provider.
  Task E: Tests — sandbox-only integration tests, no real transactions.
  Task F: Sandbox verifier — an agent that actually exercises the
          sandbox flow end-to-end and reports real evidence, the same
          discipline this session used for the MariaDB/MySQL probes
          (never trust untested logic, always run it for real
          somewhere safe first).
        ↓
DEPENDENCIES: B depends on A's approval. C and D can run parallel to B
once A is approved. E depends on B. F depends on B, C, D, E all DONE.
        ↓
AGGREGATOR consolidates every task's report
        ↓
Bryan receives exactly one decision point:
  "Sandbox integration complete and verified (Task F evidence attached).
   Security review: PASS, no findings (Task D report attached).
   DECISION NEEDED: authorize production credential entry + go-live —
   this is a standing approval gate (B7), never automatic."
```
Everything up to that last line happens without interrupting Bryan;
only the one genuinely consequential decision (per the B7 matrix)
reaches him, with the evidence already assembled, not a raw pile of six
separate reports he has to reconcile himself.

## B22 — Security (threat model)

- **Prompt injection**: an agent reading a task description, a report,
  or an artifact must treat all of it as data, not instruction — this
  is already this session's own standing rule for tool output and
  should extend identically to inter-agent messages/reports. A
  malicious or corrupted report claiming `"status": "DONE"` must not be
  trusted without the REVIEWER independently checking evidence.
- **Malicious/corrupted artifact**: any file another agent produced is
  read, not executed, until a REVIEWER has looked at it — this project
  already refuses to run downloaded/untrusted files; the same applies
  to another agent's output.
- **Secret leakage**: task reports must never carry raw secret values
  (this project's own established discipline all session — e.g.
  reporting `CI_EPHEMERAL_DUMMY` classifications without reprinting
  values). A report schema (B9) with no free-text field wide enough to
  accidentally carry a credential is safer than one that does.
- **Agent over-permission**: role separation (B6) plus the approval
  matrix (B7) is the primary control — an IMPLEMENTER role should not
  itself hold production credentials; only a narrowly-scoped
  deploy-execution path (approved per-action, never standing) should.
- **Supply-chain**: any new dependency an agent proposes (e.g. an n8n
  node, an npm package) goes through the same review path as code,
  never auto-installed by an unattended task.
- **Cross-project data leak**: since the Knowledge Hub spans projects
  (B1/B2), a Blood-Moon-scoped task must not be able to read another
  project's records by default — this needs its own access-scoping
  design in the Knowledge Hub's own repo, out of this document's reach.
- **Wrong production action**: the approval matrix (B7) plus
  evidence-first process-signaling (AGENTS.md invariant 12, already
  proven this session for LSAPI reload procedures) is the control.
- **Stale task execution / replay**: the lease model (B11) plus a
  base-commit-staleness check (B10) prevents an agent from acting on
  a task whose premise (e.g. "main is at commit X") is already false.
- **Webhook spoofing** (relevant once n8n integration exists, B3):
  verify signatures on every inbound webhook, never trust source IP
  alone — standard practice, worth stating explicitly since this
  project has real precedent for skipping a similar check once
  (payment webhook handling is exactly the kind of surface this
  matters for).

## B23 — Observability

Minimum viable dashboard, once any of this exists: task duration
(claim → done), agent failure rate, retry count, time spent `BLOCKED`
(a proxy for how often Bryan is the bottleneck vs. the system), review
rejection rate (a proxy for implementer quality/task clarity), token
usage per task if available (cost visibility), deploy success rate,
and incident rate post-deploy. None of this needs new infrastructure
beyond consistent event emission (B12) — a dashboard is a query over
that event stream, not a separate system to build first.

## B24 — Recovery

Every mechanism above needs to degrade safely, not silently:

- **Agent crashes mid-task**: lease expires (B11), task returns to
  `READY` automatically — no manual intervention needed for the common
  case.
- **Workflow interrupted** (n8n or equivalent down): tasks already
  `CLAIMED`/`IN_PROGRESS` are unaffected (agents don't depend on n8n
  being up to keep working); only new triggers/notifications pause
  until it's back.
- **Knowledge Hub unavailable**: an agent should be able to keep
  working locally (git commits still happen) and write its report/
  events once the Hub is reachable again — never block real work on a
  bookkeeping system being briefly down.
- **Duplicate task delivery**: task IDs are unique and idempotent —
  claiming an already-`DONE` task is a no-op, not a re-execution.
- **Lost heartbeat**: same as agent crash — lease-based recovery, no
  special case needed.
- **Partial report**: a report missing required fields (B9) is treated
  as `PARTIAL`, not silently accepted as `DONE` — matches this
  project's own existing discipline (a task missing a doc update is
  reported `PARTIAL`, never `PASS` anyway, per `AGENTS.md`'s
  documentation-discipline section).
- **Conflicting completion** (two agents both claim they finished the
  same task differently): goes to REVIEWER as a `BLOCKED` conflict, not
  auto-resolved by "last write wins."

## B25 — MVP proposal

`AUTOMATION_MVP_PHASE_1` — deliberately small:

```
Bryan states an objective
        ↓
PLANNER (a Claude session, no new tooling) decomposes it into a
written task list with explicit dependencies -- literally a markdown
file following B5's shape, committed to docs/
        ↓
Bryan assigns each task to Claude / Codex / himself (manual for now --
no auto-assignment yet)
        ↓
each agent's report follows AGENT_REPORT_SCHEMA_V1 (B9) instead of
free-form prose -- the single highest-leverage change, since it's what
makes every later automation step (aggregation, review, dashboards)
possible at all
        ↓
a REVIEWER pass (a second agent, or ultrareview-style independent
review) reads each report before Bryan does
        ↓
one consolidated brief (B13's shape, written by hand this phase, not
yet automated) is what Bryan actually reads
```
No WhatsApp, no game AI, no automatic production action, no n8n, no new
infrastructure. The entire MVP is: a task-list template, a report
schema, and a habit of always producing both — genuinely buildable
this week, and it's the precondition for every later phase.

## B26 — Roadmap

```
PHASE 1  Developer task orchestration          (this MVP, B25)
PHASE 2  Report aggregation/review automation   (B8, B13 made real)
PHASE 3  Notifications/internal integrations    (n8n as integration
                                                  layer, B3/B14)
PHASE 4  Blood Moon support AI                  (B15-B18)
PHASE 5  Player personalization                 (assistant memory, B18)
PHASE 6  Marketplace intelligence               (notification rules,
                                                  B20)
PHASE 7  Game telemetry AI                       (B19 phases 2-3)
PHASE 8  Cross-product platform                  (the orchestration
                                                  layer itself becomes
                                                  reusable beyond Blood
                                                  Moon, per B1's own
                                                  finding that the
                                                  Knowledge Hub already
                                                  spans projects)
```

## B27 — Repository/project placement

Recommendation: **split, deliberately** — not everything in one repo.

- The orchestration state machine and task/report schema (B5, B9, B12)
  belong **inside the Knowledge Hub's own repo**, since it's already
  the cross-project system (B1/B2) and this is exactly its stated
  purpose (operational continuity, not Blood-Moon-specific).
- Blood-Moon-specific things — the notification event catalog (B14/B20)
  tied to `MarketplaceItemSold` etc., and the AI assistant's Blood-Moon
  knowledge sources (B17) — belong **inside this repo**
  (`docs/architecture/`, as this phase already did), since they're
  meaningless outside this product.
- A thin n8n workflow layer, if adopted (B3/B4), is its own small
  config repo or folder — workflows are mostly declarative JSON, not
  worth mixing into either codebase's normal review flow.

Not recommended: building this fresh inside `mu-bloodmoon-v1` — it
would duplicate what the Knowledge Hub already is (B2's whole point),
and would need re-building per-project instead of being reusable, which
directly contradicts the stated goal ("base reaproveitável para outros
projetos").

## B28 — n8n deployment options (design only, nothing installed)

- **Self-host, Docker/VPS**: full control, lowest recurring cost,
  highest ops burden (you own patching, backups, uptime). Reasonable
  if n8n ends up doing little more than scheduled checks + webhook
  fan-out (Option A's scope) rather than anything production-critical.
- **n8n Cloud (managed)**: near-zero ops burden, recurring cost,
  fastest to start. Reasonable for validating the integration-layer
  idea (B3) cheaply before committing to self-hosting.
- **Cloudflare-oriented alternative**: since this project already runs
  real infrastructure on Cloudflare (Workers/D1 for the Knowledge Hub
  and the Game Data Platform, per B1/B2 and this project's own prior
  work), a Cloudflare Worker-based scheduler/webhook-router covering
  just the scheduling and notification-fan-out slice of n8n's job is
  worth comparing directly against n8n before committing — it would
  avoid introducing a whole new hosting surface for a role that might
  only need cron + fan-out, not n8n's full visual-workflow feature set.

Whichever is chosen: secrets belong in that platform's own secret
store, never in a workflow definition file; the workflow's own state/
DB needs the same backup discipline this project already applies to
its own databases (`deploy/CPANEL_BACKUP_AUTOMATION.md` as the existing
pattern to mirror, not reinvent).

## B29 — Cost model (conceptual, not researched pricing)

```
n8n (self-host)         LOW    -- compute only, no license fee
n8n (cloud, managed)    LOW-MEDIUM -- depends on workflow/execution volume,
                                       not researched this round
LLM usage (agent tasks) MEDIUM -- already the dominant real cost today,
                                   this orchestration layer doesn't add
                                   new LLM calls, it organizes existing
                                   ones
Storage (Knowledge Hub D1) LOW -- already provisioned, incremental cost
                                   of more rows is negligible
Queue/scheduling         LOW    -- cron-shaped, not high-throughput
Notifications (email)    LOW    -- typical transactional-email pricing
WhatsApp provider        MEDIUM-HIGH -- per-message cost models exist
                                        industry-wide, genuinely not
                                        researched this round -- do not
                                        treat this as a real estimate
```
No real prices are quoted here on purpose — the user's own instruction
was explicit not to invent a number without researching it, and this
phase's scope excludes contracting any service to find out.

## B30 — Documentation created this phase

- `docs/architecture/engineering-agent-orchestration.md` (this file)
- `docs/architecture/bloodmoon-ai-assistant.md`
- `docs/architecture/notification-intelligence.md`

No production documentation was touched; this is new, additive design
material only.
