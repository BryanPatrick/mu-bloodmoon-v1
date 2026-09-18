---
status: ACTIVE
category: knowledge
audience: internal (product + engineering)
lastVerified: 2026-09-18
---

# Knowledge master index

The top-level "how do I find X" router for Blood Moon's knowledge
ecosystem. Written for Phase 18/18B (2026-09-18, "pente fino" knowledge
preservation + global audit). Supersedes the separately-requested
`KNOWLEDGE_INVENTORY.md` (Phase 18) — folded in here rather than
duplicated, per the "do not duplicate unnecessarily" instruction.

## Three layers, no dual authority (Phase 18B §38)

1. **Knowledge Hub** (Cloudflare D1, `akh` CLI, project slug `bloodmoon`) —
   structured, machine-operational state: tasks, decisions, sessions,
   handoffs, a small curated set of `knowledge_items`/`sources`. Query it
   with `akh bootstrap bloodmoon` / `akh knowledge list bloodmoon` /
   `akh source list bloodmoon` (read-only, needs `AI_KNOWLEDGE_HUB_API_KEY`
   from `hub/.env.local`). See `SOURCE_REGISTRY.md` for real current counts.
2. **Repository knowledge docs** (`mu-bloodmoon-v1/docs/`, `context/`,
   `knowledge/vendor-sweep/`) — durable, curated, git-tracked, human- and
   agent-readable reference. This is where `LEGACY_SUPPLIER_INDEX.md`,
   `docs/economy/*`, the ADRs, and the vendor knowledge sweep live.
3. **Raw archives** (`D:\MU\Research`, `RemoteData`, `Archives`, `Deploy`,
   `Database`, `Knowledge`, `catalog` — deliberately outside git) — original
   source evidence: tutorial files, decompiled launcher source, backup
   tarballs, VPS inventories. See `SOURCE_REGISTRY.md`.

A knowledge item never lives authoritatively in two of these at once — the
Hub's `bloodmoon-legacy-web-backup` source, for example, is a *pointer* to
the raw archive at `D:\MU\Deploy\Cpanel-Backups\hostbr-web-20260716\`, not a
copy of it.

## Router: task → domain → source → runbook

```
TASK ("how do I do X?")
  -> DOMAIN (see docs/knowledge/knowledge-sweep.md's topic list, or
     TOPIC_COVERAGE.md for maturity per domain)
  -> Is it a current, operational Blood Moon system?
       YES -> context/SOURCE_INDEX.md / context/REPOSITORY_KNOWLEDGE_MAP.md
              -> the relevant docs/ file -> PROCEDURE_INDEX.md for the runbook
       NO  -> is it legacy/vendor/historical?
              YES -> this file's "Legacy & vendor" section below
                     -> LEGACY_SUPPLIER_INDEX.md / VPS_DOCUMENTATION_INDEX.md
                     -> knowledge/vendor-sweep/ (node scripts/knowledge-query.mjs)
              NO  -> KNOWLEDGE_GAPS.md (it may be a known, tracked gap)
  -> CONFLICTS.md (check before trusting a single source)
  -> PROCEDURE_INDEX.md (runbook exists? risk? approval needed?)
