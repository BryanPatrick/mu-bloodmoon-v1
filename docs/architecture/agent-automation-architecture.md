---
status: ACTIVE — direction documented, implementation not authorized
category: architecture
audience: internal (Bryan + any engineering agent)
lastVerified: 2026-09-18
confidence: MIXED — architecture direction is a real Bryan decision (see ADR-0032); most underlying
  capabilities are PROVEN only at staging, not production; n8n and unattended execution remain design-only
---

# Agent automation architecture — canonical entry point

**This is the single entry point for Blood Moon's automation ecosystem.**
It consolidates, and does not replace, three real documents that
already existed before it — none of them are deleted, edited to look
like they never existed, or silently overridden. Where this document
and one of them disagree, that is a bug in this document to fix, not a
judgment call to make silently (same rule `context/GOVERNANCE.md`
already established for the Context Pack, extended here).

**Consolidates:**
- `docs/architecture/engineering-agent-orchestration.md`,
  `bloodmoon-ai-assistant.md`, `notification-intelligence.md` — branch
  `architecture/agent-orchestration-foundation`, commit `7b8c2799`, now
  pushed to `origin` (preserved, not merged to `main`).
- `docs/skills/N8N_CLAUDE_SKILL_ARCHITECTURE.md`, `BLOODMOON_CUSTOM_SKILLS.md`,
  `SKILL_REGISTRY.md`, `SKILL_ECOSYSTEM_RESEARCH.md`, `SKILL_CANDIDATES.md`,
  `SKILL_SECURITY_POLICY.md` — branch `research/agent-skills-ecosystem`,
  commit `88701591`, now pushed to `origin` (preserved, not merged to
  `main`; note: everything this branch built *before* its final commit —
  the whole Context Pack under `context/` — is already on `main`).
- The Knowledge Hub's own real documentation — separate repository
  `D:\MU\hub` (`github.com/BryanPatrick/Knowledge-Hub`), branch
  `orchestration/mvp-phase-1`, now also pushed to its own origin.

**Historical documents are not superseded by this one** — they remain
the fuller, original design material. This document is a map and a
current-status layer over them, per `context/GOVERNANCE.md`'s existing
"never duplicate, never compete" rule, applied here the same way it
already applies to `context/domains/*.md`.

---

## 1. Status legend (used throughout this document)

| Label | Meaning |
|---|---|
| `PRODUCTION` | Real, deployed, currently reachable by production traffic/agents |
| `STAGING` | Real, deployed, proven end-to-end — but on a separate, non-production environment |
| `DESIGN_ONLY` | Written down, not built, not installed, not running anywhere |
| `PROPOSED_NOT_RATIFIED` | A recommendation on the table; no Bryan decision recorded |
| `DOCUMENTED_DECISION` | A real Bryan decision exists (see ADR references) |

Never describe a `STAGING` capability as if it were `PRODUCTION` — this
distinction is load-bearing throughout this document, per Bryan's own
explicit instruction for this phase.

---

## 2. Bryan's current decisions (dated, real, recorded)

Both decisions below are recorded formally as ADRs — see
`docs/decisions/0031-initial-multi-agent-automation-model.md` and
`docs/decisions/0032-agent-automation-architecture-direction.md`. This
section states them plainly; the ADRs carry the full reasoning.

### 2.1 Initial multi-agent model — `DOCUMENTED_DECISION` (2026-09-18)

**`INITIAL_MULTI_AGENT_MODEL` = Claude + one internal specialist agent.**

- **Claude** — primary engineering/reasoning agent, as today.
- **Internal specialist agent** — a new role, grounded in this
  project's own persisted documentation (see §4). Not a second general-
  purpose coding agent; a specialist whose job is to know this system
  deeply and support Claude's work, not to replace it. See §5 for its
  full intended role.
- **OpenAI/Codex automation role: DEFERRED.** Reason: cost. This is a
  **cost decision, not a technical or trust judgment** — nothing in any
  document read across this project's own investigation phases
  (`AGENT-AUTOMATION-RECOVERY-01`, `AGENT-AUTOMATION-RECONCILE-01`)
  found a technical reason Codex couldn't participate; the Hub's own
  schema and actor model already treat `openai-codex` as a first-class
  agent row today.

