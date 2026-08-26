# Knowledge Sweep

What this is, why it exists, and how to run another one.

## Purpose

Blood Moon's operational knowledge is scattered across the git repo, an ungoverned research workspace (`D:\MU\Research`, `Knowledge`, `RemoteData`, `Archives`, `catalog`), a live VPS, and vendor YouTube channels. A "knowledge sweep" is a deliberate pass that finds references to information that was never actually captured — a doc that says "see the tutorial" with no tutorial on disk, a summary with no source behind it, a channel that's been mentioned but never catalogued — and either captures the missing RAW source or records exactly why it can't be captured yet.

It is **not** documentation cleanup. Cleanup rewrites what exists; a sweep goes and gets what's missing.

## The core discipline: SOURCE → RAW → NORMALIZED → DERIVED → PRODUCT USE

- **RAW**: the original artifact, unmodified — a transcript, an HTML tutorial, a config file, a screenshot. Preserved in its original format.
- **NORMALIZED**: whitespace-cleaned, topic-split, entity-tagged — but still traceable line-for-line to the RAW it came from.
- **DERIVED**: claims, wiki candidates, cross-references — built from NORMALIZED, but a DERIVED artifact is never a substitute for its RAW. If someone asks "where did this come from," the answer must terminate at a RAW artifact, not a summary of a summary.
- **PRODUCT USE**: the actual Wiki page, in-game text, or operational doc that a real feature/player-facing surface consumes.

A summary with no RAW behind it is marked `RAW_MISSING` — it is never silently treated as sufficient. See [raw-capture.md](raw-capture.md).

This mirrors, and is meant to interoperate with, the existing `Knowledge/README.md` EVIDENCE → KNOWLEDGE → OPERATIONS discipline used for Blood Moon's own confirmed runtime systems (drop rates, fake-online, GM commands, monster spawns). That older discipline is for **confirmed Blood Moon behavior**; this sweep discipline is for **everything referenced but not yet captured**, including third-party vendor/community material that may never reach BLOODMOON_CONFIRMED status.

## What a sweep does, roughly in order

1. **Audit** the corpus (docs, research folders, VPS inventory, YouTube catalogs) for what already exists — reuse, don't re-capture.
2. **Find gaps**: references to sources that were never captured. See [source-authority.md](source-authority.md) for how a gap gets classified, and `knowledge/vendor-sweep/reference-gap-manifest.json` for the current list.
3. **Capture RAW** for whatever is reachable through legitimate, authorized, read-only means. See [vps-ingestion.md](vps-ingestion.md) and [youtube-ingestion.md](youtube-ingestion.md) for the two capture paths used so far.
4. **Classify** each new source's authority and Blood-Moon-relevance (see [source-authority.md](source-authority.md)).
5. **Flag conflicts** rather than silently picking a winner (see [conflict-resolution.md](conflict-resolution.md)).
6. **Draft Wiki candidates** from confirmed knowledge, never auto-published (see [wiki-preparation.md](wiki-preparation.md)).
7. **Report honestly** — coverage percentages, not "complete." A sweep that found 7 things and has 60 things left unaudited says so.

## Where the output lives

- Raw captures: `D:\MU\Research\**` (outside git — matches the existing ungoverned-research-workspace convention for `Research/`, `RemoteData/`, `Archives/`).
- Structured sweep outputs (manifests, index, wiki candidates): `mu-bloodmoon-v1/knowledge/vendor-sweep/` (inside git — distinct from `knowledge/equipment/` and `knowledge/audit/`, which are the pre-existing product-data and dedup-audit areas).
- This methodology documentation: `mu-bloodmoon-v1/docs/knowledge/` (this folder).

## Running another sweep

There is no automated `knowledge-sweep` CLI yet — the tooling built alongside the first sweep (2026-08-25) is a set of manual browser-automation patterns (see [youtube-ingestion.md](youtube-ingestion.md)) plus the existing RemoteOps CLI (see [vps-ingestion.md](vps-ingestion.md)), not a single script. A future incremental sweep should:

1. Re-read `knowledge/vendor-sweep/knowledge-index.json` and `reference-gap-manifest.json` to see what's already covered.
2. Re-check `failure-manifest.json` for retryable failures (e.g. a transcript panel that failed to populate might work on retry).
3. Only capture what's new or was previously blocked — never re-capture what's already RAW-complete.
4. Update the manifests, don't replace them.

## What this sweep explicitly did not touch

Per the standing constraints for all Blood Moon knowledge/research work: no production database writes, no MU game data changes, no deploys, no secret rotation, no cPanel changes, no Cloudflare production changes, no GameBridge writes, no history rewrites, no silent duplicate discarding, no auth/CAPTCHA bypass, no private-content scraping, no unnecessary full-video downloads (transcripts/metadata only), no secrets stored from crawled material.
