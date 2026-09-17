---
status: ESTABLISHED
category: protocol
audience: internal (anyone writing documentation in this repo)
lastVerified: 2026-08-31
---

# Footnote standard

Formalizes a numbered-footnote style already in real use across this
repo's docs (e.g. `docs/README.md` uses `LGPD¹`), for local
term-of-art explanations that would disrupt reading flow if expanded
inline.

## When to use a footnote vs. the central glossary

Use a **footnote** when a technical term appears in a document and a
reader needs its meaning *right there*, without leaving the page — e.g.
a document about RBAC¹ permissions where the reader may not know the
acronym, but doesn't need a full cross-reference.

Use the **central glossary** (`docs/glossary.md`) when a term is used
across many documents and deserves one canonical, findable definition —
the glossary does not replace local footnotes; a document can (and
often should) do both: a local footnote for immediate context, plus the
term being in the glossary for anyone who wants the canonical version.

## Format

Mark the term with a superscript-style number using Unicode superscript
characters (¹ ² ³ ...), directly after the term, no space:

```markdown
RBAC¹ requires a real permission check, not just a role check.
```

At the bottom of the document (or the bottom of the relevant section for
a long document), a numbered list:

```markdown
## Glossário / Notas

1. **RBAC — Role-Based Access Control**: an access-control model where
   permissions are granted through named roles rather than assigned
   directly to individual users.
```

Real example already in this repo:
`docs/environment/sql-server-test-environment.md`'s glossary section
(SQL Server¹, Stored procedure², T-SQL³, UAC⁴).

## Rules

- Number footnotes in the order they first appear in the document, not
  alphabetically.
- Keep the footnote definition itself short — one to three sentences.
  If a term needs more than that, it belongs in the glossary (or its own
  doc), with the footnote linking there instead of trying to explain it
  fully inline.
- Don't footnote a term that's already spelled out in full on first use
  in the same document (e.g. "Role-Based Access Control (RBAC)") —
  footnotes are for terms used in abbreviated/acronym form without
  their own inline expansion.
- Reuse the same footnote number for the same term if it's referenced
  multiple times within one document's footnote scope (don't create
  duplicate entries for the same term).

## Related

`docs/glossary.md` (the central glossary this standard complements, not
replaces).
