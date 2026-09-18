---
status: ACTIVE
category: knowledge
audience: internal (product + engineering)
lastVerified: 2026-09-18
---

# Video sources

Points at `knowledge/vendor-sweep/transcript-inventory.json` (the real,
per-video, machine-generated record) — does not duplicate its 108 rows here.

## Channels

| Channel | Role | Videos | Authority | Relevance |
|---|---|---|---|---|
| `@projectgamersoficial` | Vendor's own official tutorial channel | 108 tracked | `PROVIDER_TUTORIAL` | `BLOODMOON_LIKELY` (same engine, not all individually cross-checked) |
| `@EuSanTiago` | Community, RealMU-sponsored | 3 total (1 transcribed, 2 `TRANSCRIPT_NOT_AVAILABLE`) | `COMMUNITY_TUTORIAL` | `PROVIDER_SPECIFIC_OTHER_SERVER` — never promoted to Blood-Moon-relevant |
| `mubloodmoon` (Blood Moon's own channel) | Own marketing/community channel | Not swept | N/A | Explicitly out-of-scope as "not a vendor" |
| `kaspis4080` | Unrelated MU server | Not swept | N/A | Explicitly discarded, unrelated |

Confirmed exhaustive: grepping the entire `D:\MU\docs` corpus for
`youtube.com/@`/`youtube.com/channel/` found exactly these 4 channels ever
referenced anywhere — no unaudited channel references exist
(`reference-gap-manifest.json` GAP-005).

## Coverage (`project-gamers-oficial`, 108 videos)

| Stage | Status |
|---|---|
| Transcript captured | Majority (`rawTranscriptStatus: CAPTURED`) — exact count per video in `transcript-inventory.json`, not re-tallied here to avoid a hand-maintained number drifting from the generator's own output (re-run `node scripts/knowledge-transcript-inventory.mjs` for a fresh count if needed) |
| Normalized → claims → verified (full pipeline) | 9 videos reached `knowledge-index.json` (KI-001 through KI-009 range), each individually shown `COMPLETE`/`PARTIAL`/`MISSING` per stage in `knowledge/vendor-sweep/provenance-report.json` |
| Captured but zero downstream processing | At least 3 confirmed this phase: `gqtSk1pdti4`, `Jia1TrtgZfY`, `XUeN6U74zME` (all SHOP/CURRENCY domain, P1 priority) — see `KNOWLEDGE_GAPS.md` GAP-P18-01 |
| `TRANSCRIPT_NOT_AVAILABLE` (no captions ever generated) | Tracked per-video in `failure-manifest.json`, not re-derived here |

## High-value untranscribed/unprocessed videos (this audit's specific finding)

| Video ID | Title | Domains | Priority | Status |
|---|---|---|---|---|
| `gqtSk1pdti4` | Custom Buy Vip — ADDED 8.3 | SHOP, CURRENCY, CONFIG, SYSTEM | P1 | RAW captured, nothing else started |
| `Jia1TrtgZfY` | Command Buy Vip Check User — UPDATED 8.2 | COMMAND, SHOP, CURRENCY | P1 | RAW captured, nothing else started |
| `XUeN6U74zME` | Custom Buy Vip And Coin — UPDATED 7.7 | SHOP, CURRENCY, CONFIG, SYSTEM | P1 | RAW captured, nothing else started |

These are the single highest-value next capture for the Cash/WCoin topic —
see `LEGACY_SUPPLIER_INDEX.md` for why (they describe the vendor engine's
native in-game purchase-command path, a second flow distinct from the
website/DMN-CMS flow already fully traced).

## Community source classified out-of-scope

`Research/YouTube/eusantiago/transcripts/qJ6Xp6o51C8.pt.json` — describes a
real-money WCoin purchase with an account-level cap, but on a RealMU
-affiliated server, not Blood Moon. Kept as `COMMUNITY_TUTORIAL`/
`PROVIDER_SPECIFIC_OTHER_SERVER` terminology corroboration only, per
`docs/knowledge/source-authority.md`'s existing rule — never treated as
Blood-Moon-specific evidence.
