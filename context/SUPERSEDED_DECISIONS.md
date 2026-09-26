---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-17
---

# Superseded decisions — pointer index

This file does not restate any decision's content — the real
supersession record lives in the superseding ADR itself, per
`docs/architecture/engineering-governance.md`'s rule ("a superseding
decision is always a *new* record that names what it supersedes — the
original is never edited or deleted").

| Superseded (or partially) | By | Where the real record lives |
|---|---|---|
| ADR-0025 (parts) | ADR-0029 | `docs/decisions/0029-progression-reset-policy-current-ruling.md` (not on `main` yet; see [`MAIN_INTEGRATION.md`](MAIN_INTEGRATION.md)) |
| ADR-0026 (parts) | ADR-0029 | same |
| ADR-0028 (parts) | ADR-0029 | same |
| "Canonical location" statements in `AGENTS.md` (2026-09-08, `governance/engineering-pack`), the Context Pack (2026-09-17, local `D:\MU` `main`) and `docs/architecture/engineering-governance.md` — in-document statements, not ADRs | ADR-0034 (2026-09-25) | `docs/decisions/0034-main-is-the-canonical-source-of-truth.md` (on `main`); row added `BLOODMOON-AI-06B` |

## ADR reconciliation (Phase 10, Part 12)

Confirmed this phase: `0025`/`0026`/`0028` are each partially superseded
by `0029` (per `docs/architecture/engineering-governance.md`'s own
description — this pack does not independently re-derive which parts,
since that judgment already lives in ADR-0029 itself). `0019`, `0021`,
`0023`, `0024`, `0030` remain fully active, no newer authority found
pointing away from any of them this phase. No ADR content was edited.

## Knowledge Hub — explicitly NOT marked here (by design, this phase)

All 26 Hub decisions were read this phase (see
[`KNOWLEDGE_HUB_MAPPING.md`](KNOWLEDGE_HUB_MAPPING.md)). A real
inconsistency was found — `cf5f14c2` ("SITE_BETA_BLOCKED") and
`53034c0c` ("NO-GO for public launch") are **partly** contradicted 13
hours later by `fa8e9ad0` (implemented recovery tokens/endpoints, but
its own context says mail delivery was blocked). The later SMTP handoff
still requires deployed end-to-end validation. **None of the three is
marked `SUPERSEDED` here**.
The Hub itself still records all three as `active` with
`supersedes_decision_id = NULL`, and this pack does not silently
reconcile a Hub-internal inconsistency by editing Hub state or by
unilaterally declaring one decision superseded in this repo's own
files. See [`REPOSITORY_KNOWLEDGE_MAP.md`](REPOSITORY_KNOWLEDGE_MAP.md)
§6 for the full conflict record and
[`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) OQ-CTX-006 for what resolving
it would require (a real Bryan decision, or a fresh audit of the
current blocker list against 2026-09-17's actual repo state).

No entry in this file is ever removed when a later decision supersedes
it again — a chain of supersession is added as new rows, not by editing
old ones.
