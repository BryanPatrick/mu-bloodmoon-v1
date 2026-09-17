---
status: RECOMMENDATIONS_ONLY — nothing deleted or moved automatically
category: knowledge
audience: internal (engineering + product)
lastVerified: 2026-08-31
confidence: STRONG_EVIDENCE for the specific findings below (spot-checked, not an exhaustive read of every file in `docs/`); this is a scoped pass, not a full audit
---

# Documentation cleanup recommendations

Identifies duplicate/stale/misplaced docs found during Phase M's
research passes. **Nothing was deleted, merged, or moved as part of
this document** — per explicit instruction, these are recommendations
for a human (Bryan) to act on, not automatic cleanup. Every existing
document is preserved exactly as-is.

This is a **scoped pass**, not an exhaustive audit of all 205 documents
in `docs/` — see `docs/index.json`'s own honest scope note (43/205
documents individually verified this phase). Treat the absence of a
document from this list as "not yet reviewed," not "confirmed clean."

## Findings

### 1. Two complementary (not duplicate) investigations of the same legacy source

**`docs/game-data/legacy-web-intelligence/`** (9 files, earlier phase)
and **`docs/legacy/provider-web/`** (10 files, Phase M) both investigate
the same `hostbr-web-20260716` backup, but with genuinely different
focus: the former is schema/query-discovery-oriented (to support live
SQL Server work), the latter is module-inventory/security/payments/VIP-
oriented.

**Recommendation: KEEP both, cross-linked.** Not a merge candidate —
each has real, non-overlapping value for a different kind of question.
A cross-reference was added to `docs/legacy/provider-web/overview.md`
pointing at the other tree; **`docs/game-data/legacy-web-intelligence/overview.md`
should get a reciprocal pointer** the next time it's touched (not done
in this pass, to avoid editing a document this pass didn't fully read
end-to-end).

### 2. A shallow catalog superseded in depth (but not in scope) by a newer tree

**`docs/current-web-source-catalog.md`** (Phase K, file-count-only
inventory of the legacy web backup) is now superseded *in depth* by
`docs/legacy/provider-web/` for the specific PHP source it catalogs —
but it also catalogs asset counts (item images, uploads, etc.) that
neither newer tree touches.

**Recommendation: KEEP, mark as superseded-in-depth for code content,
not asset content.** A cross-reference was added in
`docs/legacy/provider-web/overview.md`. Do not delete —
`current-web-source-catalog.md`'s asset-count inventory has no
replacement elsewhere.

### 3. `docs/economy/legacy-dmn-cms-and-currency-investigation.md` — likely overlap, not independently verified this pass

Its filename strongly suggests overlap with both
`docs/legacy/provider-web/payments-legacy.md`/`vip-legacy.md`
(currency/CashShop findings) and the `legacy-web-intelligence/currencies.md`
file above. **Not read in full during this pass** — flagged for a future
session to check, not confirmed as duplicate.

**Recommendation: REVIEW (not yet actioned)** — read all three
currency-related legacy docs together and decide MERGE vs. KEEP
cross-linked, the same way finding #1 was resolved.

### 4. `docs/current-admincp-catalog.md` — likely a Phase K sibling of `current-web-source-catalog.md`

Not read in full this pass. Given the naming symmetry with finding #2,
likely another shallow catalog now partially superseded in depth by
`docs/legacy/provider-web/useful-historical-reference.md`'s admin-panel
capability inventory.

**Recommendation: REVIEW (not yet actioned)** — same treatment as
finding #2, once actually read and compared.

### 5. Dual-purpose manual: Operations vs. Technical Operator

`docs/manuals/technical/manual-operacao-tecnica.md` serves as both the
"Operations Manual" and "Technical Operator Manual" chapters in
`docs/knowledge/documentation-book-structure.md` — not a duplication
problem, just worth naming explicitly so a future split (if the two
audiences ever diverge enough to need separate documents) isn't
mistaken for solving a duplication that doesn't currently exist.

**Recommendation: KEEP_AS_IS.** No action needed unless the two
audiences' needs actually diverge.

### 6. No standalone GM manual

Already tracked as OQ-014 in `docs/open-questions.md` — not a
duplication finding, but flagged here too since "is there a missing
document" is adjacent to this cleanup pass's scope.

**Recommendation: See `docs/open-questions.md` OQ-014** — this is a
gap-to-fill decision, not a cleanup action.

## What was explicitly NOT reviewed this pass

Design docs (`docs/design/`, `docs/design-history/`), most of
`docs/handoff/`, all of `docs/product/guild/`, and the majority of
`docs/game-data/` beyond `legacy-web-intelligence/` were not read this
pass. Their absence from this document is not a clean bill of health —
it's an honest scope boundary. A future cleanup pass should extend this
document, not replace it, when those areas are actually reviewed.

## How to use this document

Each finding above gets a recommendation label:
**MERGE** / **MOVE** / **MARK_SUPERSEDED** / **KEEP_HISTORICAL** /
**KEEP_AS_IS** / **KEEP (cross-linked)** / **REVIEW (not yet actioned)**.
When Bryan or a future session acts on a recommendation, update this
document's entry to record what was actually done — do not delete the
entry, since it's useful history of what was considered and why.
