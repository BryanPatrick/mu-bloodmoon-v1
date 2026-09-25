---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-25
---

# Governance — how this Context Pack governs itself

## Canonical location (2026-09-25, `ADR-0034`)

`main` of `github.com/BryanPatrick/mu-bloodmoon-v1` is the definitive
canonical source of truth for everything in the precedence list below.
A document that exists only on another branch
(`docs/agent-automation-architecture`, `governance/engineering-pack`,
`preservation/main-snapshot-b5a4321d`, or any feature branch) is a
`HISTORICAL_SOURCE` for current-state purposes until it is promoted to
`main` by a reviewed PR. When `main` and a historical branch disagree,
`main` wins and the disagreement is recorded. See
[`MAIN_INTEGRATION.md`](MAIN_INTEGRATION.md).

## Precedence (this pack sits below everything that already existed)

Extending `docs/architecture/engineering-governance.md`'s own
source-of-truth precedence list (not replacing it):

1. Security/approval gates the agent itself enforces.
2. [`AGENTS.md`](../AGENTS.md) — universal invariants.
3. The canonical document for that specific domain (existing
   `docs/architecture/`, `docs/security/`, `docs/payments/`, etc.).
4. The relevant ADR in [`docs/decisions/`](../docs/decisions/).
5. **This Context Pack** (`context/`) — an index/summary layer over 1-4,
   plus the Knowledge Hub's own structured state where it is
   authoritative (see the file-vs-Hub rule below). Never higher
   precedence than the document it points to.
6. The relevant phase manifest / handoff doc.
7. Temporary notes (chat, scratch reasoning) — lowest precedence.

If anything in `context/` ever disagrees with the document it points to,
the pointed-to document wins, and the disagreement is a bug in this pack
to fix — not a judgment call to make silently.

## File-vs-Hub authority rule

- **Structured, operational, frequently-changing state** (task status,
  claims, approvals, review decisions, event history) is authoritative
  in the Knowledge Hub's own database — never re-derived or cached as
  truth inside `context/`.