**This does not prevent manual Codex use in the current development
workflow.** Distinguish clearly:
- **Manual Codex use** — a human (Bryan) or another session runs Codex
  directly, as already happens in this project's real history (e.g.
  Codex's own worktree `infra/cloudflare-api-container-poc`, real
  commits on `docs/incident-2026-09-15-lsapi-closeout`). Continues
  unchanged, unaffected by this decision.
- **Automated multi-agent ecosystem participation** — Codex holding a
  capability-granted Hub actor identity, claiming tasks, or being
  triggered by an orchestration layer without a human driving that
  specific session. This is what's deferred, not manual use.

### 2.2 Architecture direction — `DOCUMENTED_DECISION` (direction only) (2026-09-18)

**Option A is accepted as the direction to document**, not as an
implementation authorization:

```
Knowledge Hub  →  record of truth / durable coordination core
n8n            →  future integration / scheduling / notification layer
Claude + internal specialist agent  →  initial execution/reasoning layer
```

Explicitly, separately, and just as firmly decided:

- `N8N_ADOPTION` — **NOT authorized.**
- `N8N_INSTALLATION` — **NOT authorized.**
- `N8N_HOSTING` — **NOT decided.**

Architecture direction and implementation authorization are two
different kinds of decision, and this project's own governance already
distinguishes them (`context/GOVERNANCE.md`'s `CURRENT_DOC` vs.
`CANONICAL_DECISION` split). This section is the first time the
*direction* itself has crossed into `DOCUMENTED_DECISION` territory —
the underlying n8n implementation questions have not.

---

## 3. `DOCUMENTATION_IS_AGENT_INFRASTRUCTURE` — formal principle

**Recorded as a standing architectural principle, effective 2026-09-18.**

Project documentation is not secondary prose describing a system that
exists independently of it. For the internal specialist agent (§5), the
documentation **is** the execution infrastructure — it is the only
mechanism by which that agent can reliably know the system at all.
Consequently:

