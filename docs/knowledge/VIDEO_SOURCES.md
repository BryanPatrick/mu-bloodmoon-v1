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

Counts below were derived from the generators' own output on 2026-09-18
(`transcript-inventory.json`, `provenance-report.json`) after Phase 18D — do not
hand-maintain them; re-run `node scripts/knowledge-transcript-inventory.mjs` and
`node scripts/knowledge-provenance-report.mjs --write` for a fresh count.

| Processing level | Videos (of 108) | Note |
|---|---|---|
| Transcript captured (RAW) | **108** | `rawTranscriptStatus: CAPTURED` for all 108 |
| Read and claims extracted | **42** | 39 before this phase + the 3 priority videos. Every extraction to date is agent-authored by reading the transcript — the sweep has no automated extractor |
| Registered in the machine artifacts (KI entry + claims, generators re-run) | **42** | equals the row above by construction; the 3 new ones are KI-042/043/044 |
| Has a normalized human-readable artifact | 15 complete + 3 partial (of the 44 indexed sources) | includes the 3 priority videos via `CASH_VIP_INTEGRATION_MAP.md` |
| Fully structured (all six provenance stages `COMPLETE`) | **0** (of 44 indexed sources) | `VERIFICATION` and `WIKI` are intentionally incomplete for most; the 3 priority videos are `RAW/NORMALIZED/CLAIMS/GRAPH` complete, `VERIFICATION` partial, `WIKI` missing |
| Still pure RAW (no KI entry) | **66** | 27 P0, 11 P1, 16 P2, 12 P3 |
| `TRANSCRIPT_NOT_AVAILABLE` (no captions ever generated) | tracked per video in `failure-manifest.json` | not re-derived here |

~~"9 videos reached `knowledge-index.json`"~~ **(18D correction)**: that earlier
figure only counted the `KI-001..009` range; 39 videos already had extracted
claims before Phase 18C.

## The 3 priority videos — read (18C) and registered (18D, 2026-09-18)

Full structured metadata (Phase 18D Part 3). `source_id` is the
`knowledge-index.json` id; channel for all three: **ProjectGamers Developers**
(`@projectgamersoficial`), `source_type` `YOUTUBE_VIDEO`, authority
`PROVIDER_TUTORIAL`, status `BLOODMOON_LIKELY`, `last_verified` 2026-09-18,
transcripts YouTube auto-generated `pt-BR` (ASR, some garbling).

| source_id | video_id | Title | Version / context | Topic | Transcript location (sha256) | Claims |
|---|---|---|---|---|---|---|
| `KI-042` | `gqtSk1pdti4` | Custom Buy Vip — ADDED 8.3 (2024-12-17) | vendor 8.3; demo on Season 6.17 | in-game VIP purchase button; SHOP/CURRENCY | `Research/YouTube/project-gamers-oficial/transcripts/gqtSk1pdti4.pt.json` (`4d6d90f18fe9…`) | CLAIM-100, 102-106, 109, 110 |
| `KI-043` | `Jia1TrtgZfY` | Command Buy Vip Check User — UPDATED 8.2 (2024-11-04) | vendor 8.2; no season stated; precedes KI-042 | already-VIP stacking-bug fix; COMMAND/CURRENCY | `…/transcripts/Jia1TrtgZfY.pt.json` (`a6674904b864…`) | CLAIM-100, 103, 105-108 |
| `KI-044` | `XUeN6U74zME` | Custom Buy Vip And Coin — UPDATED 7.7 (2023-10-19) | vendor 7.7; demo on Season 4.6 | item-triggered reward engine, skill delivery; SHOP/CONFIG | `…/transcripts/XUeN6U74zME.pt.json` (`49882833c16c…`) | CLAIM-111-117 |

(sha256 prefixes computed on 2026-09-18 from the preserved files; full hashes
in `SOURCE_REGISTRY.md`. An earlier draft of this table carried placeholder
prefixes that were never computed — caught and replaced with the real values
before commit.) Registered in the machine
artifacts by following `checkpoint.json`'s documented agent-authored pattern
(see `KNOWLEDGE_GAPS.md` GAP-P18-01b, now resolved), cross-checked by a blind
second extraction (`CASH_VIP_INTEGRATION_MAP.md` Part 7). Together they describe the vendor engine's native in-game purchase/spend
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
