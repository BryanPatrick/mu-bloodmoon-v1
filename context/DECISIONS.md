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
and is never used in place of it. The scheme's other reserved use —
"any future decision that is genuinely new and doesn't already have an
ADR or a Hub row" — was exercised for the first time in Phase 14 (see
below); it remains reserved, never used to relabel something that
already has a real ID.

## Genuinely new decisions recorded directly in this pack (DEC-* scheme, first real use — Phase 14)

Two current, real product/business decisions from Bryan with **no
prior ADR, no prior Hub row, and no chat-history citation** (none was
available or fabricated) — recorded here, dated to when they were
actually given, per this project's own "never invent a historical
source or date" rule:

| ID | Title | Domain | Decision | Status | Date | Sources |
|---|---|---|---|---|---|---|
| `DEC-VIP-001` | Bronze commercial VIP tier disabled | vip | Commercial VIP progression is `Free`/`Silver`/`Gold`. `BRONZE_COMMERCIAL_ENABLED = false`. The Bronze technical enum/schema/history is **not** removed or altered by this decision — it may remain dormant for compatibility/historical reasons; this is a commercial-availability rule, not a data-model change. | ACTIVE | 2026-09-17 | ADMIN_DECISION / Bryan (direct instruction, this session, Phase 14) |
| `DEC-PAYMENTS-001` | Asaas is the current primary payment-provider direction; Mercado Pago is dormant | payments | Asaas is the primary current provider direction. Mercado Pago's real, existing implementation is **not** removed and is **not** declared permanently unused — it is dormant, not planned for active use under current direction, and this may change with a future decision. | ACTIVE | 2026-09-17 | ADMIN_DECISION / Bryan (direct instruction, this session, Phase 14) |
| `DEC-BLOODMOON-AI-001` | Blood Moon AI `STAGE 2` (internal question answering) is authorized | bloodmoon-ai | `STAGE2_AUTHORIZED = YES`, `STAGE2_INTERNAL_PILOT_STATUS = ACTIVE`. `STAGE 2` = the internal pilot only: the read-only, non-autonomous specialist answers questions from Claude/engineering; no player surface, public endpoint, telemetry, conversation memory, player-private data, action execution, or Wiki/Journal auto-publishing (those stay `STAGE 3+`, each needing its own authorization). This is the separate authorization `ADR-0033` requires for `STAGE 2`; it builds toward `ADR-0033`'s scope and does not re-open it. | ACTIVE | 2026-09-25 (authorized by the `BLOODMOON-AI-05` brief); formally recorded 2026-09-26 | ADMIN_DECISION / Bryan. Primary: the `BLOODMOON-AI-05` phase brief (2026-09-25; the brief text itself is not persisted in the repository), executed as commit `803466a` (cherry-picked to `main` as `96464bd`, PR #1) "Stage 2 internal pilot", recorded in `docs/architecture/bloodmoon-ai-product-vision.md` §20/§22. Confirmation: Bryan's `BLOODMOON-AI-07` brief (2026-09-26, project thread), "STAGE 2 was already authorized by the BLOODMOON-AI-05 brief … do NOT treat Stage 2 authorization as pending anymore". Closes `GAP-AI06B-03` (registered on the open PR #3). |

(`DEC-BLOODMOON-AI-001` is dated to the phase that actually authorized
it, 2026-09-25, not to the day it was written down — per the same "never
invent a date" rule.) The first two are recorded with today's real date because that is genuinely
when Bryan gave the instruction — not because any older source was
found or assumed. If a real, dated historical source (an ADR, a Hub
decision, or a real chat transcript once imported) is ever found to
predate this, it does not retroactively change these dates; a
supersession or an amended provenance note would be added instead,
per this project's own "never silently overwrite history" rule.
Domain-file detail: [`domains/vip.md`](domains/vip.md),
[`domains/payments.md`](domains/payments.md).

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

**2026-09-25**: ADR-0031, 0032, 0033 (Blood Moon AI) and 0034 (`main`
is the canonical source) are on GitHub `main` and are the only ADR
files there today; see [`ADR_INDEX.md`](ADR_INDEX.md) and
[`MAIN_INTEGRATION.md`](MAIN_INTEGRATION.md).

See [`ADR_INDEX.md`](ADR_INDEX.md) for the full 0001-0030 table (9
tracked on `main`, 21 real, preserved-from-openbeta, read in full Phase
11 — see `preservation/OPENBETA_UNTRACKED_MANIFEST.md` (on `docs/agent-automation-architecture`, not on `main`)).
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
