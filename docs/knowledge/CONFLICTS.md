---
status: ACTIVE
category: knowledge
audience: internal (product + engineering)
lastVerified: 2026-09-18
---

# Conflict register

Per `docs/knowledge/conflict-resolution.md`'s rule: never silently pick a
winner. Findings from Phase 18/18B (2026-09-18).

## No direct factual contradictions found this phase

Unlike the 2026-08-25 sweep (also "no conflicts found," per
`conflict-resolution.md`), this phase's new captures (the DMN CMS PHP source
trace, the Knowledge Hub counts, the VPS doc cross-check) are net-new
evidence filling gaps, not re-descriptions of something already documented
differently elsewhere.

## Two near-conflicts, resolved with reasoning (not merged, not deleted)

### 1. "49" vs. "48" vendor tutorial files

- **Claim A**: `docs/knowledge/vps-ingestion.md` states "49 vendor tutorial
  files were copied... 43 of 49 have been read."
- **Claim B**: Direct inspection this phase (`Research/Vendor/Tutorials/`
  directory listing + `Tutorials_copy_results.json`'s 48 entries +
  `manifest.json`'s 48 entries) found 48, not 49.
- **Resolution**: Unresolved discrepancy, not adjudicated. Possibly an
  off-by-one error in the original doc, or a file removed/renamed since
  2026-08-17. Both numbers are now recorded (`VPS_DOCUMENTATION_INDEX.md`)
  rather than one silently overwriting the other.

### 2. "46/48 copied" vs. "48/48 OK"

- **Claim A**: `Tutorials_copy_results.json` (first-pass SCP transfer log)
  records 46 `COPIED` + 2 `FAILED` (accented-filename SCP mangling).
- **Claim B**: `Tutorials/manifest.json` (later SHA-256 verification pass)
  records all 48 as `OK`, with the same 2 files annotated "name mangled in
  SSH text transport, fixed manually; hash/size confirmed match."
- **Resolution**: **Not a conflict** — a two-stage record of the same real
  event (first-pass failure, then manual fix + verification). Both files
  are kept; `manifest.json` is the current-state source of truth.

## Worktree fragmentation (a source-duplication issue, not a factual conflict)

`mu-bloodmoon-legacy-catalog`'s `docs/economy/` (4 files, stale) vs.
`mu-bloodmoon-v1`'s `docs/economy/` (9 files, current) do not contradict
each other — the smaller set is simply an earlier snapshot missing later
findings (`legacy-dmn-cms-and-currency-investigation.md` and others). Not a
CLAIM-vs-CLAIM conflict; recorded as a governance gap instead
(`KNOWLEDGE_GAPS.md` GAP-P18-04).

## Community source vs. vendor source (a relevance boundary, not a conflict)

The EuSanTiago/RealMU WCoin-purchase transcript describes different game
mechanics/economics than Blood Moon's own — this is expected and correctly
handled by the existing `PROVIDER_SPECIFIC_OTHER_SERVER` classification,
not a conflict requiring resolution (per `source-authority.md`'s own
worked example, already in place before this phase).
