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

## The 3 priority videos — processed 2026-09-18 (Phase 18C)

| Video ID | Title | Domains | Priority | Status |
|---|---|---|---|---|
| `gqtSk1pdti4` | Custom Buy Vip — ADDED 8.3 | SHOP, CURRENCY, CONFIG, SYSTEM | P1 | **Extracted in full** → `CASH_VIP_INTEGRATION_MAP.md` Part 1 |
| `Jia1TrtgZfY` | Command Buy Vip Check User — UPDATED 8.2 | COMMAND, SHOP, CURRENCY | P1 | **Extracted in full** → `CASH_VIP_INTEGRATION_MAP.md` Part 1 |
| `XUeN6U74zME` | Custom Buy Vip And Coin — UPDATED 7.7 | SHOP, CURRENCY, CONFIG, SYSTEM | P1 | **Extracted in full** → `CASH_VIP_INTEGRATION_MAP.md` Part 1 |

Extracted by direct transcript read (not the automated `knowledge-*.mjs`
pipeline — see `KNOWLEDGE_GAPS.md` GAP-P18-01b for that distinction).
Together they describe the vendor engine's native in-game purchase/spend
path (both a chat-command and a later in-game-menu form, plus a generic
item-triggered reward mechanism covering VIP/currency/skill grants) — a
second flow, kept explicitly distinct from the website/DMN-CMS flow in
`LEGACY_SUPPLIER_INDEX.md` (see `CASH_VIP_INTEGRATION_MAP.md` Part 2).

## Remaining backlog after this phase (real counts, `transcript-inventory.json`)

| Priority | Total | Claims already extracted (any prior phase) | Raw only, unprocessed |
|---|---|---|---|
| P0 | 57 | 30 | 27 |
| P1 | 20 | 6 + 3 (this phase) = 9 | 11 |
| P2 | 17 | 1 | 16 |
| P3 | 14 | 2 | 12 |

**Remaining P1 backlog (11 videos)** — classified this phase, not
processed (per instruction not to process all 108):

| Video ID | Title | Classification |
|---|---|---|
| `FHPFZmqyDqI` | Custom Buy Vip And Coin — ADDED 7.0 | `DUPLICATE_TOPIC` — an older version of the now-processed `XUeN6U74zME` (7.7); low incremental value |
| `daXFimBKtVM` | Command Buy Vip update 2.0.1.6 | `DUPLICATE_TOPIC` — likely predates the now-processed `Jia1TrtgZfY` (8.2) |
| `0r_QHATVZKo` | Command Set Vip update 2.0.1.6 | `DUPLICATE_TOPIC` — same version line as above |
| `KwzxnwjTTZE` | Adicionando Pacotes de Vip's e Moedas | `DUPLICATE_TOPIC` (suspected pair with the row below — near-identical title) |
| `xAHo-_33feE` | Adicionando Pacotes Vips e Cash's | `DUPLICATE_TOPIC` (suspected pair with the row above) |
| `e9NLT40zdls` | Vip Money Editor ProjectGamers | `P2` — distinct topic (an admin editor tool, not the purchase flow itself), real remaining value |
| `ay5Da1fenLw` | Custom Npc Features for Class and Custom Damage for vips | `P2` — NPC/class feature, VIP-adjacent but not currency-flow |
| `9blMRwQmATQ` | MuHelper for vips, Command Info And Custom Npc Gift for vips | `P2` — same reasoning |
| `8Oq6AX3kVo0` | Custom Npc Collector And Command Gift for vips | `P2` — same reasoning |
| `pNvSjmchQ4E` | Custom Drop New Box — UPDATE 4.1 | `NO_CURRENT_VALUE` (for the Cash/VIP topic specifically) — DROP-domain, not currency-flow; tagged P1 for a different reason |
| `XA3JgQgsr9k` | Command Make & Drop Atualizados | `NO_CURRENT_VALUE` (for the Cash/VIP topic specifically) — same reasoning |

This classification is this audit's own view layered on top of the
existing tool-generated `priority` field — it does not overwrite
`transcript-inventory.json` (that file is generator-owned, per
`knowledge-sweep.md`'s "prefer `--write` generators over hand-editing"
rule).

## Community source classified out-of-scope

`Research/YouTube/eusantiago/transcripts/qJ6Xp6o51C8.pt.json` — describes a
real-money WCoin purchase with an account-level cap, but on a RealMU
-affiliated server, not Blood Moon. Kept as `COMMUNITY_TUTORIAL`/
`PROVIDER_SPECIFIC_OTHER_SERVER` terminology corroboration only, per
`docs/knowledge/source-authority.md`'s existing rule — never treated as
Blood-Moon-specific evidence.
