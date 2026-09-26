---
status: ACTIVE
category: decisions
audience: internal (Bryan + any engineering agent)
lastVerified: 2026-09-25
confidence: CONFIRMED (direct Bryan instruction in the project thread, 2026-09-25)
---

# ADR-0034: `main` is the definitive canonical source of truth

**DATE**: 2026-09-25.

**STATUS**: ACTIVE.

## Context

Until now, governance and knowledge content lived in several places at
once, and each document said something different about which one was
canonical:

- `AGENTS.md` (2026-09-08) said it lived "canonically" on the dedicated
  `governance/engineering-pack` branch.
- The Context Pack (`context/`, 2026-09-17) described a local `main` on
  the `D:\MU` workstation, 91 then 110 commits ahead of `origin/main`,
  never pushed. That local `main` is now preserved on `origin` as
  `preservation/main-snapshot-b5a4321d`
  (`docs/architecture/repository-continuity-audit-2026-09-18.md`).
- The Blood Moon AI work (ADR-0031..0033, the specialist, the Context
  Pack updates) was built on `docs/agent-automation-architecture`, which
  diverged from `origin/main` by 122 commits.
- `origin/main` itself had none of `AGENTS.md`, `CLAUDE.md`, `context/`
  or `docs/protocols/` until `BLOODMOON-AI-06`.

`BLOODMOON-AI-05C` proved the specialist works on `main` and that its
remaining `UNKNOWN` answers came from this split, not from the agent.
The question "which branch is canonical for governance?" was put to
Bryan.

## Decision

Bryan, 2026-09-25: **`main` (the GitHub `origin/main` of
`BryanPatrick/mu-bloodmoon-v1`) becomes the definitive canonical
destination and source of truth.**

- `docs/agent-automation-architecture` and `governance/engineering-pack`
  are **historical/preserved sources**. They are read to recover content
  that has not reached `main` yet. They are not places where current
  truth keeps living.
- The same applies to `preservation/main-snapshot-b5a4321d` (the former
  local `main`) and to any other preserved branch.
- Content moves to `main` through reviewed, selective pull requests
  (as in PR #1 and `BLOODMOON-AI-06`), never through a blind merge of a
  divergent branch.

## Consequences

- When a document on `main` and a document on a historical branch
  disagree, `main` wins, and the disagreement is recorded rather than
  silently resolved.
- Content read from a historical branch is `HISTORICAL_SOURCE` until it
  is promoted to `main` (see `docs/knowledge/source-authority.md` and
  `context/GOVERNANCE.md`).
- Documents that still say "not merged into `main`", or that name
  another branch as canonical, are stale. They are annotated in place
  (strikethrough plus correction), never silently rewritten.
- New governance, context and knowledge work lands on `main` via a
  branch and PR (`AGENTS.md` invariant 6 still applies: no direct
  development on `main`).
- The history on the preserved branches is kept. This decision deletes
  nothing.

## Related

`ADR-0031`, `ADR-0032`, `ADR-0033`, `AGENTS.md`, `context/GOVERNANCE.md`,
`context/CURRENT_STATE.md`,
`docs/architecture/repository-continuity-audit-2026-09-18.md`,
`.claude/skills/bloodmoon-knowledge-router/SKILL.md` (domain map).
