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
| CF-R3 | Prisma-on-native-Workers viability (driver adapters vs. native engine) for this project's actual schema/query patterns | Directly decides whether native Workers (the `FUTURE_OPTIMIZATION` path) is realistic at all — no longer blocks the *initial* migration, since Containers was chosen precisely to avoid this dependency | OPEN, lower urgency — the concurrent feasibility report (`docs/cloudflare-api-feasibility.md`) analyzed this in detail (engine-less Prisma GA only in 6.16, Hyperdrive MySQL support GA with `mysql2` 3.13+) but did not spike it against this project's real queries; see `API_MIGRATION.md` |
| CF-R4 | Cloudflare Containers scope for this account | Current OAuth token lacks `containers:write`; the container proof itself has not been run. ~~Docker/Podman/nerdctl unavailable in the investigating environment~~ — **correction, Phase CF-R2-01 (2026-09-22):** local container tooling is no longer the planned path; the approved direction is `CF-API-02R`, running the proof via Cloudflare's own remote build (Workers Builds), which sidesteps the local-tooling gap entirely. The `containers:write` scope gap is still real and still open | OPEN, **now the critical-path item** — `CF-API-02R` (renamed from `CF-API-02` this phase, `MIGRATION_ROADMAP.md`) exists specifically to close this |
| ~~CF-R5~~ | ~~Isolated MySQL restore proof~~ | — | **RESOLVED 2026-09-22, Phase CF-DB-01** — real restore + integrity + Prisma + financial-semantics proof against a wholly disposable MySQL 8.0.46 instance, no elevated production access used. See `PHASE_STATUS.md`/`CF-DB-01-REPORT.md` |
| CF-R13 | Restore proof only covers a same-major-version *local* MySQL 8.0 target, not any specific *external* vendor's network path/exact version/backup tooling | The CF-DB-01 closure doesn't transfer automatically to whichever vendor is eventually chosen | OPEN — repeat the same proven method (`apps/api/scripts/verify-disposable-restore-prisma.mjs` reusable) once a vendor is selected |
| CF-R14 | PlanetScale (one of the 5 shortlisted database candidates) does not support `GET_LOCK`/`RELEASE_LOCK` through Vitess's VTGate — confirmed this phase via PlanetScale's own GitHub discussion and a tracked Vitess issue | Directly conflicts with the 5 `apps/api` services using connection-scoped named locks today; would require redesigning those locks before PlanetScale is viable | OPEN — not a blocker unless PlanetScale specifically is chosen; `DATABASE_MIGRATION.md`/`CF-DB-01-REPORT.md` |
| CF-R6 | In-memory abuse-protection state (`AuthRateLimitService`, `Http5xxBurstDetector`) survives fine under Containers (a long-running process, same as today) but would need a real redesign under a future native-Workers move | Real correctness/security regression only if the `FUTURE_OPTIMIZATION` path is ever pursued without a replacement design — not a blocker for the chosen Containers path | OPEN, low urgency now that Containers is the initial target; see `API_MIGRATION.md` |
| CF-R11 | Five `GET_LOCK`/`RELEASE_LOCK` connection-scoped locking flows and 24 `$transaction` files (1 Serializable) have not been re-proven against a Cloudflare-Containers-*connected* database path | Financial-correctness risk if a future database/runtime move changes connection-pooling behavior without re-validating exact lock/transaction semantics | PARTIALLY ADDRESSED (2026-09-22, `CF-DB-01`) — Serializable/rollback, real concurrent unique-key idempotency, and real two-session `GET_LOCK`/`RELEASE_LOCK` mutual exclusion all proven against a disposable MySQL 8.0.46 instance. **Still open**: proof against the actual chosen external vendor + through an actual Cloudflare Container's connection path (not yet built, `CF-API-02R`) |
| CF-R12 | Container disk is ephemeral; local media/launcher/guild assets currently read from local disk in `apps/api` | Containers cannot safely scale-to-zero, sleep, or run more than one instance until this moves to R2 | OPEN — same underlying work as `CF-R2-01`/`R2_ASSETS.md`'s user-upload rows, now also an API-runtime dependency, not just a web-asset one |
| CF-R7 | `public/dev-references`' misleading name plus mixed draft/finished content | Low severity — a documentation/housekeeping item, not a functional risk; noted so a future R2 upload doesn't blindly publish drafts | OPEN, low priority |
| CF-R8 | Wrangler version skew (this monorepo pins `3.114.17` via the existing Game Data Worker; latest is `4.136.2`) | The `cloudflare-module` preset and this phase's testing both used the older, already-pinned version — behavior on `4.x` not verified | OPEN, low priority — matches the existing project convention, not a new problem introduced this phase |
| CF-R9 | Production API CORS does not currently allow the shadow Worker's origin (confirmed via a read-only preflight this phase) | Real `fetch` calls from the shadow deploy to the real API fail client-side until `WEB_PUBLIC_URLS` is updated and the API restarted | OPEN — `SHADOW_PRODUCTION_API_CORS = BLOCKED_PENDING_BRYAN_AUTHORIZATION` (explicit decision, Phase CF-01B, `DECISIONS.md`); fix identified (one env value + a controlled restart), deliberately not applied |
| CF-R10 | `node:crypto` is the only Node API `apps/web` needs; broader Node API usage was checked only in `apps/web`, not in `apps/api` (see `CURRENT_STATE.md`'s apps/api table, sourced from the concurrent feasibility report) | Low impact now that Containers (full Node runtime) is the chosen initial API target — the Node-API-compatibility question only becomes sharp again if/when the `FUTURE_OPTIMIZATION` native-Workers path is pursued | OPEN, low urgency, deferred indefinitely unless native Workers is revisited |

## Resolved this phase (moved out of "open," kept here for traceability)

- ~~Whether Nitro's `render:response` hook (Phase 17R's CSP hash
  mechanism) fires the same way under the Cloudflare preset~~ —
  **verified yes**, identically, under both Miniflare and the real
  Cloudflare edge. See `WEB_MIGRATION.md`.
