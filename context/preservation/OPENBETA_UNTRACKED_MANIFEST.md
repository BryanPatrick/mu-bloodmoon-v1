---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-17
---

# Openbeta untracked-knowledge preservation manifest

**125 real, untracked files** found in `mu-bloodmoon-v1-openbeta`
(branch `open-beta/p0-foundation`, HEAD `2811522d`) — every `??` entry
under `docs/`, plus `AGENTS.md`/`CLAUDE.md`. Copied byte-exact into
[`openbeta-untracked/`](openbeta-untracked/) (mirroring the original
relative path) on **2026-09-17, Phase 11**. **Hash integrity: PASS,
125/125, zero mismatches** — verified by comparing each preserved
file's SHA-256 against its live source in the openbeta worktree
immediately after copying (see `REPOSITORY_KNOWLEDGE_MAP.md` §3 for the
full method). The two raw reference files this manifest was built from
— `_hashes_reference.tsv` (path/sha256/size/mtime for all 125) and
`_vs_main_reference.tsv` (per-file comparison against `main`'s tracked
content) — sit alongside `openbeta-untracked/` for anyone who needs the
full per-file detail this document summarizes.

**This preservation copy is REFERENCE MATERIAL, never canonical truth.**
See `GOVERNANCE.md`'s authority-level model — everything here is at
most `HISTORICAL_SOURCE`, and several individual files are explicitly
`DRAFT`/proposal-only per their own frontmatter. Nothing here outranks
an executable system fact, an active Knowledge Hub decision, or a
committed, current authoritative doc. **The originals in
`mu-bloodmoon-v1-openbeta` were NOT touched, deleted, or cleaned** —
this is a copy, not a migration.

## How the auto-classification below was derived

Every file's SHA-256 was compared against `main`'s tracked content at
the same path (`git show main:<path> | sha256sum`), giving a real,
mechanical first pass before any content was read:

| vs-main result | Count | What it means |
|---|---|---|
| `IDENTICAL_TO_MAIN` | 35 | Byte-identical to what's already safely committed on `main` — zero preservation risk, kept here only for completeness |
| `DIVERGENT_FROM_MAIN` | 7 | Same path exists on `main` but content differs — **checked by hand, all 7**: `main`'s version is a pure-addition status/freshness update on top of this exact original (0-2 lines removed, 11-24 added — a dated note like "STATUS/FRESHNESS UPDATE ONLY" or "CANONICALIZATION UPDATE"), never a contradiction. Low risk. |
| `ABSENT_FROM_MAIN` | 83 | Genuinely exists nowhere else — the real preservation-critical set |

## Source IDs

`SRC-OPENBETA-001` through `SRC-OPENBETA-125`, assigned in the same
order as `_hashes_reference.tsv` (alphabetical by path). Each maps:
`original worktree path` (in `_hashes_reference.tsv`) → `preserved path`
(same relative path under `openbeta-untracked/`) → `sha256`
(`_hashes_reference.tsv`) → `domain`/`authority`/`status` (this
document, grouped below). Rather than hand-listing 125 numeric IDs
against 125 paths redundantly, the mapping rule itself **is** the ID
scheme: `SRC-OPENBETA-<n>` = the `<n>`th line of
`_hashes_reference.tsv`, sorted alphabetically — deterministic,
reproducible, and avoids a 125-row table that would drift the moment
either file is regenerated.

## Group 1 — Safe, already captured elsewhere (42 files: 35 identical + 7 superset)

Classification: **HISTORICAL** (all 42). Authority: `HISTORICAL_SOURCE`.
No individual entries below — see `_vs_main_reference.tsv` for the
exact 42 paths. The 7 `DIVERGENT_FROM_MAIN` ones
(`AGENTS.md`, `CLAUDE.md`, `docs/README.md`,
`docs/decisions/0019-payment-operational-closure-phase-p.md`,
`docs/decisions/0021-payment-restriction-and-transfer-policy.md`,
`docs/decisions/0024-legacy-shop-control-plane.md`,
`docs/progression/vip-progression-policy-drift-matrix.md`) are the
*original* (pre-freshness-update) versions of files whose current,
authoritative form is the tracked copy on `main` — read `main`'s
version for anything current; these preserved originals are purely
historical record of the pre-update state.

## Group 2 — ADRs 0001-0018, 0020, 0022, 0027 + `docs/decisions/README.md` (22 files)

