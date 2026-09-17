---
status: EXPERIMENTAL
category: context-pack-domain
lastVerified: 2026-09-17
---

# Domain: Blood Moon AI

**State**: no implementation exists. This file records the alignment
constraint any future design must satisfy — not a proposal to build it
now.

**Non-negotiable constraint**: a future Blood Moon AI (player-facing or
internal-assistant) should reuse this project's existing source/status/
version/confidence/supersession *concepts* (the same shape
`DECISIONS.md` and `docs/decisions/` already use) rather than inventing
a parallel one — but must keep **INTERNAL ENGINEERING KNOWLEDGE**
(everything in `docs/`, this Context Pack, the Knowledge Hub) strictly
separated from **PLAYER-SAFE KNOWLEDGE** (the root-level
[`knowledge/`](../../knowledge/) library — items, sets, wiki-derived
content). No accidental leakage in either direction. See
[`GOVERNANCE.md`](../GOVERNANCE.md)'s security classification table —
`PUBLIC_PLAYER` vs. `INTERNAL`/`RESTRICTED`/`SECRET_REFERENCE_ONLY` is
exactly this boundary, generalized.

**Related**: [`../DEFERRED.md`](../DEFERRED.md).
