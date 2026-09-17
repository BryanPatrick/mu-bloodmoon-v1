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

It deliberately does **not** check ADR content correctness, Knowledge
Hub state, or anything requiring network/database access — that's out
of scope for a lightweight, offline, pack-internal check.

## Last real run (this session)

First run found 20 broken links — all of them files this pack had not
yet created (domain stubs, `VALIDATION.md` itself,
`docs/operations/chat-history-ingestion.md`). Re-run after finishing the
pack; result recorded in the Phase 9 final report's `CONTEXT_VALIDATION`
field.