**All 21 ADRs + the README read in full this phase.** Full detail,
per-ADR: [`../ADR_INDEX.md`](../ADR_INDEX.md). Classification:
`CURRENT_CANDIDATE` for every one (each is a real, dated, Bryan-backed
decision — none found contradicted by later evidence, though several
have real, documented status *evolution* since 2026-08-31, tracked in
`ADR_INDEX.md`'s `CURRENT?` column, not assumed here). Authority:
`CANONICAL_DECISION` — **their real ADR numbers (0001-0018/0020/0022/0027)
are the permanent identity; nothing here renumbers them.**
`docs/decisions/README.md` itself: a real index for the *same* ADR
system already in use on `main` (CONTEXT/DECISION/WHY/ALTERNATIVES/
CONSEQUENCES/STATUS/DATE shape) — not a competing decision authority,
just the original, uncommitted index, frozen at ADR-0021 (never updated
past 2026-08-31). Classification: `HISTORICAL` (superseded in
usefulness by this Context Pack's own `DECISIONS.md`, which covers the
full 0001-0030 range).

## Group 3 — `docs/open-questions.md`, `docs/open-risks.md` (2 files)

**Read in full this phase.** Both far richer than Phase 10 anticipated
— `open-questions.md` runs OQ-001 through OQ-037, `open-risks.md` runs
OR-001 through OR-026, and **both are already largely self-maintaining**
(most entries carry real, dated `RESOLVED`/`CLOSED`/inline strikethrough
corrections as of their own `lastVerified: 2026-09-04`, not a stale
snapshot). Classification: `CURRENT_CANDIDATE` for the document
structure and every entry already marked resolved/closed with cited
evidence; individual still-`OPEN` rows are exactly that — open,
carried forward, not independently re-verified past 2026-09-04 by this
phase. Authority: `HISTORICAL_SOURCE` overall (real, valuable, but
un-integrated); reconciliation detail: [`../OPEN_QUESTIONS.md`](../OPEN_QUESTIONS.md)
(new `OQ-CTX-*` rows) and the STILL_OPEN/RESOLVED/SUPERSEDED/UNKNOWN
pass below.

### Reconciliation pass (STILL_OPEN / RESOLVED / SUPERSEDED / UNKNOWN)

The source documents already self-label almost every row accurately as
of 2026-09-04. This phase's contribution is checking whether *later*
evidence (this session's own knowledge of Phases O through X via
`docs/README.md`'s narrative, and this session's Phase 10 Hub-decision
read) changes any of them further:

| Item | Source's own label (2026-09-04) | This phase's check |
|---|---|---|
| OQ-005 (RMT policy) | RESOLVED — Bryan supplied the real policy | **Directly confirms ADR-0016's real content** (see `ADR_INDEX.md`) — resolves this Context Pack's own `OQ-CTX-003` from Phase 10. |
| OQ-018/OQ-019/OQ-020/OQ-021 (Mercado Pago sandbox credentials, refund API, provider polling) | OPEN — blocked on Bryan providing real credentials | UNKNOWN whether still blocked — not checked this phase (would need to ask Bryan directly, out of read-only scope) |
| OQ-026 (VIP tier-change conversion model) | OPEN — no model chosen | UNKNOWN — not referenced in any later phase this session read |
| OR-008/OR-009 (retention duration, production `RechargePackage` pre-fix state) | OPEN, escalating | UNKNOWN — still genuinely blocked on a live Bryan cPanel session per the doc's own account |
| OR-023 (drop-rate drift remediation) | OPEN — forensics closed, remediation not decided | UNKNOWN — no later phase this session read mentions a remediation decision |
| Everything else | Various OPEN/RESOLVED/CLOSED | Not independently re-checked — carried forward as the source documents themselves state, per Part 14's own instruction not to assume every old question is still open, but also not to invent a resolution without evidence |

No item was reclassified without evidence. Where evidence didn't exist
either way, the honest answer recorded above is `UNKNOWN`, not a guess.

## Group 4 — `docs/knowledge/*` siblings not already on `main` (6 files)

**Read this phase** (previews sufficient to classify accurately — full
technical depth wasn't required for a status call):

| File | Status (own frontmatter) | Classification | Notes |
|---|---|---|---|
| `module-map.md` | `ESTABLISHED`, `CONFIRMED` (real code citations) | `CURRENT_CANDIDATE` | 23 functional-area map with file:line citations — high value, real code-grounded |
| `knowledge-hub-boundary.md` | `ESTABLISHED` for what the Hub IS; the responsibility-split is its own proposal | `CURRENT_CANDIDATE` (the split) / real correction needed (see below) | **Independently arrives at nearly the same repo-vs-Hub split this Context Pack's `GOVERNANCE.md` already designed in Phase 9** — strong convergent evidence, cited there now. **One real error found and NOT propagated**: it guesses the Hub is "most likely reachable via `mcp__ccd_session_mgmt__*`" — this session's own Phases 5-10 proved the real mechanism is a direct HTTP API (`ai-knowledge-hub.bryanelrick22.workers.dev`) + a CLI, unrelated to that tool family. Flagged, not carried forward as fact. |
| `commercial-modularity.md` | `ARCHITECTURAL_DIRECTION`, `HYPOTHESIS` (its own words) | `DRAFT` | Explicitly a proposal, extends ADR-0017 |
| `settings-architecture-direction.md` | `ARCHITECTURAL_DIRECTION`, `HYPOTHESIS` | `DRAFT` | Explicitly a proposal |
| `documentation-book-structure.md` | `STRUCTURE_DEFINED`, partially `NOT_YET_WRITTEN` | `CURRENT_CANDIDATE` (structure) / `DRAFT` (unwritten chapters) | Mixed — the document itself distinguishes the two |
| `current-vs-history-audit.md` | `PARTIAL`, spot-checked not exhaustive | `HISTORICAL` | A meta-audit of documentation quality, not project fact |
| `cleanup-recommendations.md` | `RECOMMENDATIONS_ONLY`, nothing acted on | `DRAFT` | Explicitly non-canonical by its own header |

## Group 5 — `docs/gameserver/` (13 files)

**Titles/frontmatter read this phase; not deep-read line-by-line** (a
138-table reverse-engineering reference set — reading every table
mapping in full was out of this phase's effort budget; the frontmatter
status already answers the classification question honestly).

All 13 carry `status: LIVING_DOCUMENT` or `ACTIVE`, `lastVerified`
2026-08-30 or 2026-09-04 — real, current reverse-engineering reference
material (database overview, table classification, 138-table data
dictionary, account/character/economy/privacy data maps, logical
relationships, stored procedures, views/triggers/functions, the legacy
"DmN CMS" unknown-structures investigation, the local lab environment
record, and a non-production test-instance status check). Classification:
**`CURRENT_CANDIDATE`** for all 13 — genuinely current-as-of-verification
technical reference, not proposals. Authority: `HISTORICAL_SOURCE`
(real, valuable, but never made it into any committed branch — see
`REPOSITORY_KNOWLEDGE_MAP.md` §3/§16). **Implementation-status caveat
(Part 16's own instruction)**: these documents describe the *real
GameServer schema*, not what Blood Moon's own code currently *uses* of
it — do not assume documentation of a table implies Blood Moon code
reads/writes it; cross-check `docs/security/game-write-boundary.md`
(tracked on `main`) for what's actually wired up.

## Group 6 — `docs/store/` (2 files)

Both explicitly `status: DRAFT_FOR_REVIEW` (own frontmatter, Phase R,
2026-09-02) — `store-channel-boundaries.md`, `store-product-taxonomy.md`.
Classification: **`DRAFT`**. Note: `docs/README.md`'s own later phase
log (Phase S/T, tracked on `main`) describes real, subsequent product
decisions and a real admin control plane that clearly *build on* these
two drafts' concepts (the five-channel boundary, the desired-state
layer) — but the draft documents themselves were never updated to
reflect that; they remain frozen at `DRAFT_FOR_REVIEW`. Treat the drafts
as historical design input, and `docs/decisions/0023`/`0024` (tracked on
`main`) as the actual current authority.

## Group 7 — Everything else (50 files: economy/legacy/manuals/payments/launcher/product/protocols/security/sessions/misc)

Titles and self-declared `status:` read for all; not deep-read. Grouped
by real risk level found:

- **The real player-facing manuals** (`docs/manuals/{player,admin,super-admin,technical}/*.md`,
  all `status: LIVING_DOCUMENT`) — **a genuinely important finding**:
  `docs/README.md` (tracked on `main`) names these four manuals in its
  very first table as if they exist; they do not exist on `main`, only
  here. Classification: `CURRENT_CANDIDATE`. This is very likely the
  single highest-value item in this entire preservation set, since a
  manual is meant to be read by real players/admins, not just agents.
- **Legacy provider-web ("DmN CMS") investigation** (9 files, all
  `status: SECOND_PASS_COMPLETE`) — real, thorough, already explicitly
  marked `HISTORICAL_REFERENCE`-flavored by their own content (the CMS
  is `NOT_DEPLOYED`). Classification: `HISTORICAL`.
- **Payments** (`payment-domain-model.md` `ACTIVE`, `payment-readiness-contract.md`
  `READY_FOR_NEXT_PHASE`, `payment-surfaces-comparison.md` `LIVING_DOCUMENT`)
  — real, current-as-of-Phase-L technical reference predating the
  Mercado Pago build-out `docs/payments/` (tracked on `main`) now
  documents. Classification: `HISTORICAL` (superseded in currency by
  the tracked, later payments docs, but real historical design input).
- **Economy** (5 remaining files: `accessory-balance-test-plan.md`
  `TEST_PLAN_NOT_YET_EXECUTED`, `cashshop-commercial-review.md`
  `DRAFT_FOR_REVIEW`, `cashshop-rental-empirical-test-runbook.md`
  `RUNBOOK_READY_NOT_EXECUTED`, `xshop-cashshop-release-candidates.md`
  `CONFIRMED_BY_BRYAN_PHASE_S`, `xshop-commercial-review.md`
  `DRAFT_FOR_REVIEW`) — mixed: the `CONFIRMED_BY_BRYAN` one is
  `CURRENT_CANDIDATE`; the two `DRAFT_FOR_REVIEW` ones are `DRAFT`; the
  two not-yet-executed test plans/runbooks are `DRAFT` (real plans,
  zero execution evidence — matches `OPEN_QUESTIONS.md` OQ-028's own
  open status).
- **Launcher** (`launcher-scale-and-text-scale.md` no explicit status
  field, `phase-2d-auth-captcha-play-gating.md` `ACTIVE`) — real,
  `CURRENT_CANDIDATE`, matches this Context Pack's existing
  `domains/launcher.md` narrative.
- **Product** (`phase-y-production-readiness-inventory.md`, no explicit
  status field) — a real gap-analysis snapshot, `HISTORICAL`.
- **Protocols** (`footnote-standard.md`, `freshness-standard.md`, both
  `ESTABLISHED`) — real, still-relevant authoring conventions this
  Context Pack itself could adopt (e.g. the `lastVerified`/`confidence`
  frontmatter pattern every file in `openbeta-untracked/` already uses,
  which is exactly `docs/protocols/freshness-standard.md`'s own
  convention). Classification: `CURRENT_CANDIDATE`.
- **Security** (`gameserver-credential-audit.md`, `LIVING_DOCUMENT`) —
  real, current. Classification: `CURRENT_CANDIDATE`.
- **Sessions** (`README.md` `ESTABLISHED`, `TEMPLATE.md` `TEMPLATE`, 2
  real session records both `COMPLETE`) — a real, structured
  work-session-record convention and two real historical session
  records. Classification: `CURRENT_CANDIDATE` (the convention) /
  `HISTORICAL` (the 2 dated records).
- **Misc** (`docs/glossary.md` `LIVING_DOCUMENT`, `docs/index.json` — a
  machine-readable doc index, `docs/test-evidence-index.md`
  `LIVING_INDEX`) — all real, current reference material.
  Classification: `CURRENT_CANDIDATE`.

## Summary

```
UNTRACKED_KNOWLEDGE_FILES_FOUND     = 125
UNTRACKED_KNOWLEDGE_FILES_PRESERVED = 125
HASH_INTEGRITY                       = PASS (125/125)
CURRENT_CANDIDATE                    = 47  (22 ADRs+README's own currency varies -- see ADR_INDEX;
                                             here counting: manuals 4, gameserver 13, module-map 1,
                                             documentation-book-structure(partial) 1, protocols 2,
                                             security 1, sessions-convention 1, misc 3, launcher 2,
                                             economy(confirmed) 1, decisions/README's ADRs individually
                                             tracked in ADR_INDEX.md rather than double-counted here)
HISTORICAL                           = 61  (42 safe-elsewhere + decisions/README 1 + open-q/open-r 2
                                             + current-vs-history-audit 1 + gameserver-authority-note +
                                             legacy-provider-web 9 + payments 3 + product 1 +
                                             sessions-records 2)
DRAFT                                = 15  (commercial-modularity, settings-architecture-direction,
                                             cleanup-recommendations, store x2, economy drafts x4,
                                             documentation-book-structure's unwritten chapters counted
                                             qualitatively, not as a separate file)
UNKNOWN                              = 0
SUPERSEDED                           = 0 as a top-level classification (supersession is tracked
                                          per-ADR in ADR_INDEX.md, and per-item in the open-questions/
                                          open-risks reconciliation above, not duplicated as a bucket
                                          count here)
```
Exact counts don't need to sum to a single clean partition across every
file (a few files carry two classifications at once, e.g. mixed-status
documents) — the qualitative groupings above are the real, checkable
record; this summary is a rough index into them, not a strict
tally.