**Information must not exist only in:**
- chat memory
- agent memory (any single session's own context)
- terminal history
- temporary/ad-hoc reports
- local-only, unpushed git branches

**Every meaningful outcome must be persisted appropriately**, in the
correct one of the categories in §4 below — not duplicated across all
of them, and not left in only the most convenient one.

**Implications:**
- A finding that only exists in this conversation's own transcript does
  not yet exist for the specialist agent's purposes. This is the same
  standing rule this project already enforces for human-facing work
  (`AGENTS.md` invariant 22, "No memory-only work") — this principle
  extends it explicitly to agent-facing infrastructure, not just
  human-facing correctness.
- A local-only branch (exactly the condition `AGENT-AUTOMATION-
  RECONCILE-01` found and this phase's own preservation pushes just
  closed) is a live risk to this principle, not merely a git-hygiene
  nicety — if the machine holding it is lost, the specialist agent
  loses access to real, otherwise-undocumented decisions.
- This principle does not require *more* documentation for its own
  sake — `context/GOVERNANCE.md`'s "never duplicate, never compete"
  rule and the canonical-source-plus-references pattern (§8) remain in
  full force. The requirement is persistence and discoverability, not
  volume.

---

## 4. What must be persistently documented (canonical categories)

| Category | Canonical location |
|---|---|
| Architecture | `docs/architecture/*.md` |
| Decisions / ADRs | `docs/decisions/000N-*.md` |
| Current state | `context/CURRENT_STATE.md`, `context/domains/*.md` |
| Protocols | `docs/protocols/*.md` |
| Security rules | `AGENTS.md`, `docs/security/*.md`, Hub's own `SECURITY.md`/`docs/protocols/` |
| Code / project standards | `AGENTS.md` (invariants), this document §10 for gaps |
| Infrastructure | `context/INFRASTRUCTURE.md`, Hub's own `docs/operations/*.md` |
| Database | `docs/database/*.md`, Hub's `docs/database.md` |
| Deployment | `deploy/*.md`, `~/.claude/skills/bloodmoon-deploy/` |
| External services | `docs/architecture/*.md` (per-provider), `docs/payments/*.md` |
| Known risks | `docs/open-risks.md`, `context/OPEN_QUESTIONS.md` |
| Known blockers | Hub `tasks`/`handoffs` (operational), `docs/handoff/*.md` (durable) |
| Test evidence | `docs/test-evidence-index.md`, per-feature phase manifests |
| Incidents / lessons learned | `docs/decisions/*.md` (when they changed a rule), `docs/architecture/branch-and-release-governance.md` |
| Superseded information | `context/SUPERSEDED_DECISIONS.md`, `~~strikethrough~~` in place per `AGENTS.md`'s "never silently overwrite history" rule |
| Agent handoffs | `docs/handoff/*.md` (durable), Hub `handoffs` table (operational) |
| Skills | `docs/skills/*.md` (design), `~/.claude/skills/` (installed) |
| Automation | this document, plus §2's ADRs |
| Source authority | `docs/knowledge/source-authority.md` |

**Canonical source + references, never duplication** — this document
itself follows that rule throughout: every claim below points at the
real doc/branch/commit that proves it, rather than restating full
content that already lives there.

---

## 5. The internal specialist agent — intended role

**Not built this phase.** This section defines intent only, per Bryan's
explicit instruction.

### 5.1 Core purpose

A specialist agent, distinct from Claude's general engineering role,
whose job is to:

1. Deeply understand the target system (Blood Moon, and later other
   systems built on the same ecosystem — see §9).
2. Retrieve canonical project knowledge on demand.
3. Understand architecture, as documented in `docs/architecture/`.
4. Understand operational rules — `AGENTS.md`, `docs/protocols/`,
   security policy.
5. Understand project history — `docs/decisions/`, `docs/handoff/`,
   Hub `sessions`/`events`.
6. Understand decisions **and** superseded decisions —
   `context/SUPERSEDED_DECISIONS.md`, ADR `SUPERSEDED` status, never
   presenting an overturned decision as current.
7. Understand current state and known gaps —
   `context/CURRENT_STATE.md`, `docs/open-risks.md`,
   `docs/open-questions.md`.
8. Help Claude plan work — surfacing relevant prior decisions,
   architecture constraints, and known gaps before a plan is finalized,
   not after.
9. Challenge assumptions against persisted evidence — the same role
   this project's own `bloodmoon-knowledge-router` skill design (§6.3)
   already specifies at the tool level ("EVIDENCE_SUFFICIENT: Y/N",
   never smoothed over).
10. Preserve continuity between sessions — the same problem the
    Knowledge Hub's own handoff/session model already solves
    structurally (§7); the specialist agent is a *consumer* of that
    continuity mechanism, not a replacement for it.
11. Support future systems using the same agent ecosystem architecture
    — see §9's generic/specific split.

### 5.2 Explicit boundary

**The specialist agent is NOT an unrestricted autonomous executor.**
Its permissions are governed by the same project security/capability
rules as any other agent — the Hub's actor + capability model (§7.4),
`AGENTS.md`'s approval invariants, and the B7/B22 approval matrix and
threat model already designed in `engineering-agent-orchestration.md`.
Nothing about "specialist" implies elevated trust; if anything, a
knowledge-retrieval-focused role has less inherent need for
consequential capabilities than an implementer role does, and should be
granted correspondingly less by default (least-privilege, same
principle the Hub's actor bootstrap plan already applies).

### 5.3 Relationship to designed skills

`bloodmoon-knowledge-router`, `bloodmoon-context-bootstrap`,
`bloodmoon-source-authority`, and `bloodmoon-khub-query` (all
`DESIGNED`, not built — see §6) are the most directly relevant existing
designs to this role; see §6.4 for why.

---

## 6. Skills — current status

### 6.1 Installed (`INSTALLED`/`PINNED`, real, canonical source `~/.claude/skills/`)

| Skill | Risk | Purpose |
|---|---|---|
| `bloodmoon-deploy` | LOW | cPanel/File Manager production deploy procedure |
| `frontend-design` | LOW | Anthropic official — non-templated frontend UI design process |

### 6.2 Designed, not built (`DESIGNED`, branch `research/agent-skills-ecosystem`, now preserved on origin)

Full specs in `docs/skills/BLOODMOON_CUSTOM_SKILLS.md` (that branch) —
not duplicated here:

`bloodmoon-knowledge-router`, `bloodmoon-context-bootstrap`,
`bloodmoon-source-authority`, `bloodmoon-runbook-builder`,
`bloodmoon-khub-query`, `bloodmoon-knowledge-ingestion`,
`bloodmoon-vendor-source-review`, `bloodmoon-gameserver-knowledge`,
`bloodmoon-security-guardrails`, `bloodmoon-task-handoff`.

**Not built in this phase.**

### 6.3 MCP — current reality vs. proposed design

- **Current reality**: no Blood-Moon-controlled MCP server exists
  anywhere. Confirmed across both investigation phases.
- **Proposed design** (`DESIGN_ONLY`,
  `docs/skills/N8N_CLAUDE_SKILL_ARCHITECTURE.md`): a future,
  Blood-Moon-owned, SEP-2640-shaped MCP server serving `bloodmoon-*`
  skills as `skill://` resources, reachable by Claude Code, a future
  n8n workflow (via its MCP Client Tool node), and Codex alike. Not
  built. Not approved to build in this phase.

### 6.4 Most relevant to the internal specialist agent (evidence-based)

Of the 10 designed skills, four map directly onto §5's role
definition, based on their own written purpose (not a new judgment —
each purpose statement already says this):

- **`bloodmoon-knowledge-router`** — "the default knowledge-lookup
  skill for engineering agents," a 10-step routing procedure through
  Context Pack → Knowledge Master Index → Procedure Index → source →
  deep material. Directly implements §5.1 items 2-3, 6-7, 9.
- **`bloodmoon-context-bootstrap`** — packages the 15-step bootstrap
  protocol into one invocable procedure. Directly implements §5.1 item
  1 and the "preserve continuity" framing in item 10.
- **`bloodmoon-khub-query`** — the one skill that knows the Hub-vs-
  repo-docs boundary and queries the Hub read-only. Directly implements
  §5.1 items 5, 10.
- **`bloodmoon-source-authority`** — applies the existing 10-level
  source-authority scale. Directly implements §5.1 item 9 (challenging
  assumptions requires knowing how trustworthy a source actually is).

None of these four (or the other six) are built this phase. This is an
evidence-based relevance mapping for a future implementation phase to
start from, not a build authorization.

---

## 7. Proven capabilities (Knowledge Hub) — environment-labeled

All of the below is real, working code and schema in
`D:\MU\hub` (separate repository, `orchestration/mvp-phase-1`, now
preserved on origin). Labels per §1's legend.

| Capability | Environment | Evidence |
|---|---|---|
| Projects, agents, sessions, decisions, handoffs, artifacts, events, knowledge_items, sources | `PRODUCTION` | Live since early Etapas; real rows created through the API, not inserted directly |
| Task claim/lease | `STAGING` | Real D1 concurrency proof (Phase 7): correctly serializes under genuine simultaneous requests |
| Resource ownership (exclusive/shared locks) | `STAGING` | Real partial-unique-index enforcement, proven under concurrency |
| Approval gates | `STAGING` | Real approve/reject race found+fixed (Phase 7), re-verified |
| Reviews (independent reviewer requirement) | `STAGING` | Proven end-to-end, Phase 8 smoke tests |
| Agent reports (`Agent report contract v1`) | `STAGING` (schema) / usable anywhere (`akh report validate` is local-only, no network) | `docs/report-contract.md`, Hub repo |
| Concurrency guarantees | `STAGING` | 4 real race bugs found and fixed against genuine simultaneous real-D1 writes (Phase 7), not simulated |
| Kill switch (`ORCHESTRATION_ENABLED`) | `STAGING` (implemented; not deployed to production) | Write-path-only, checked before auth runs; currently `false` on staging per idle policy |
| Risk/capability controls (actor capabilities, risk-flag policy matrix) | `STAGING` (schema deployed; zero grants exist in production) | Phase 6, "implemented and enforced" |

**Production migrations 0008-0010 (the tables leases/approvals/reviews/
reports need) have NOT been applied to production D1.** Confirmed via
a real read-only query: production remains at migration 0007. This
document does **not** authorize applying them — see §11.

---

## 8. n8n — future candidate integration layer only

`DESIGN_ONLY`. Not installed, not configured, not authorized to install
in this phase.

**Expected future responsibilities:**
- Scheduling (e.g. a nightly drift-check job)
- External triggers / webhook integration
- Notifications (fan-out across app/email/WhatsApp/Discord, per
  `notification-intelligence.md`'s event/channel split)
- Human workflow integration (approval nodes)

**Explicitly NOT, per existing design evidence — quoted, not
inferred:**
- Source of truth — `hub/docs/boundary-contracts.md`: "This Hub owns
  truth; n8n never does."
- Canonical task database — same document: n8n triggers and reports
  back; every outbound event becomes a Hub `events` row, "n8n is not a
  second source of truth alongside it."
- Approval authority — same document: "n8n never: decides a production
  approval, changes a task's recorded status/truth, resolves an agent
  conflict, or stores canonical project history."
- Canonical project history — same citation as above.
- Agent-state authority — same citation as above.
- Primary reasoning engine — `engineering-agent-orchestration.md` §B3:
  "it is not an agent-reasoning engine... the actual task decomposition,
  agent assignment, and review logic belongs in something that
  understands this project's own task/report/approval shape."

---

## 9. Generic agent ecosystem vs. Blood Moon-specific knowledge

Kept structurally separate so the ecosystem is reusable for future
systems (per Bryan's own explicit direction this phase), without
hard-coding Blood Moon knowledge into generic components.

### 9.1 Generic (reusable across future projects)

- Knowledge Hub (API, D1 schema, CLI) — already project-agnostic by
  design (`hub/docs/architecture.md`'s own "Design principles": "must
  not assume Claude Code or Codex specifically... key knowledge by
  project so unrelated projects... never collide")
- Task lifecycle, leases, resource claims
- Reports (`Agent report contract v1`), reviews, approvals
- Events model
- n8n integration contracts (`hub/docs/boundary-contracts.md` — written
  "deliberately generic... a consuming project's own event catalog...
  references this shape, never duplicates it")
- Agent identity model (actor + capability rows)
- Security/capability model (least-privilege capability grants)
- Artifact lifecycle (upload → quarantine → validate)
- The specialist-agent role concept itself (§5) — the *pattern* of a
  documentation-grounded specialist is generic; its actual grounding
  content is not

### 9.2 Blood Moon-specific (stays in this repository)

- This document and its consolidated architecture docs
- `context/domains/*.md` and the wider Context Pack
- Business rules, game/server knowledge (`docs/knowledge/`,
  `docs/gameserver/`)
- Payment rules (`docs/payments/`)
- Deployment procedures (`~/.claude/skills/bloodmoon-deploy/`,
  `deploy/`)
- All 10 designed `bloodmoon-*` skills (Blood-Moon-named, Blood-Moon-
  scoped by design)
- The notification event catalog once built (`MarketplaceItemSold`
  etc. — `notification-intelligence.md` already frames these as
  "a consuming project's own event catalog," never part of the Hub's
  own generic contract)

---

## 10. Standards gaps (identified, not implemented this phase)

Carried forward from `AGENT-AUTOMATION-RECONCILE-01`'s own findings,
not re-derived:

| Gap | Priority | Why |
|---|---|---|
| Definition of Done / Ready as a named standard | MEDIUM | The Hub's completion gate is a de facto DoD for Hub-tracked work only; nothing equivalent exists for work outside it |
| Formal testing baseline (lint/format/coverage minimums) | LOW | No real incident behind this gap yet, unlike the others |
| Agent conflict / resource-ownership rule for real concurrent work | HIGH | The one gap with a real, already-happened incident behind it (2026-08-24 `bloodmoon_local` reset) |
| Idempotency/retry rule for future unattended jobs | LOW | Nothing unattended exists yet to violate it, but cheaper to state before the first one ships |
| Configuration / feature-flag policy | LOW | `ORCHESTRATION_ENABLED` is a good working precedent; writing up the pattern is cheap insurance |

**Not implemented this phase**, per explicit instruction.

---

## 11. What this document does NOT authorize

Consistent with `AGENT-AUTOMATION-PRESERVE-01`'s explicit scope:

- n8n installation, configuration, or adoption
- Any Cloudflare resource creation
- Applying Hub migrations 0008-0010 to production
- Creating production Hub agent capabilities
- Starting unattended Claude execution
- Running a real multi-agent pilot
- Building any of the designed skills or the proposed MCP server
- Merging this branch, or any of the three preserved branches, into
  any `main`

---

## 12. Future readiness checklist (input to a future implementation phase)

Not started this phase. Listed as a checklist, not a plan, per Bryan's
explicit "this will become input to the future implementation phase"
framing:

- [ ] Knowledge source — which of §4's canonical locations the
      specialist agent reads from, and in what order (§13)
- [ ] Bootstrap process — how the specialist agent starts a session
      (candidate: `bloodmoon-context-bootstrap`, once built)
- [ ] Identity — a real Hub actor row, distinct from `claude-code`
- [ ] Permissions — capability grants, least-privilege, per §5.2
- [ ] Knowledge Hub integration — which endpoints/CLI commands it's
      allowed to call (read-only candidates: `bloodmoon-khub-query`)
- [ ] Skills — which of the 10 designed skills it actually needs (§6.4
      names the 4 most relevant)
- [ ] Context retrieval — scoped reading per `AGENT_OPERATING_MODEL.md`'s
      existing context-budget tiers, not a full-tree read every time
- [ ] Source authority — reuse `docs/knowledge/source-authority.md`'s
      existing scale, never a second one
- [ ] Security rules — inherits `AGENTS.md` + Hub `SECURITY.md` in full,
      no separate rule set
- [ ] Prompt-injection protection — treat any retrieved content
      (including another agent's report) as data, never instruction,
      per `engineering-agent-orchestration.md` §B22 and the Hub's own
      `docs/protocols/untrusted-content.md`
- [ ] Artifact handling — reuse the Hub's existing upload/quarantine/
      validate pipeline, never a new one
- [ ] Handoff model — reuse the Hub's existing `handoffs` table and
      `docs/handoff/*.md`, never a new one
- [ ] Testing — how the specialist agent's own answers get verified
      before being trusted (open question, no design yet)
- [ ] Evaluation — how "is this specialist agent actually helping" gets
      measured (open question, no design yet)
- [ ] Failure behavior — what happens when it can't answer (candidate:
      `bloodmoon-knowledge-router`'s existing `EVIDENCE_SUFFICIENT: N`
      / `GAPS` output shape)
- [ ] Human approval boundaries — inherits §5.2 in full; no new
      approval surface invented

---

## 13. Knowledge lookup order (reuses existing governance — not a new hierarchy)

This is `context/GOVERNANCE.md`'s existing precedence, restated here as
a lookup sequence for bootstrap purposes only — not a second, competing
authority model:

```
1. bootstrap            (docs/protocols/agent-bootstrap.md, 15 steps)
2. governance            (AGENTS.md; context/GOVERNANCE.md for
                          Context-Pack-specific precedence)
3. current-state docs     (context/CURRENT_STATE.md,
                           context/domains/*.md)
4. canonical domain doc    (docs/architecture/, docs/security/,
                            docs/payments/, etc. — this document is
                            one of these, for the automation domain)
5. ADR                      (docs/decisions/000N-*.md)
6. Context Pack               (context/ — an index layer over 1-5,
                                never higher precedence than what it
                                points to)
7. Knowledge Hub                (operational state — tasks, sessions,
                                  decisions, handoffs, events; separate
                                  repository, D:\MU\hub)
8. historical evidence            (only if 1-7 don't resolve the
                                    question — superseded docs, old
                                    handoffs, raw archives)
```

Step 7's placement (Hub after Context Pack, before raw history) matches
`context/GOVERNANCE.md`'s existing file-vs-Hub authority rule: the Hub
is authoritative for *operational* state, never for architecture or
business-rule truth, which stays in the numbered steps above it.

---

## 14. References (not duplicated, only pointed at)

- `docs/architecture/engineering-agent-orchestration.md` — full B1-B30
  design (branch `architecture/agent-orchestration-foundation`)
- `docs/architecture/bloodmoon-ai-assistant.md`,
  `notification-intelligence.md` — same branch
- `docs/skills/*.md` — branch `research/agent-skills-ecosystem`
- `hub/docs/boundary-contracts.md`, `hub/docs/report-contract.md`,
  `hub/docs/protocols/orchestration-primitives.md`,
  `hub/docs/policies/orchestration-risk-policy.md`,
  `hub/docs/operations/orchestration-*.md` — separate repository
- `context/AGENT_OPERATING_MODEL.md`, `context/GOVERNANCE.md`,
  `context/domains/{n8n,orchestration,notifications,bloodmoon-ai,
  knowledge-hub}.md` — this repository, `main`
- `docs/decisions/0031-*.md`, `0032-*.md` — this phase's new ADRs
- `AGENTS.md`, `docs/protocols/agent-bootstrap.md` — standing governance
