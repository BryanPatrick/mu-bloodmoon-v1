# Game Data

`apps/api`'s sole server-to-server consumer of the Blood Moon Game Data
Worker (`apps/game-data-worker`). Part of the Game Data Platform Phase 1 —
see `docs/game-data/architecture.md`.

- `GameDataClient` signs and sends requests to the Worker's
  `GET /internal/state/status` endpoint (api-read HMAC scope, distinct from
  the GameBridge Agent's write scope). It never throws to its caller and
  makes zero filesystem writes — any failure mode (platform not configured,
  network error, malformed response) resolves to
  `{ bridgeStatus: 'UNKNOWN', lastHeartbeatAt: null }`, never a crash and
  never fabricated data.
- `GET /admin/game-data/status` is a platform diagnostic, not a public Game
  Data API: real `JwtAuthGuard`/`RolesGuard`/`PermissionsGuard`, the
  dedicated `admin.game-data.view` permission, and a response that never
  includes the Worker URL, HMAC secrets, or any SQL detail. Not exposed to
  the public portal, the home page, or the launcher.

Configuration (`GAME_DATA_WORKER_URL`, `GAME_DATA_API_READ_SECRET`) comes
from the platform's own env-var mechanism — never committed, never asked
for in chat. Absent configuration is a normal, safe state, not an error.

Web and Launcher never talk to the Game Data Worker or the GameBridge Agent
directly — `apps/api` remains the single product authority, unchanged from
the rest of the portal.
