---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-17
---

# Agent operating model

## Roles (conceptual, not a permanent staffing law — see `ARCHITECTURE.md`)

- **Knowledge Hub** — durable operational truth, governance, and audit
  for cross-agent orchestration (task/resource/approval/review/event
  lifecycle). Not a documentation store for human-readable project
  knowledge — that's this repo.
- **Claude** — currently the main active engineering agent on both this
  repository and the Knowledge Hub itself.
- **Codex** — a future/secondary agent. A synthetic `codex-staging`
  actor already exists on Knowledge Hub staging; no real Codex session
  has run a pilot yet (see [`DEFERRED.md`](DEFERRED.md)).
- **n8n** — future orchestration/automation layer. Not installed
  anywhere. See [`domains/n8n.md`](domains/n8n.md).
- **Bryan** — human authority. Holds `APPROVAL_GRANT`/`RESOURCE_RECOVERY`
  on staging; `SYSTEM_ADMIN` deferred to a dedicated `admin-staging`
  fixture rather than upgrading Bryan's own actor (Phase 7/8 decision).

## Bootstrap bridge (does not replace `docs/protocols/agent-bootstrap.md`)

The existing 15-step protocol predates the Knowledge Hub. For any task
that involves real multi-agent orchestration (claiming a task, a
resource, requesting review/approval), insert one step between the
existing steps 5 ("read the last handoff") and 6 ("check repo/branch
state"):

**5a. Check the Knowledge Hub for this task's real orchestration state**
(if it's tracked there) — is it already claimed, does it have
`risk_flags` implying a required review/approval, is there an existing
report. This is additive: every one of the original 15 steps still
applies unchanged.

## Task-scoped context retrieval

Do not load this entire Context Pack, `docs/`, and Knowledge Hub history
for every task. Scope by what the task's domain actually touches — the
same principle `docs/protocols/agent-bootstrap.md`'s own "Scoped
reading" section already establishes for `docs/`, extended here to also
cover `context/` and the Hub:

- **A payments task** (e.g. an Asaas/Mercado Pago question): read
  `context/domains/payments.md`, the real `docs/payments/` folder it
  points to, and — only if the task is itself orchestration-tracked —
  the specific Hub task/decision IDs named in that domain stub. Skip
  `context/domains/launcher.md` entirely.
- **A wiki/knowledge-content task**: read `knowledge/README.md` (the
  root-level game-content library) and `docs/knowledge/` — this is a
  different axis from `context/`'s own project-knowledge taxonomy, see
  [`KNOWLEDGE_HUB_MAPPING.md`](KNOWLEDGE_HUB_MAPPING.md).
- **An n8n-shaped task**: today, this should not exist — n8n has no
  implementation. If one is ever proposed, read
  [`domains/n8n.md`](domains/n8n.md) first; it names exactly what would
  need deciding before any code is written.

## Context budget model

| Tier | When to read | Examples |
|---|---|---|
| `CORE` | Always, every task | `AGENTS.md`, `docs/protocols/agent-bootstrap.md`, `context/CURRENT_STATE.md` |
| `DOMAIN` | When the task touches that domain | `context/domains/<domain>.md` + the real docs it points to |
| `DEEP` | Only when the task requires it | Full ADR text, full Hub event history for a specific task, full schema docs |
| `HISTORY` | Only for ambiguity/dispute | `docs/README.md`'s full phase log, git history, superseded ADRs |

## Raw history vs. canonical context

See [`RAW_HISTORY_AND_INGESTION.md`](RAW_HISTORY_AND_INGESTION.md) — raw
history (chat exports, old handoffs, superseded docs) is an immutable
archive, never treated as direct canonical truth; canonical context
(this pack, current ADRs, current `docs/`) is the curated current
account, and is what gets read by default.
