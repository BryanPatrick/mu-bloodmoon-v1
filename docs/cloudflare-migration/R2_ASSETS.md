---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-22
---

# R2 asset inventory (candidates only — nothing uploaded)

Inventory only, per the brief. No bulk upload has happened. Sizes are
from the actual `apps/web/public/` tree this phase, in the checked-out
worktree.

| Category | Classification | What it is | Size (as inventoried) | Notes |
|---|---|---|---|---|
| `public/images/` | `PUBLIC_IMMUTABLE` | Hero art, equipment renders, UI images shipped with the build | 88 MB, 2781 files | Same-name files change on redeploy rather than being content-hashed — treat each as replaceable-on-deploy, not truly immutable per-version, unless a future rename-to-hash scheme is adopted |
| `public/dev-references/` | `PUBLIC_IMMUTABLE` | Despite the folder name, these are real, currently-linked wiki reference images (`pages/wiki.vue` references dozens of them directly) — not developer-only scratch files | 42 MB, 388 files | Misleading name inherited from the existing codebase, not renamed this phase — out of scope for this inventory pass |
| Launcher download (`BloodMoonLauncher.zip`) | `LAUNCHER_DOWNLOAD` | Built by `npm run launcher:build`/`launcher:publish`, gitignored, served at the stable URL `/downloads/BloodMoonLauncher.zip` — **not present in this checkout** (build artifact, not source) | unknown until a real build is produced | `apps/web/public/downloads/README.md` documents the stable URL and local build origin path (`work/launcher/BloodMoonLauncher-v1.0.0-win-x64.zip`) |
| Community media uploads | `USER_UPLOAD` | Player-submitted post/profile images — local disk by default (`COMMUNITY_MEDIA_DIR`), **already R2-capable in code** (`MEDIA_STORAGE_PROVIDER=r2`, `apps/api/src/modules/media/storage/media-storage.service.ts`) | unknown — not counted this phase (lives on the production host, not this worktree) | Whether production currently runs local or R2 mode is **unconfirmed** — see `RISKS.md`. If already R2, this row is largely done; if not, it's the lowest-effort real R2 migration available (code exists, only the deploy flag + a one-time data copy remain) |
| Guild media uploads | `USER_UPLOAD` | Same pattern as community media (`GUILD_MEDIA_DIR`) | unknown | same as above |
| Database backups (`bloodmoon-backup.sh` output) | `BACKUP_DO_NOT_MOVE_PUBLICLY` | MySQL dumps + mutable-asset archives | unknown (lives on the cPanel host) | Backups are exactly the category that must **never** land in a public R2 bucket — if a future phase moves backup storage to R2 at all, it must be a private bucket with its own access control, never the same bucket/prefix as public assets |
| Test/scratch images referenced in wiki content (`dev-references/generated/...`) | `PUBLIC_MUTABLE` | Draft/iteration art (filenames like `*-draft-v2.png`) mixed into the same public folder as finished assets | included in the 42 MB above | Worth a future cleanup pass before any bulk R2 upload, so drafts aren't preserved indefinitely in a CDN-cached public bucket — not done this phase, not urgent |
| Favicons/app icons | `PUBLIC_IMMUTABLE` | `favicon.ico`, `favicon.png`, `favicon.svg` | small (KB range) | Already correctly served by both the current Node deploy and the Cloudflare Workers Assets path this phase's build produced |

## Direction (decided 2026-09-22, Phase CF-01B)

R2 should become durable storage for public images, wiki assets,
user/community media, and launcher/download assets where appropriate
(`DECISIONS.md`). This is a direction, not a schedule — **no
upload/migration has happened**, and the granular next step is
`CF-R2-01` (`MIGRATION_ROADMAP.md`): inventory (this document) plus a
first real shadow migration of one asset set, not a bulk/production
cutover.

This direction also now has an **API-runtime dependency**, not just a
web-asset one: Cloudflare Containers' disk is ephemeral
(`API_MIGRATION.md`), so community/guild media and launcher assets
must move off local disk before the API container can safely scale,
sleep, or run more than one instance — see `RISKS.md` CF-R12.

## What `CF-R2-01` will need to decide, not answered here

- Whether to content-hash filenames on upload (true immutability +
  long cache lifetimes) versus keeping current human-readable names.
- Whether community/guild uploads move to R2 ahead of or alongside the
  API's own Container migration — they're independent in principle (R2
  is reachable from the current Node API too, since the code path
  already exists), but the Container ephemeral-disk constraint above
  makes moving them first the lower-risk order.
- Cache/purge strategy for images that do change (equipment art
  revisions have happened before, per the `*-draft-v2` naming already
  observed).
