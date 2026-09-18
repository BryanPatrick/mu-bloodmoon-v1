---
status: ACTIVE
category: knowledge
audience: internal (product + engineering)
lastVerified: 2026-09-18
---

# Source registry

Every knowledge-bearing system/location Blood Moon actually has, with real
counts pulled from each system directly (2026-09-18). This is an index of
*systems*, not a copy of their content — each row points at the real data.

## Knowledge Hub (Cloudflare D1, production, `akh` CLI, project slug `bloodmoon`)

Queried read-only via `akh knowledge list`/`akh source list` against the live
Worker (`https://ai-knowledge-hub.bryanelrick22.workers.dev`) — GET-only, no
mutation.

| Table | Count | Notes |
|---|---|---|
| `knowledge_items` | 64 total (62 active, 2 archived) | All `confidence: high`. `verification_status`: 59 verified, 3 unverified. Types: discovery 20, observation 18, risk 15, procedure 7, requirement 1, reference 1 |
| `sources` | 7, all `active`, all `trust_level: internal` | Types: api 1, artifact 2, database 1, game_server 1, repository 1, website 1 — see table below |
| Source linkage | 20/62 active knowledge items have a `source_id` FK; 42 do not, though several of those still carry a `source_reference` file-path string instead | Not "42 orphaned" — most have SOME provenance, just not the structured FK |

### The 7 registered Hub sources

| Slug | Type | Description | Environment |
|---|---|---|---|
| `bloodmoon-client-and-launcher` | artifact | Season 6 client + updatable launcher (manifest, hashes, staging, rollback) | development |
| `bloodmoon-legacy-web-backup` | artifact | "Backup of the legacy PHP CMS and its technical data, preserved as internal reference and migration source, not as target architecture" — this is `hostbr-web-20260716`, see `LEGACY_SUPPLIER_INDEX.md` | backup |
| `bloodmoon-public-website` | website | `https://mubloodmoon.com.br` | production |
| `bloodmoon-portal-api` | api | The NestJS portal API | development |
| `bloodmoon-game-database-backup` | database | The SQL Server game DB backup, ~140 tables incl. accounts/characters/guilds/events/cash shop/rankings | backup |
| `bloodmoon-game-server-backup` | game_server | MuServer Windows backup, catalogued 2026-07-16 | backup |
| `bloodmoon-main-repository` | repository | `github.com/BryanPatrick/mu-bloodmoon-v1` | development |

No `LEGACY_SUPPLIER_SOURCE`/`VENDOR_MANUAL`/`YOUTUBE_TUTORIAL`/`COMMUNITY_GUIDE`
type exists among the Hub's 7 sources — the Hub currently only models Blood
Moon's own systems, not external vendor/community material. All the
vendor/video/tutorial provenance modeling lives in the separate
`knowledge/vendor-sweep/` system below, not in the Hub. This is a real,
current architectural split (see `KNOWLEDGE_MASTER_INDEX.md`'s
"Knowledge Hub vs. repository docs vs. raw archives" section) — not a gap.

## Vendor knowledge sweep (`mu-bloodmoon-v1/knowledge/vendor-sweep/`)

Real tooling (`scripts/knowledge-*.mjs`), not a static export. Current state,
queried directly this phase:

| Metric | Count |
|---|---|
| Cataloged sources (`knowledge-index.json`) | **44** (41 before Phase 18D; +KI-042/043/044) |
| Atomic claims | **138** (99 before Phase 18D; +CLAIM-100..124 in 18D; +CLAIM-125..138 in Phase 20), of which 84 are canonical facts (`CONFIRMED_BY_*`) |
| project-gamers-oficial videos tracked | 108 (42 with a KI entry and claims; 66 pure RAW) |
| Verification queue | 70 items: 49 DONE, 5 QUEUED, 16 BLOCKED |
| Wiki candidates | 4 (all `systems`/`guides` category, none promoted) |
| Reference gaps tracked | 6 (5 `RESOLVED`, 1 `PARTIAL`) |

See `docs/knowledge/knowledge-sweep.md` for the methodology (not duplicated
here) and `TOPIC_COVERAGE.md` for per-topic breakdown.

### Per-source registry fields (Phase 18D) — sources touched this phase

`knowledge-index.json` is the machine-readable per-source registry (one entry
per `KI-*` id, ids unique — checked by `validate.mjs`). Its older entries carry
`id, title, sourceType, sourceAuthority, category, season, provider,
rawArtifact, tags, entities, capturedAt, sourceDate, confidence, status`; they
do **not** record a local file hash, `last_verified`, or a channel. The three
sources below were registered with the full field set:

