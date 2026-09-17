---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-17
---

# Infrastructure inventory

Real identifiers only — no secret values. See `GOVERNANCE.md`'s security
classification (everything below is `INTERNAL` or `SECRET_REFERENCE_ONLY`).

## Blood Moon hosting (cPanel, shared/LVE)

- `bmapi` = `/home/mubloodxz/bmapi` (api.mubloodmoon.com.br) — NestJS API.
- `bmweb` = `/home/mubloodxz/bmweb` (mubloodmoon.com.br) — Nuxt Portal.
- No SSH, no shell — browser-session-only deploy via cPanel's Node.js
  Selector + File Manager. Full procedure: `bloodmoon-deploy` skill
  (`~/.claude/skills/bloodmoon-deploy/`) and
  `docs/deployment-architecture.md`.
- MySQL/MariaDB production database, CloudLinux-patched MariaDB
  10.6.19. Migration discipline: `AGENTS.md` invariants 15/24.

## GameServer

- Real SQL Server, database `MuOnline`. Read/write boundary enforced via
  GameBridge — `docs/security/game-write-boundary.md`.
- Local lab environment exists (`bloodmoon_gameserver_lab`, 145 tables)
  for schema investigation without touching production.

## Knowledge Hub (separate repository, `D:\MU\hub`)

| Environment | Worker | D1 database | D1 ID |
|---|---|---|---|
| Production | `ai-knowledge-hub` | `ai-knowledge-hub-db` | `b6280c0c-dcb6-43bc-b79d-8b2faa62cff7` |
| Staging | `ai-knowledge-hub-staging` | `ai-knowledge-hub-db-staging` | `3f0cce11-3ae5-48e6-a259-1c1377ed059e` |

- Staging URL: `https://ai-knowledge-hub-staging.bryanelrick22.workers.dev`.
- Production URL: `https://ai-knowledge-hub.bryanelrick22.workers.dev`.
- Config: `wrangler.jsonc` (production), `wrangler.staging.jsonc`
  (staging) — both committed in `D:\MU\hub`.
- **Never** point a staging API key at production or vice versa — keys
  are per-database `key_hash` rows, not portable by construction.

## Worktree sprawl (a real, unresolved fact, not a recommendation)

`D:\MU\` contains dozens of `mu-bloodmoon-*` worktrees. This Context
Pack lives in `mu-bloodmoon-v1` because that is the confirmed canonical
primary worktree (clean `main`, most current commit seen this session).
Other worktrees hold real, uncommitted, or unmerged work this pack does
not attempt to inventory — see `docs/architecture/branch-and-release-governance.md`
for the existing recovery/classification process if that's ever needed.
