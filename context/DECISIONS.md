---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-17
---

# Decisions — status model and index

## ID-scheme resolution (read this before assigning any new ID)

Two real, independent decision systems already existed before this
pack. Neither is renumbered or replaced:

1. **Blood Moon ADRs** — [`docs/decisions/0NNN-*.md`](../docs/decisions/),
   a stable, already-in-use numeric scheme (currently, on `main`: 0019,
   0021, 0023, 0024, 0025, 0026, 0028, 0029, 0030 — confirmed via
   `git ls-tree`; numbers 0001-0018, 0020, 0022, 0027 are referenced by
   `docs/README.md`'s narrative but **not present on this branch**, see
   [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) OQ-CTX-001). This pack
   indexes them by their real number below — it never invents a
   parallel ID for a decision that already has one.
2. **Knowledge Hub decisions** — structured rows in the Hub's own
   `decisions` table (production: 26 real rows per the Phase 6 read-only
   audit, not re-verified this session). These have opaque database IDs
   today, no human-readable scheme.

The brief that created this pack suggested a `DEC-<DOMAIN>-NNN`
human-readable scheme (e.g. `DEC-PAYMENTS-001`). **Resolution**: that
scheme is reserved for (a) giving Knowledge Hub decisions a
human-readable label — deliberately **not done yet**, since assigning
one honestly requires reading each decision's real content, which this
session did not do (staging-only scope, no production Hub read
performed this phase) — see [`DEFERRED.md`](DEFERRED.md); and (b) any
future decision that is genuinely new and doesn't already have an ADR or
a Hub row. **Zero `DEC-*` IDs have been minted so far** — this is an
honest zero, not an oversight.

## Status model (matches the existing ADR convention exactly)

- `ACTIVE` — currently governs.
- `SUPERSEDED` — replaced by a later, explicitly-linked decision. Per
  `docs/architecture/engineering-governance.md`, a superseding decision
  is always a *new* record that names what it supersedes — the original
  is never edited or deleted. See [`SUPERSEDED_DECISIONS.md`](SUPERSEDED_DECISIONS.md).
- `DEFERRED` — considered, deliberately not decided yet, tracked in
  [`DEFERRED.md`](DEFERRED.md).
- `PROPOSED` — a recommendation on the table, not yet ruled on by Bryan.

## Canonical decision record shape (for any future new record)

```
id, title, domain, decision, status, reason, date,
supersedes?, superseded_by?, sources[], related_docs[], last_verified
```
Fields are optional where evidence is genuinely absent — never filled
from assumption (matches `docs/README.md`'s own standing rule: a
documented gap, e.g. ADR-0016's RMT-policy gap, is preferred over an
invented decision).

## Index of real ADRs present on `main` (by real number, real title)

| ADR | Title | Status |
|---|---|---|
| [0019](../docs/decisions/0019-payment-operational-closure-phase-p.md) | Payment operational closure — Phase P | ACTIVE |
| [0021](../docs/decisions/0021-payment-restriction-and-transfer-policy.md) | Payment restriction and transfer policy | ACTIVE |
| [0023](../docs/decisions/0023-store-catalog-decision-closure.md) | Store catalog decision closure | ACTIVE |
| [0024](../docs/decisions/0024-legacy-shop-control-plane.md) | Legacy shop control plane | ACTIVE |
| [0025](../docs/decisions/0025-progression-control-plane.md) | Progression control plane | PARTIALLY SUPERSEDED by 0029 |
| [0026](../docs/decisions/0026-progression-evidence-and-balance-readiness.md) | Progression evidence and balance readiness | PARTIALLY SUPERSEDED by 0029 |
| [0028](../docs/decisions/0028-xp-stack-and-progression-calculator.md) | XP stack and progression calculator | PARTIALLY SUPERSEDED by 0029 |
| [0029](../docs/decisions/0029-progression-reset-policy-current-ruling.md) | Progression reset policy — current ruling | ACTIVE (supersedes parts of 0025/0026/0028) |
| [0030](../docs/decisions/0030-migration-casing-static-audit.md) | Migration table-casing static audit + migration immutability governance | ACTIVE |

"PARTIALLY SUPERSEDED" is copied directly from `docs/architecture/engineering-governance.md`'s
own description of ADR-0029 — this pack does not independently judge
which parts, since that judgment already lives in ADR-0029 itself.

## Knowledge Hub decisions

Count only (Phase 6 audit, prior session, not re-verified this session):
**26 real decisions** in production `ai-knowledge-hub-db`. No per-decision
content is reproduced here — doing so without re-reading each one this
session would risk restating something inaccurately. See
[`KNOWLEDGE_HUB_MAPPING.md`](KNOWLEDGE_HUB_MAPPING.md) for how to query
them for real when a task needs to.
