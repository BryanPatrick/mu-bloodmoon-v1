---
status: PARTIAL — convention established and spot-checked, not exhaustively enforced across all 205 documents
category: knowledge
audience: internal (engineering)
lastVerified: 2026-08-31
confidence: STRONG_EVIDENCE (real spot-checks); not a full audit
---

# Current vs. history — structural audit

Blood Moon's docs need to answer two different questions cleanly: **"How
does the system work today?"** (CURRENT) and **"How did it get this
way?"** (HISTORY). This document records the convention already in real
use, spot-checks how consistently it's applied, and names where the
distinction is currently blurred rather than pretending it's uniformly
clean.

## The convention already in use (found, not invented)

This project already has a real, working pattern for this, used
consistently in every document Phase K/L/M created or corrected:

1. **A document's CURRENT state is the default reading** — a reader
   opening `docs/vip/wz-setaccountlevel-coexistence.md` gets the current
   architecture and the current fix status first; the historical "how
   the bug was found and reproduced" narrative is present but clearly
   subordinate to the current-state conclusion at the top.
2. **History is preserved in place, marked visibly, never deleted** — the
   `~~strikethrough~~` + correction pattern (used in
   `docs/gameserver/database/legacy-unknown-structures.md`,
   `docs/launcher/cache-and-fallback.md`) keeps the wrong original claim
   readable while making unambiguous that it's superseded.
3. **Phase-numbered history sections stay attached to their current
   document**, not split into a separate history file — e.g.
   `wz-setaccountlevel-coexistence.md`'s "Phase L Decision Closure —
   Decision 1" section is part of the same document as the current VIP
   architecture description, not a separate historical file a reader
   might miss.
4. **ADRs (`docs/decisions/`) are the newest, most deliberate expression
   of this same split** — each ADR's CONTEXT/DECISION sections describe
   why something changed (history), while CONSEQUENCES and the decision
   itself describe the current state going forward.

## Where the distinction is NOT yet consistently applied

Honest gaps found during this spot-check (not exhaustive — see the scope
note below):

- **No document-level `SUPERSEDED`/`OUTDATED`/`HISTORICAL` status marker
  convention existed before Phase M** — individual *claims* within
  documents get corrected visibly (the strikethrough pattern), but no
  document has ever been marked, at the frontmatter level, as an entire
  document being historical-only. `docs/protocols/freshness-standard.md`
  (Phase M) now defines this vocabulary formally, but it has not been
  retroactively applied to any existing document — e.g. if
  `docs/current-web-source-catalog.md` should carry
  `status: SUPERSEDED_IN_DEPTH_BY_LEGACY_PROVIDER_WEB` (see
  `docs/knowledge/cleanup-recommendations.md` finding #2), that
  frontmatter change has not been made.
- **`docs/handoff/` is structurally ambiguous** — its documents are
  explicitly transitional/historical by nature (a handoff describes a
  moment, not an enduring current state), but they're not marked as such
  at the folder or frontmatter level; a reader has to infer "this is a
  point-in-time snapshot" from context rather than an explicit marker.
- **Phase-numbered subfolders** (`docs/product/phase13/`) mix current
  product truth with phase-specific implementation notes without a clear
  frontmatter signal distinguishing which parts of a given file are
  "still true" vs. "described what Phase 13 did, check current docs for
  whether it's still accurate" — `docs/decisions/0013-xshop-review-methodology.md`
  had to explicitly re-verify and re-state Phase 13 content as still
  current during this session, which is exactly the kind of
  re-verification that a clearer CURRENT/HISTORY marker would make
  faster to confirm.

## Recommendation, not yet executed

Retrofit `docs/protocols/freshness-standard.md`'s status vocabulary
(`SUPERSEDED`, `OUTDATED`, `HISTORICAL`) onto `docs/handoff/`'s documents
and any other folder whose contents are inherently point-in-time (not
"here is how it works," but "here is what happened at this moment") —
this is real, valuable future work, not executed in this pass because it
requires reading each candidate document to confirm its actual current
relevance first (exactly the kind of individual verification
`docs/index.json`'s honest 43/205-audited scope note already flags as
incomplete).

## Scope note

This is a spot-check across a handful of representative documents and
folders, not a read of all 205 files in `docs/`. Treat this document's
findings as real and worth acting on, but not as proof that every other
document in the tree cleanly separates current from historical content —
only that the ones checked here do (or, for `docs/handoff/`, don't yet).

## Related

`docs/protocols/freshness-standard.md` (the vocabulary this audit uses),
`docs/knowledge/cleanup-recommendations.md` (specific documents flagged
for a status-marker update).
