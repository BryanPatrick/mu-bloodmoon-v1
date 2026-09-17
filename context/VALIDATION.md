---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-17
---

# Validation

A deliberately small, dependency-free script —
[`validate.mjs`](validate.mjs) — not a framework. Run it after editing
anything under `context/`:

```bash
node context/validate.mjs
```

It checks:

- Every relative Markdown link under `context/` resolves to a real file.
- Every `status:` frontmatter value is one of the known values
  (`ACTIVE`/`SUPERSEDED`/`DEFERRED`/`PROPOSED`, plus the pre-existing
  repo values `LIVING_INDEX`/`ESTABLISHED` it may encounter if it's ever
  pointed at `docs/`).
- No text matches an obvious secret-shaped pattern (API key prefixes, PEM
  private-key headers) — a coarse net, not a substitute for the
  project's real secret-scanning discipline (`AGENTS.md` invariants
  10/14).
- Any `DEC-<DOMAIN>-NNN` ID ever minted (currently zero, see
  `DECISIONS.md`) gets flagged for human review if it appears with
  inconsistent usage across files.
- **(Phase 10)** Every `SRC-REPO-*`/`SRC-HUB-*` ID defined in
  `SOURCE_INDEX.md`'s tables is defined exactly once (a duplicate row
  is a real bug — two different sources sharing an ID). Every such ID
  *referenced* anywhere else in `context/` actually has a defining row
  in `SOURCE_INDEX.md` — a reference to a source this pack never
  indexed is exactly the "missing referenced source" class of bug Part
  26 asks for.
- **(Phase 10)** Every source's Authority-level column value (in
  `SOURCE_INDEX.md`) is one of the six levels `GOVERNANCE.md` defines
  (`EXECUTABLE_FACT`/`CANONICAL_DECISION`/`CURRENT_DOC`/
  `ACCEPTED_HANDOFF`/`HISTORICAL_SOURCE`/`AI_CANDIDATE`) — an unknown
  value would mean the two docs have drifted.

It deliberately does **not** check ADR content correctness, Knowledge
Hub state, or anything requiring network/database access — that's out
of scope for a lightweight, offline, pack-internal check. It also does
not (Phase 10, by choice) try to detect an ACTIVE+SUPERSEDED status
inconsistency generically — the one real instance of a compound status
this pack uses (`docs/decisions/0025/0026/0028`'s "PARTIALLY SUPERSEDED")
was verified by hand against `docs/architecture/engineering-governance.md`,
and a generic parser for that shape would be exactly the
over-engineering Part 26 warns against for the value it'd add.

## Runs this session

Phase 9's first run found 20 broken links (files not yet created at
that point) — all resolved, re-run PASS. Phase 10 extended the script
(SRC-* duplicate/undefined-reference checks, authority-level check) and
re-ran after every batch of edits; final Phase 10 state: **PASS, 28
files, 0 issues**.
