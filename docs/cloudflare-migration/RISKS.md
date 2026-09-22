---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-22
---

# Open risks and unknowns

One row per item. Move a row to `PHASE_STATUS.md` once actually
resolved — this file stays a list of what's still open.

| ID | Risk/unknown | Impact | Status |
|---|---|---|---|
| CF-R1 | Whether production's `MEDIA_STORAGE_PROVIDER` is currently `local` or `r2` | Changes how much work `R2_ASSETS.md`'s user-upload rows actually need — unconfirmed this phase | OPEN |
| CF-R2 | Registrar/DNS zone-editor control for `mubloodmoon.com.br` | Blocks Phase 7 planning detail until known; does not block Phases 1–6 | OPEN — see `DNS_AND_DOMAIN.md` |
| CF-R3 | Prisma-on-native-Workers viability (driver adapters vs. native engine) for this project's actual schema/query patterns | Directly decides whether API Option A (native Workers) is realistic at all | OPEN — not spiked this phase, see `API_MIGRATION.md` |
| CF-R4 | Cloudflare Containers scope for this account | Current OAuth token lacks `containers:write`; unknown what else Containers provisioning would require | OPEN |
| CF-R5 | Isolated MySQL restore proof (Phase 17R's own P1, carried forward) | Cannot fully trust the backup story until a real restore is proven; blocks Phase 5/6 entry criteria | OPEN — needs a disposable MySQL with `CREATE DATABASE`, not elevated production access |
| CF-R6 | In-memory abuse-protection state (`AuthRateLimitService`, `Http5xxBurstDetector`) doesn't survive Workers' per-request isolate model | Real correctness/security regression if Option A is chosen without a replacement design | OPEN — see `API_MIGRATION.md` |
| CF-R7 | `public/dev-references`' misleading name plus mixed draft/finished content | Low severity — a documentation/housekeeping item, not a functional risk; noted so a future R2 upload doesn't blindly publish drafts | OPEN, low priority |
| CF-R8 | Wrangler version skew (this monorepo pins `3.114.17` via the existing Game Data Worker; latest is `4.136.2`) | The `cloudflare-module` preset and this phase's testing both used the older, already-pinned version — behavior on `4.x` not verified | OPEN, low priority — matches the existing project convention, not a new problem introduced this phase |
| CF-R9 | Production API CORS does not currently allow the shadow Worker's origin (confirmed via a read-only preflight this phase) | Real `fetch` calls from the shadow deploy to the real API fail client-side until `WEB_PUBLIC_URLS` is updated and the API restarted | OPEN — fix identified, not applied without authorization; see `DECISIONS.md` |
| CF-R10 | `node:crypto` is the only Node API `apps/web` needs; broader Node API usage was checked only in `apps/web`, not yet in whatever the eventual API runtime choice needs | Low impact for Phase 1 (already resolved); real scope-check needed again once Phase 4 picks an API runtime | OPEN, deferred to Phase 4 |

## Resolved this phase (moved out of "open," kept here for traceability)

- ~~Whether Nitro's `render:response` hook (Phase 17R's CSP hash
  mechanism) fires the same way under the Cloudflare preset~~ —
  **verified yes**, identically, under both Miniflare and the real
  Cloudflare edge. See `WEB_MIGRATION.md`.
