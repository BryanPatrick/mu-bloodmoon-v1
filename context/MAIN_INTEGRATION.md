---
status: ACTIVE
category: context-pack
audience: internal (bootstrap-time read)
lastVerified: 2026-09-25
---

# Main integration — what "main" means in this pack, and what is on it

Added in `BLOODMOON-AI-06` (2026-09-25), when this Context Pack reached
GitHub `main` for the first time. Read this before trusting any
"on `main`" / "not on `main`" statement elsewhere in `context/`.

## The canonical source (ADR-0034)

`main` of `github.com/BryanPatrick/mu-bloodmoon-v1` (`origin/main`) is
the definitive canonical source of truth — Bryan's decision, 2026-09-25,
recorded in
[`../docs/decisions/0034-main-is-the-canonical-source-of-truth.md`](../docs/decisions/0034-main-is-the-canonical-source-of-truth.md).

| Ref | Role now |
|---|---|
| `origin/main` | **Canonical.** Current truth lives here. |
| `docs/agent-automation-architecture` | Historical/preserved source. This pack was maintained there until `BLOODMOON-AI-06`. |
| `governance/engineering-pack` | Historical/preserved source (former home of `AGENTS.md`/bootstrap protocol). |
| `preservation/main-snapshot-b5a4321d` | Historical/preserved copy of the former local `main` on the `D:\MU` workstation. |
| Other feature/infra branches | Their own work in progress; not canonical until merged to `main`. |

## Terminology warning: two different "main"s

Files in this pack written before 2026-09-25 (lastVerified 2026-09-17
or earlier) use "`main`" to mean the **local `main` on the `D:\MU`
workstation** — 91, later 110 commits ahead of `origin/main`, never
pushed, now preserved as `preservation/main-snapshot-b5a4321d`. That
is where, for example, "9 ADRs tracked on `main`" (0019, 0021,
0023-0026, 0028-0030) and `docs/README.md` live.

On GitHub `origin/main` today:

- `docs/decisions/` holds only ADR-0031, 0032, 0033 and 0034. The 9
  ADRs this pack calls "tracked on `main`" (0019, 0021, 0023-0026,
  0028-0030) are on `preservation/main-snapshot-b5a4321d` and
  `docs/agent-automation-architecture`; the other 21 (0001-0018, 0020,
  0022, 0027) exist only in the `context/preservation/` archive on
  `docs/agent-automation-architecture`.
- `docs/README.md` is **not** on `origin/main`.
- `context/preservation/` (the Phase 11 byte-exact archive of 125
  untracked Open Beta documentation files) was **deliberately not
  brought** to `origin/main` in `BLOODMOON-AI-06` (Open Beta content,
  out of that PR's scope). Read it from
  `docs/agent-automation-architecture:context/preservation/`.

The older text is left as written (history is not silently
overwritten); read it through this translation.

## Brought to `main` by `BLOODMOON-AI-06`

- `AGENTS.md`, `CLAUDE.md`
- `context/` (everything except `context/preservation/`), plus this file
- `docs/protocols/agent-bootstrap.md`
- `docs/knowledge/` indexes: `KNOWLEDGE_MASTER_INDEX.md`, `CONFLICTS.md`,
  `KNOWLEDGE_GAPS.md`, `PROCEDURE_INDEX.md`, `SOURCE_REGISTRY.md`,
  `TOPIC_COVERAGE.md`, `EXTERNAL_SOURCES.md`, `VIDEO_SOURCES.md`,
  `VPS_DOCUMENTATION_INDEX.md`, `LEGACY_SUPPLIER_INDEX.md`,
  `KHUB_SOURCE_NORMALIZATION.md`, `CURRENCY_TERMINOLOGY.md`,
  `GAMEBRIDGE_DISAMBIGUATION.md`, `GAME_CURRENCY_DELIVERY_ANALYSIS.md`,
  `CASH_VIP_INTEGRATION_MAP.md`, `validate.mjs`
- `knowledge/vendor-sweep/*.json` updated to the Phase 18D machine layer
  those indexes cross-check
- `docs/architecture/repository-continuity-audit-2026-09-18.md`,
  `engineering-governance.md`, `branch-and-release-governance.md`
- `docs/operations/context-pack-independent-review.md`,
  `docs/operations/chat-history-ingestion.md`
- `docs/decisions/0034-main-is-the-canonical-source-of-truth.md`

## Still not on `main` (read from historical branches, label `HISTORICAL_SOURCE`)

`docs/README.md`, ADR-0001..0030, `docs/gamebridge/`, `docs/payments/`,
`docs/deployments/`, `docs/phases/`, `docs/economy/`, `docs/progression/`,
`docs/drop/`, `docs/vip/`, most of `docs/operations/`,
`docs/architecture/control-plane.md`, `context/preservation/`, and the
Open Beta application/migration work. The knowledge router's domain map
(`.claude/skills/bloodmoon-knowledge-router/SKILL.md`) lists the
location of each domain.