| source_id | title | source_type | location | authority | status | version / context | hash_if_local (sha256) | last_verified | topics |
|---|---|---|---|---|---|---|---|---|---|
| `KI-042` | Custom Buy Vip — in-game VIP purchase button | `YOUTUBE_VIDEO` (`gqtSk1pdti4`, ProjectGamers Developers) | `Research/YouTube/project-gamers-oficial/transcripts/gqtSk1pdti4.pt.json` | `PROVIDER_TUTORIAL` | `BLOODMOON_LIKELY` | vendor ADDED 8.3 (2024-12-17); demo Season 6.17 | `4d6d90f18fe94fb15c956323cbec6a05c9298c1f8421e6cf216a4668b3194852` | 2026-09-18 | buy_vip, vip, cash, wcoin, game_currency |
| `KI-043` | Command Buy Vip Check User — already-VIP stacking fix | `YOUTUBE_VIDEO` (`Jia1TrtgZfY`) | `…/transcripts/Jia1TrtgZfY.pt.json` | `PROVIDER_TUTORIAL` | `BLOODMOON_LIKELY` | vendor UPDATED 8.2 (2024-11-04); no season stated | `a6674904b86497a46b1780f2da734de542a110af01d0fefdec88abf61d0c35ea` | 2026-09-18 | buy_vip, vip, check-user, bugfix |
| `KI-044` | Custom Buy Vip And Coin — item-purchase reward engine, skill delivery | `YOUTUBE_VIDEO` (`XUeN6U74zME`) | `…/transcripts/XUeN6U74zME.pt.json` | `PROVIDER_TUTORIAL` | `BLOODMOON_LIKELY` | vendor UPDATED 7.7 (2023-10-19); demo Season 4.6 | `49882833c16ca9edb0013c0146763061c73331ff713db8df54b3321453a58b10` | 2026-09-18 | custom_buy_vip_and_coin, vip, coin, npc, skill-delivery |

~~"SOURCE_REGISTRY_NORMALIZED = YES (it already contained the requested fields)"~~
**(18D correction of the Phase 18C report)**: that was overstated. This file is
a system-level index; per-source hashes, `last_verified` and channel were
recorded for these three sources only. Backfilling the other 41 vendor-sweep
sources and the raw-archive rows is **not** done — it is tracked as
`KNOWLEDGE_GAPS.md` GAP-P18-13.

## Repository documentation (`mu-bloodmoon-v1/docs/`, git-tracked, curated)

Not exhaustively re-counted here (it is the day-to-day working corpus, not a
static registry) — `context/SOURCE_INDEX.md` and `context/REPOSITORY_KNOWLEDGE_MAP.md`
already do this job and are the canonical pointer. Specific subsets
relevant to this audit: `docs/economy/` (9 files, the legacy Cash/XShop/CashShop
investigation), `context/ADR_INDEX.md` (30 ADRs, 9 `main`-tracked/`CANONICAL_DECISION`,
21 preserved-only/`HISTORICAL_SOURCE`), `docs/knowledge/` (7 methodology docs
including this one).

## Raw preservation archives (outside git, `D:\MU\**`)

| Location | Content | Confidence |
|---|---|---|
| `D:\MU\Deploy\Cpanel-Backups\hostbr-web-20260716\` | Legacy website full PHP source + assets, 9,099 files | CONFIRMED, SHA256-verified |
| `D:\MU\Deploy\Launcher-Research\20260722\` | Decompiled launcher/patch-generator, 63 files | CONFIRMED |
| `D:\MU\Deploy\Predeploy-Snapshots\` | 2 dated snapshot sets incl. a full `MuServer-stage` tree (~2.0GB) | CONFIRMED (inventoried) |
| `D:\MU\Database\Production-Backups\` | Blood Moon's own real production DB backup series, SHA256SUMS/manifests | CONFIRMED |
| `D:\MU\Research\Vendor\Tutorials\` | 48 vendor tutorial files, hash-verified | CONFIRMED |
| `D:\MU\Research\YouTube\project-gamers-oficial\` | Vendor channel video/transcript captures | CONFIRMED, partial (see `VIDEO_SOURCES.md`) |
| `D:\MU\Research\YouTube\eusantiago\` | Community (non-vendor, RealMU-affiliated) channel captures | CONFIRMED, out-of-scope-classified |
| `D:\MU\Knowledge\Systems\` | 4 active Blood-Moon-confirmed operational systems (fake-online, GM commands, drop rate, monster spawn) | CONFIRMED |
| `D:\MU\catalog\vps-inventory.json` | Full VPS filesystem inventory | CONFIRMED |
| `D:\MU\MU-Client\` | Client archives (3 zips + 1 rar), extracted copies, launcher archives | CONFIRMED (inventoried, not deep-audited this phase) |
| `D:\MU\MU-Server\` | `Current`, `Database\pre-web-migration-20260716-095739`, `Lab\drop-validation` | CONFIRMED (inventoried, not deep-audited this phase) |
| `D:\MU\BloodMoonBackups\*` | **Empty on this machine** | GAP — see `KNOWLEDGE_GAPS.md` GAP-P18-06 |

## Duplicate/fragmented sources found

- `mu-bloodmoon-legacy-catalog` (separate worktree) carries a **stale,
  smaller** copy of `docs/economy/` — see `KNOWLEDGE_GAPS.md` GAP-P18-04.
  Not deleted (per instruction), flagged as a relationship, not merged.
- `Research/Vendor/Tutorials/manifest.json` (hash-verification pass) and
  the older `Tutorials_copy_results.json` (raw SCP transfer log) both
  describe the same 48-file copy operation with different framing (46/48
  vs. 48/48) — not a conflict, a two-stage record of the same real event
  (see `VPS_DOCUMENTATION_INDEX.md`).
