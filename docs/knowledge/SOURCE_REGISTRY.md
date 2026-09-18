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
| Cataloged sources (`knowledge-index.json`) | 41 |
| Atomic claims | ~99 (highest claim ID: CLAIM-098/099-range) |
| project-gamers-oficial videos tracked | 108 |
| Wiki candidates | 4 (all `systems`/`guides` category, none promoted) |
| Reference gaps tracked | 6 (5 `RESOLVED`, 1 `PARTIAL`) |

See `docs/knowledge/knowledge-sweep.md` for the methodology (not duplicated
here) and `TOPIC_COVERAGE.md` for per-topic breakdown.

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