- **Human-readable, durable project documentation** (why a decision was
  made, what a domain's architecture is, what a business rule is) is
  authoritative in this repository — `docs/`, `AGENTS.md`, ADRs, and this
  Context Pack's own index files.
- Both sides may reference the other (a `context/domains/*.md` stub may
  name a real Hub task/decision ID; a Hub knowledge item may cite a repo
  doc path), but **neither side auto-syncs into the other**. A future,
  explicitly-designed and explicitly-approved sync job could change
  this — not implemented, not assumed. See
  [`KNOWLEDGE_HUB_MAPPING.md`](KNOWLEDGE_HUB_MAPPING.md).
- **Convergent evidence, Phase 11**: `preservation/openbeta-untracked/docs/knowledge/knowledge-hub-boundary.md`
  (real, dated 2026-08-31, never committed) independently designed
  nearly this exact split before this Context Pack existed — the same
  "repo = current technical truth, Hub = operational/process history"
  rule, with its own conflict-resolution ordering. Two independent
  design passes converging on the same answer is real, if informal,
  corroboration. That document also contains one now-disproven
  technical guess (that the Hub is reachable via
  `mcp__ccd_session_mgmt__*` — Phases 5-10's real work proved the
  actual mechanism is a direct HTTP API + CLI) — not carried forward
  here, and not edited in the preserved copy either (see
  `OPEN_QUESTIONS.md` OQ-CTX-009).

## Source authority levels (Phase 10, Part 24)

A small hierarchy, chosen to fit this project's own already-established
semantics (`docs/architecture/engineering-governance.md`'s precedence
list above, and the Knowledge Hub's own "knowledge sources preserve
provenance but never become operational authority" decision) rather
than adopting the brief's example lettering blindly:

| Level | Meaning | Example |
|---|---|---|
| `EXECUTABLE_FACT` | Verified by actually running something (a query, a test, a real API call) this session or a cited prior one | This phase's `git ls-tree`/`git log --all` searches; the real pilot's event trail |
| `CANONICAL_DECISION` | An active decision in one of the two permanent decision systems | A `docs/decisions/000N-*.md` ADR; a Knowledge Hub `decisions` row |
| `CURRENT_DOC` | An authoritative, current repository document, not itself a decision record | `docs/payments/asaas-sandbox-phase4-claude-handoff.md`; `docs/architecture/engineering-agent-orchestration.md` (a proposal, not a decision — see note below) |
| `ACCEPTED_HANDOFF` | A real, consumed-or-pending handoff record | `docs/handoff/*`, Hub `handoffs` rows |
| `HISTORICAL_SOURCE` | Real but dated — a past decision, a superseded doc, an old chat (once real transcripts exist) | Openbeta's uncommitted originals; a superseded ADR |
| `AI_CANDIDATE` | Something an agent proposed but no human or independent process has validated | The synthetic `codex-staging` review's own content judgment (lifecycle-valid, content not independently reviewed) |

**Note on `CURRENT_DOC` vs. `CANONICAL_DECISION`**: a design/proposal
doc on an unmerged branch (e.g. `docs/architecture/engineering-agent-orchestration.md`,
`bloodmoon-ai-assistant.md`, `notification-intelligence.md`) is real and
current, but it is **not** a decision — nothing in it has been ruled on
by Bryan. This pack always cites such docs as `CURRENT_DOC` (real
evidence of a real proposal) and never upgrades their recommendations
to `CANONICAL_DECISION` status. See the `n8n`/`bloodmoon-ai`/
`notifications` domain stubs for worked examples of this distinction
held consistently.

## Context Pack authority review (Phase 10, Part 7)

Every significant factual statement in `context/` should be traceable
to one of: `VERIFIED_SOURCE` (read/run directly this session or a
specifically-cited prior one), `DERIVED_SUMMARY` (a faithful compression
of a verified source, never adding a claim the source didn't make),
`SOURCE_PENDING` (believed true, no verifiable source yet — used
sparingly and always labeled), or `UNSUPPORTED` (a claim this pack
should not contain at all). Phase 10 re-read every domain stub and
found no `UNSUPPORTED` claims remaining — every hedge Phase 9 already
wrote (game-economy, marketplace, vip, launcher) already carried
explicit "not independently verified" language rather than asserting
fact; Phase 10 added evidence (payments, knowledge-hub, orchestration,
n8n, bloodmoon-ai, notifications) rather than removing any hedge that
wasn't itself now backed by a real source.

## Never duplicate, never compete

Every file under `context/` that touches a domain already covered by
`docs/` must: (a) name the real file(s) it summarizes, by path; (b) keep
its own content short enough that the real doc is still the one worth
reading for depth; (c) get updated or deleted, not left stale, if the
underlying doc it summarizes changes shape. A `context/` file that starts
to grow its own independent narrative instead of pointing outward is a
sign this rule is being violated.

## Security / secret classification

Applies to every document under `context/` and to
`docs/operations/chat-history-ingestion.md`:

| Class | Meaning | Example |
|---|---|---|
| `PUBLIC_PLAYER` | Safe for a player to read (game mechanics, public rules) | Item stats already in `knowledge/` |
| `INTERNAL` | Safe for any project agent/engineer, never for players | This entire Context Pack, `docs/` |
| `RESTRICTED` | Internal, but scoped to specific roles (e.g. financial risk detail) | `docs/payments/`'s risk-signal detail |
| `SECRET_REFERENCE_ONLY` | The *existence* of a secret may be named; its *value* never appears anywhere | "a staging API key exists for `claude-code-real-staging`" — never the raw token |

**Mandatory rule, no exception**: no document in `context/` may ever
contain an actual secret value (API key, password, connection string,
token). A reference to *where* a secret lives (e.g. "staging's key is in
the scratchpad `.tsv`, never committed") is fine; the value itself is
not. See [`VALIDATION.md`](VALIDATION.md) for the scan that checks this
mechanically before this pack is considered done.

## Claude staging credential storage (Phase 10, Part 28)

The real `claude-code-real-staging` API key is currently stored only
in a gitignored scratchpad `.tsv` (outside any repository, under this
session's temp directory) — acceptable for a single pilot, confirmed
never committed (Part 27's secret scan, see
[`SOURCE_INDEX.md`](SOURCE_INDEX.md)). **For continued real-agent use,
that storage does not scale** — a scratchpad is session-scoped and not
designed as a credential store.

**Recommendation**: an environment variable, set outside any repo
(`AI_KNOWLEDGE_HUB_STAGING_API_KEY` in the operator's own shell/OS
environment, or the OS credential store — Windows Credential Manager,
given this environment is Windows), read by whatever script/session
needs it, never written to a file a repo could accidentally pick up.
A dedicated, explicitly-gitignored secrets file (e.g.
`~/.blood-moon/staging-keys.env`, outside every worktree) is an
acceptable middle ground if an environment variable proves awkward for
a given tool, provided its permissions are restricted to the operator
and it is never inside any git working tree (a `.gitignore` entry
inside a repo is a weaker guarantee than the file not existing in a
repo path at all — an `git add -f` or a careless `git add .` can still
add a gitignored file if someone forces it).

**Not done this phase**: rotating the existing key (no compromise
evidence, rotation without cause adds operational churn for no
benefit) or committing the raw key anywhere (never, under any
recommendation).

## Validation

See [`VALIDATION.md`](VALIDATION.md) for the lightweight, non-over-engineered
check this pack runs on itself (duplicate decision IDs, broken doc
references, inconsistent status values, secret patterns).
