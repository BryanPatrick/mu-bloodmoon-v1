---
status: STRUCTURE_DEFINED — content mapped to existing docs, not rewritten
category: knowledge
audience: internal (engineering + product)
lastVerified: 2026-08-31
confidence: CONFIRMED for what exists today; HYPOTHESIS for chapters marked NOT_YET_WRITTEN
---

# The "Blood Moon Book" — long-term documentation structure

A structure for organizing everything this project already documents (and
will document) into one coherent long-term reference, without rewriting
existing content. Each chapter below **maps to real, existing docs**
where they exist, and is marked `NOT_YET_WRITTEN` where they don't. This
is an index/map, not new content.

## Chapters

| Chapter | Maps to | Status |
|---|---|---|
| **Technical Reference** | `docs/knowledge/module-map.md`, `docs/game-data/schema/`, `docs/gameserver/database/` | EXISTS |
| **System Architecture** | `docs/game-data/architecture.md`, `docs/gamebridge/gamebridge-agent-extension-plan.md`, `docs/README.md`'s per-system status table | PARTIAL (per-system, no single unified architecture doc — `docs/README.md` itself already tracks this gap honestly) |
| **Engineering History** | `docs/decisions/` (ADRs), `docs/sessions/`, phase-report-shaped docs scattered across domain folders (e.g. `docs/vip/wz-setaccountlevel-coexistence.md`'s own Phase L history section) | PARTIAL — real content exists but not consolidated under one heading |
| **Operations Manual** | `docs/manuals/technical/manual-operacao-tecnica.md`, `docs/environment/`, `docs/handoff/` | EXISTS |
| **Player Manual** | `docs/manuals/player/` (referenced from `docs/README.md`'s "Manuais e referência" section) | EXISTS |
| **GM Manual** | No dedicated `docs/manuals/gm/` folder exists (verified 2026-08-31 — only `admin/`, `player/`, `super-admin/`, `technical/` are real). GM-relevant content, if any, is referenced within `docs/manuals/admin/manual-adm.md` | NOT_YET_WRITTEN as a standalone manual |
| **ADM Manual** | `docs/manuals/admin/` | EXISTS |
| **Super ADM Manual** | `docs/manuals/super-admin/manual-super-admin.md` | EXISTS |
| **Technical Operator Manual** | `docs/manuals/technical/manual-operacao-tecnica.md` (same as Operations Manual — one real document serves both roles today) | EXISTS |
| **Training Material** | — | NOT_YET_WRITTEN |
| **Troubleshooting** | Scattered across domain docs (e.g. `docs/environment/sql-server-test-environment.md`'s "how to recreate" sections); no consolidated troubleshooting index | PARTIAL |
| **Security** | `docs/security/` | EXISTS |
| **Database Reference** | `docs/gameserver/database/`, `docs/database/` | EXISTS |
| **API Reference** | No dedicated OpenAPI/reference doc found; contracts live per-module (`*.contract.ts` files) and in each domain doc's own endpoint listings (e.g. `docs/knowledge/module-map.md`'s "PUBLIC INTERFACES" per module) | PARTIAL — real endpoints documented, not in one consolidated reference |
| **Deployment** | Scattered across `docs/environment/`, cPanel-specific notes in various handoff docs; no single deploy runbook | PARTIAL — `docs/README.md` already flags this gap honestly |
| **Commercial Product Documentation** | `docs/decisions/0017-modular-component-product-direction.md`, `docs/knowledge/commercial-modularity.md` | ARCHITECTURAL_DIRECTION ONLY — no actual product documentation exists, deliberately (see ADR-0017: "no commercial implementation is necessary now") |

## Design principle

This structure is additive, not destructive: every chapter above either
points at real existing docs (most of them) or explicitly says
`NOT_YET_WRITTEN`/`PARTIAL` where content doesn't exist yet. No existing
document should be moved, merged, or rewritten just to fit this
structure — if a future reorganization is warranted, it should be a
deliberate, tracked decision (see
[`docs/knowledge/cleanup-recommendations.md`](cleanup-recommendations.md)
for the honest inventory of what might eventually be worth
moving/merging), not an automatic consequence of defining this book
structure.

## How to use this

When looking for "the Blood Moon Book," there is no single file — this
document is the index that tells you which existing folder answers which
kind of question. Combine with `docs/README.md` (the central technical
index) and `docs/protocols/agent-bootstrap.md` (how to navigate before
acting) for the full picture.
