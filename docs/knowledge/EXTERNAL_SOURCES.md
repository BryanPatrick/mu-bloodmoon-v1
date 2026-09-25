---
status: ACTIVE
category: knowledge
audience: internal (product + engineering)
lastVerified: 2026-09-18
---

# External sources

Every external (non-repo, non-Hub) website/URL referenced anywhere in
`mu-bloodmoon-v1/docs/` and `context/`, found by a corpus-wide domain grep
this phase.

| Domain | References | Role | Locally preserved? | Current relevance |
|---|---|---|---|---|
| `mubloodmoon.com.br` / `api.mubloodmoon.com.br` | 17 combined | Blood Moon's own production site/API | N/A — it's the live system, not an external source | LIVE |
| `github.com/BryanPatrick/mu-bloodmoon-v1` | via Hub source registry | Main repository | N/A — this is the repo itself | LIVE |
| `github.com/pulseP1986/free-mu-cms` | 1+ (in preserved PHP source headers) | Legacy CMS package origin, package `pulsep1986/free-mu-cms` v1.2.4 | Full source preserved (`hostbr-web-20260716`), not the upstream repo itself | HISTORICAL — package used, not upstream-tracked |
| `guiamu.com.ar` (GuiaMU Online) | 1+ | Public Argentine MU strategy-guide site — NOT the vendor | Partial: 4 HTML pages scraped into `mu-bloodmoon-legacy-catalog/work/` | COMMUNITY_GUIDE, low priority |
| `muonline.webzen.com` | 1 | Official Webzen (original MU Online IP holder) reference | REMOTE_ONLY | Background/legal context only |
| `youtube.com/@projectgamersoficial` | many | Vendor's official tutorial channel | Partial — see `VIDEO_SOURCES.md` | HIGH — primary vendor knowledge source |
| `youtube.com/@EuSanTiago` | 3 videos referenced | Community, RealMU-affiliated | Partial (1/3 transcribed) | LOW — different server, terminology reference only |
| `mercadopago.com.br` / `api.mercadopago.com` | 2 | Current payment gateway (Portal's own, not legacy) | N/A — API integration, not a content source | LIVE — current system |
| `dot.net` / `go.microsoft.com` / `download.microsoft.com` | 5 | .NET/launcher tooling references | N/A | Background/tooling reference |
| `developers.cloudflare.com` | 2 | Platform docs (Workers/D1) for the Knowledge Hub | N/A | Background/tooling reference |
| `ai-knowledge-hub*.workers.dev` | 2 | The Knowledge Hub itself | N/A — it's the live system | LIVE |
| `bloodmoon-game-data-worker.*.workers.dev` | 1 | Game Data Platform worker (separate phase, see the standing plan) | N/A | LIVE (scaffolding) |

## Classification

Per `docs/knowledge/source-authority.md`'s existing authority scale — not
reproduced here. All entries above map cleanly onto that scale;
`guiamu.com.ar`/`@EuSanTiago` = `COMMUNITY_TUTORIAL`, `pulseP1986/free-mu-cms`
and `@projectgamersoficial` = `PROVIDER_DOCUMENTATION`/`PROVIDER_TUTORIAL`,
everything else is either `INTERNAL` (Blood Moon's own live systems) or
background tooling references with no knowledge-authority weight.

## Dead/stale link check

Not performed this phase (would require live HTTP requests to each URL,
out of this phase's read-only-filesystem scope). All external URLs above
are recorded, none verified live/dead this session — see `KNOWLEDGE_GAPS.md`
if a future phase wants to formally check LIVE/REDIRECTED/DEAD status.

## Coverage summary

No high-value external website was found reachable-only-remotely with zero
local copy. The one partial case (`guiamu.com.ar`, 4 pages of an unknown
larger site) is a low-authority community guide, not vendor-critical —
not flagged for urgent preservation.
