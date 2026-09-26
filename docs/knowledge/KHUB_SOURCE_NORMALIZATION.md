---
status: ACTIVE
category: knowledge
audience: internal (product + engineering)
lastVerified: 2026-09-18
---

# Knowledge Hub source-linkage normalization plan

Production Knowledge Hub (project slug `bloodmoon`) was read via `akh
knowledge list bloodmoon --limit 100 --json` (GET only, no mutation) this
phase. 62 active knowledge items exist; 42 have no structured `source_id`
foreign key. This is a **plan**, not an executed change — the Hub was never
written to. Prepared per Phase 18C Part 7/8.

## Method

Each orphaned item was classified by its existing `source_type`/
`source_reference` fields (not invented): a real repo file path in
`source_reference` → `HIGH` confidence, direct link. A `source_type:
conversation` with no file → `DERIVED_FROM_DECISION`, `LOW` confidence — it's
session-derived, not file-derived. A title naming a concrete file/route with
an empty `source_reference` field → `DERIVED_FROM_REPO`, `MEDIUM` confidence
(the evidence is right there in the title, just not structured yet). A
"Checkpoint - Etapa N" title with nothing else → `DERIVED_FROM_DECISION`,
`MEDIUM` (a real, dated phase exists, just not pinned to a commit this
phase). Everything else with no evidence at all → `UNKNOWN`, not guessed.

Every proposed `source_id` below is `bloodmoon-main-repository`
(`348a191c-4cd9-4ab5-b409-b216ea4adcb4`) — the Hub's only registered
`repository`-type source, and correct for every item that is genuinely
about the codebase. No item was linked to a source it doesn't actually
belong to.

## Summary

| Classification | Count | What it means |
|---|---|---|
| `SOURCE_REFERENCE_TEXT_ONLY`, confidence HIGH | 7 | Ready to link immediately — `source_reference` already names the exact file |
| `DERIVED_FROM_REPO`, confidence MEDIUM | 4 | Title names a route/file; needs `source_reference` populated first |
| `DERIVED_FROM_DECISION`, confidence MEDIUM | 11 | Real "Etapa N" checkpoints; needs the specific commit/session pinned |
| `DERIVED_FROM_REPO`, confidence LOW | 15 | Plausibly repo-derived (bug/audit finding) but no file/commit named anywhere |
| `DERIVED_FROM_DECISION`, confidence LOW | 3 | Session-conversation-derived, no file at all |
| `UNKNOWN` | 2 | Genuinely no provenance evidence in the item itself — left UNKNOWN, not invented |

## Full mapping

