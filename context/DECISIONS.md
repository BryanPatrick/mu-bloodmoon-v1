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
   a stable, already-in-use numeric scheme: 0001-0030 in total (9
   tracked on `main`; 21 — `0001-0018`/`0020`/`0022`/`0027` — real,
   read in full Phase 11, preserved from `mu-bloodmoon-v1-openbeta`'s
   untracked working tree, see
   [`ADR_INDEX.md`](ADR_INDEX.md) for the complete table). This pack
   indexes them by their real number — it never invents a parallel ID
   for a decision that already has one. **Phase 12 clarification:** the
   21 preserved-only *files* remain `HISTORICAL_SOURCE` reference
   material until individually promoted; indexing their historical
   decision content does not make those files canonical on `main`.
2. **Knowledge Hub decisions** — structured rows in the Hub's own
   `decisions` table (production: 26 real rows per the Phase 6 read-only
   audit, not re-verified this session). These have opaque database IDs
   today, no human-readable scheme.

The brief that created this pack suggested a `DEC-<DOMAIN>-NNN`
human-readable scheme (e.g. `DEC-PAYMENTS-001`). **Resolution, updated
Phase 10 by explicit instruction (DECISÕES #1)**: this scheme is
**never minted as a canonical replacement ID** — Knowledge Hub decision
IDs (real UUIDs, see below) and ADR numbers stay canonical permanently.
An optional, non-canonical human-readable *alias* may be proposed for
readability (see [`KNOWLEDGE_HUB_MAPPING.md`](KNOWLEDGE_HUB_MAPPING.md)'s
per-decision table), but it always maps back to the real canonical ID
and is never used in place of it. **Zero `DEC-*` IDs have ever been
minted** — this remains an honest, permanent zero for this specific
scheme, not a to-do.

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
documented gap is preferred over an invented decision). ~~ADR-0016's
RMT policy is a gap~~ was a stale example: Phase 11 read the preserved
ADR-0016, which states the policy and leaves account-sale safeguards
for later design.

## Index of real ADRs

See [`ADR_INDEX.md`](ADR_INDEX.md) for the full 0001-0030 table (9
tracked on `main`, 21 real, preserved-from-openbeta, read in full Phase
11 — see [`preservation/OPENBETA_UNTRACKED_MANIFEST.md`](preservation/OPENBETA_UNTRACKED_MANIFEST.md)).
"PARTIALLY SUPERSEDED" (0025/0026/0028, by 0029) is copied directly
from `docs/architecture/engineering-governance.md`'s own description —
this pack does not independently judge which parts.

## Decision-count accounting (corrected Phase 10 — discovered vs. reviewed vs. indexed are different numbers)

Phase 9 only *counted* the Hub's decisions (from a prior-phase audit,
not re-read). Phase 10 actually read every one via a real, read-only
`SELECT` against production `ai-knowledge-hub-db` — these are now
different, explicitly separated numbers, per the correction this phase
was asked to make:

```
REPO_DECISIONS_REVIEWED = 30  (all of 0001-0030 -- 9 tracked-on-main + 21 preserved-from-openbeta,
                                every one read in full as of Phase 11; see ADR_INDEX.md)
HUB_DECISIONS_DISCOVERED = 26 (matches the Phase 6 prior-session count, now confirmed directly)
HUB_DECISIONS_REVIEWED   = 26 (every row's real `decision` text was read this phase, not just counted)
HUB_DECISIONS_INDEXED    = 26 (all 26 now have a domain mapping + staleness cross-check in
                                KNOWLEDGE_HUB_MAPPING.md — none marked NEEDS_REVIEW for being
                                unreadable; several ARE marked NEEDS_REVIEW for being stale)
```

See [`KNOWLEDGE_HUB_MAPPING.md`](KNOWLEDGE_HUB_MAPPING.md) for the full
per-decision table (domain, alias, currency check) and
[`REPOSITORY_KNOWLEDGE_MAP.md`](REPOSITORY_KNOWLEDGE_MAP.md) §6 for the
real conflict found between three of them (`cf5f14c2`/`53034c0c` vs.
`fa8e9ad0`).