```

## Quick answers to the example lookups (Phase 18B §17)

| Question | Answer path |
|---|---|
| "How does WCoin reach the game?" (legacy) | `LEGACY_SUPPLIER_INDEX.md` — full traced flow, file:line evidence |
| "Where is XShop configured?" | `docs/economy/xshop-cashshop-config-field-matrix.md` |
| "How do I change a GameServer setting?" | `PROCEDURE_INDEX.md` row "Configure a GameServer setting" → `KNOWLEDGE_NO_RUNBOOK`, reload/restart safety is a real, tracked unknown (GAP-P18-07) |
| "How do we publish a launcher update?" | `PROCEDURE_INDEX.md` — legacy documented in `ANALISE-LAUNCHER.md`; current system not re-verified this phase |
| "Where is the reset configuration?" | `context/domains/` (current) — out of this audit's scope, not re-checked |
| "How did the legacy Cash purchase work?" | `LEGACY_SUPPLIER_INDEX.md` — this audit's central finding |
| "How do I restore the portal DB?" | `PROCEDURE_INDEX.md` → `bloodmoon-deploy` skill, `RUNBOOK_READY` |
| "Where is a specific vendor tutorial?" | `VPS_DOCUMENTATION_INDEX.md` → `D:\MU\Research\Vendor\Tutorials\` |

Agent lookup test (informal, this session): every question above was
answerable within 1-3 hops using only the files this audit produced plus
pre-existing docs — no manual full-repo search was needed once the router
above exists. Not a formalized 10-20-scenario test (Phase 18B §18 asks for
that formally) — this is a smaller, honest proxy, not a substitute.

## Legacy & vendor knowledge (this audit's focus)

- **Vendor**: ProjectGamers engine + "Free MU CMS"/"DmN MuCMS" web package.
  See `LEGACY_SUPPLIER_INDEX.md`.
- **VPS documentation**: `VPS_DOCUMENTATION_INDEX.md`.
- **Video/tutorial sources**: `VIDEO_SOURCES.md`.
- **External websites**: `EXTERNAL_SOURCES.md`.
- **Topic maturity**: `TOPIC_COVERAGE.md`.
- **Known gaps**: `KNOWLEDGE_GAPS.md`.
- **Known conflicts/near-conflicts**: `CONFLICTS.md`.
- **Operational procedures**: `PROCEDURE_INDEX.md`.
- **Full source inventory**: `SOURCE_REGISTRY.md`.

## Existing methodology (not re-created, already mature)

- `docs/knowledge/knowledge-sweep.md` — the RAW→NORMALIZED→DERIVED→PRODUCT_USE
  discipline and the sweep process itself.
- `docs/knowledge/source-authority.md` — the 10-level authority scale +
  Blood-Moon-relevance axis.
- `docs/knowledge/conflict-resolution.md` — never-silently-pick-a-winner rule.
- `docs/knowledge/raw-capture.md` — RAW preservation rules, secrets handling.
- `docs/knowledge/vps-ingestion.md` — the VPS read-only boundary + tooling.
- `docs/knowledge/wiki-preparation.md` — DERIVED-to-Wiki-candidate discipline.

This audit extends these with real 2026-09-18 data and the legacy Cash-flow
finding; it does not replace or restate them.

## Future RAG/search assessment (Phase 18B §39)

Current structured files (Hub + `knowledge/vendor-sweep/*.json` + this
index) are sufficient for the lookup patterns tested this phase — every
question resolved in 1-3 hops via file-path/topic routing, not free-text
search. A full-text or vector index is not recommended yet: the corpus is
still small enough (64 Hub items, 41 vendor-sweep sources, ~30 docs/economy
+ ADR files) for structured routing to outperform search infrastructure
overhead. Revisit if/when the corpus grows past what a router table can
reasonably enumerate, or if the 3 untranscribed videos (and any future
sweep) push the vendor-sweep corpus significantly larger.

## Practical "full utilization" status (Phase 18B §35 definition)

| Criterion | Status |
|---|---|
| All known sources inventoried | YES — Hub (64/7), vendor-sweep (41), raw archives, repo docs |
| High-value sources preserved | YES — legacy web backup, VPS tutorials, launcher source, all hash-verified |
| Searchable derivatives available | PARTIAL — `knowledge-query.mjs` covers the vendor sweep; repo docs are grep/read-searchable but not full-text indexed |
| Source authority known | YES — existing scale applied consistently |
| Topic mapping available | YES — `TOPIC_COVERAGE.md` |
| Critical conflicts explicit | YES — none found this phase beyond 2 near-conflicts, both resolved with reasoning |
| Common operations runbooked | MOSTLY — 8/13 `RUNBOOK_READY`, gaps are all in the legacy/dormant-system area, expected |
| Gaps visible | YES — `KNOWLEDGE_GAPS.md`, 10 entries, none hidden |