| knowledge_item_id (first 8) | Topic | Current source state | Proposed source_id | Proposed source type | Confidence | Manual review required? |
|---|---|---|---|---|---|---|
| 9ea1cc9a | GENERAL | SOURCE_REFERENCE_TEXT_ONLY | bloodmoon-main-repository | repository | HIGH | NO |
| 9c3ea788 | ENGINEERING | SOURCE_REFERENCE_TEXT_ONLY | bloodmoon-main-repository | repository | HIGH | NO |
| ec539aee | ENGINEERING | SOURCE_REFERENCE_TEXT_ONLY | bloodmoon-main-repository | repository | HIGH | NO |
| 81789520 | TESTING/DEPLOYMENT | SOURCE_REFERENCE_TEXT_ONLY | bloodmoon-main-repository | repository | HIGH | NO |
| 621e326b | TESTING/DEPLOYMENT | SOURCE_REFERENCE_TEXT_ONLY | bloodmoon-main-repository | repository | HIGH | NO |
| d1b8f59a | SECURITY | SOURCE_REFERENCE_TEXT_ONLY | bloodmoon-main-repository | repository | HIGH | NO |
| df5527fc | SECURITY | SOURCE_REFERENCE_TEXT_ONLY | bloodmoon-main-repository | repository | HIGH | NO |
| 867694f6 | MARKETPLACE | DERIVED_FROM_REPO (title names `/admin/marketplace/escrow.vue`) | bloodmoon-main-repository | repository | MEDIUM | YES — populate `source_reference` |
| 3138c379 | WEBSITE/DESIGN | DERIVED_FROM_REPO (title names `/loja/:slug`) | bloodmoon-main-repository | repository | MEDIUM | YES — populate `source_reference` |
| 013cd21a | WEBSITE/DESIGN | DERIVED_FROM_REPO (title names `/roadmap/:slug`) | bloodmoon-main-repository | repository | MEDIUM | YES — populate `source_reference` |
| bb5f4ba5 | MARKETPLACE | DERIVED_FROM_REPO (title names `/loja/:slug` + `/admin/marketplace/*`) | bloodmoon-main-repository | repository | MEDIUM | YES — populate `source_reference` |
| 25966a7a | GENERAL | DERIVED_FROM_DECISION (Etapa 18 reconfirmação) | bloodmoon-main-repository | repository | MEDIUM | YES — pin commit/session |
| b47c7da9 | GENERAL | DERIVED_FROM_DECISION (Etapa 18 checkpoint) | bloodmoon-main-repository | repository | MEDIUM | YES — pin commit/session |
| 5e31d397 | TESTING/DEPLOYMENT | DERIVED_FROM_DECISION (Etapa 17 checkpoint) | bloodmoon-main-repository | repository | MEDIUM | YES — pin commit/session |
| 158880ef | COMMUNITY | DERIVED_FROM_DECISION (Etapa 16 checkpoint) | bloodmoon-main-repository | repository | MEDIUM | YES — pin commit/session |
| db5883b4 | COMMUNITY | DERIVED_FROM_DECISION (Etapa 14 checkpoint) | bloodmoon-main-repository | repository | MEDIUM | YES — pin commit/session |
| fbfbfe1f | COMMUNITY | DERIVED_FROM_DECISION (Etapa 13 checkpoint) | bloodmoon-main-repository | repository | MEDIUM | YES — pin commit/session |
| 8a09ae7d | COMMUNITY | DERIVED_FROM_DECISION (Etapa 12 checkpoint) | bloodmoon-main-repository | repository | MEDIUM | YES — pin commit/session |
| 91be139a | GENERAL | DERIVED_FROM_DECISION (Etapa 11 checkpoint) | bloodmoon-main-repository | repository | MEDIUM | YES — pin commit/session |
| 3144975e | COMMUNITY | DERIVED_FROM_DECISION (Etapa 10 checkpoint) | bloodmoon-main-repository | repository | MEDIUM | YES — pin commit/session |
| 208f47fc | COMMUNITY | DERIVED_FROM_DECISION (Etapa 9 checkpoint) | bloodmoon-main-repository | repository | MEDIUM | YES — pin commit/session |
| 5dd2a9cf | GENERAL | DERIVED_FROM_DECISION (Etapa 8 checkpoint) | bloodmoon-main-repository | repository | MEDIUM | YES — pin commit/session |
| 28772543 | WEBSITE/DESIGN | DERIVED_FROM_DECISION (conversation, no file) | bloodmoon-main-repository | repository | LOW | YES |
| c2757410 | ENGINEERING | DERIVED_FROM_DECISION (conversation, no file) | bloodmoon-main-repository | repository | LOW | YES |
| 52328f95 | WEBSITE/DESIGN | DERIVED_FROM_DECISION (conversation, no file) | bloodmoon-main-repository | repository | LOW | YES |
| f4e02709 | WEBSITE/DESIGN | DERIVED_FROM_REPO (plausible, unevidenced) | bloodmoon-main-repository | repository | LOW | YES |
| 027dbe4a | WEBSITE/DESIGN | DERIVED_FROM_REPO (plausible, unevidenced) | bloodmoon-main-repository | repository | LOW | YES |
| 941d4271 | ENGINEERING | DERIVED_FROM_REPO (plausible, unevidenced) | bloodmoon-main-repository | repository | LOW | YES |
| 12236b77 | WEBSITE/DESIGN | DERIVED_FROM_REPO (plausible, unevidenced) | bloodmoon-main-repository | repository | LOW | YES |
| 4d70b946 | MARKETPLACE | DERIVED_FROM_REPO (plausible, unevidenced) | bloodmoon-main-repository | repository | LOW | YES |
| 6a9a23c4 | GENERAL | DERIVED_FROM_REPO (plausible, unevidenced) | bloodmoon-main-repository | repository | LOW | YES |
| 60485a87 | ENGINEERING | DERIVED_FROM_REPO (plausible, unevidenced) | bloodmoon-main-repository | repository | LOW | YES |
| 88dbf354 | SECURITY | DERIVED_FROM_REPO (plausible, unevidenced — the credential exposure finding) | bloodmoon-main-repository | repository | LOW | YES |
| 5d72dd9e | COMMUNITY | DERIVED_FROM_REPO (plausible, unevidenced) | bloodmoon-main-repository | repository | LOW | YES |
| 6dacc2e6 | GENERAL | DERIVED_FROM_REPO (plausible, unevidenced) | bloodmoon-main-repository | repository | LOW | YES |
| a6c67671 | COMMUNITY | DERIVED_FROM_REPO (plausible, unevidenced) | bloodmoon-main-repository | repository | LOW | YES |
| 450887a8 | GENERAL | DERIVED_FROM_REPO (plausible, unevidenced) | bloodmoon-main-repository | repository | LOW | YES |
| 3b0d938f | WEBSITE/DESIGN | DERIVED_FROM_REPO (plausible, unevidenced) | bloodmoon-main-repository | repository | LOW | YES |
| 8a11fa97 | COMMUNITY | DERIVED_FROM_REPO (plausible, unevidenced) | bloodmoon-main-repository | repository | LOW | YES |
| 362d73b1 | TESTING/DEPLOYMENT | DERIVED_FROM_REPO (plausible, unevidenced) | bloodmoon-main-repository | repository | LOW | YES |
| efc21ccd | TESTING/DEPLOYMENT | UNKNOWN | (none) | (none) | NONE | YES — no provenance evidence at all |
| c7388084 | COMMUNITY | UNKNOWN | (none) | (none) | NONE | YES — no provenance evidence at all |

## What this plan deliberately does not do

- Does not write to the Hub (`KHUB_MUTATED = NO`).
- Does not invent a specific commit hash for the 15 `MEDIUM`-confidence
  "Etapa N checkpoint" items — a real future step would grep `git log` for
  each Etapa's known date range and confirm, not guess.
- Does not force the 2 `UNKNOWN` items into a source — they stay `UNKNOWN`,
  correctly, until real evidence surfaces.
- All 42 proposals point at the *same* single source
  (`bloodmoon-main-repository`) because that is genuinely the only
  correct source type for internal engineering/product findings — this is
  not a shortcut, the Hub's other 6 sources (client/launcher, legacy web
  backup, public website, portal API, game DB backup, game server backup)
  are simply not what these particular 42 items are about.
