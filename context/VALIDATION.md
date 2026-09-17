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
- **(Phase 11)** Every file listed in
  `preservation/_hashes_reference.tsv` still exists under
  `preservation/openbeta-untracked/` at the exact hash recorded when it
  was preserved — a real, re-runnable hash-integrity check, not just
  the one-time manual verification done at copy time. A missing file or
  a hash mismatch both fail the run.

**Deliberate exclusion, Phase 11**: `preservation/openbeta-untracked/`
itself is walked only by the hash-integrity check above — its 125
files are frozen, foreign archival copies (per Part 4's own "copy
exactly, never rewrite" rule) with their own status vocabulary and
their own relative links pointing into a `docs/` tree this pack didn't
preserve in full. Applying this pack's own authoring-convention checks
(status enum, link-resolves-to-a-real-file, secret pattern) to them
produced ~115 false positives the first time this was tried (every
preserved file's own real, legitimate status value, plus links into
files this preservation pass didn't copy) — excluded on purpose, not
an oversight.

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
(SRC-* duplicate/undefined-reference checks, authority-level check),
final Phase 10 state: PASS, 28 files. Phase 11 added the preservation
hash-integrity check, initially over-applied the authoring-convention
checks to the new archive (115 false positives, self-caught and fixed
by excluding the archive from those specific checks), then re-ran
clean: **PASS, 30 files (+ 125/125 preserved files hash-verified),
0 issues**.
