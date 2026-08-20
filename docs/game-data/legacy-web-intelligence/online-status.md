# Online status — legacy evidence

Four distinct concepts, all real, and all kept **deliberately separate**
here — exactly the discipline `docs/game-data/architecture.md`'s heartbeat
section already established for Phase 1 (bridge heartbeat ≠ game server
status). Three of the four share one underlying table; the fourth doesn't
touch the database at all.

| # | Concept | Source | Query / mechanism |
|---|---|---|---|
| 1 | **Account online** (gate before a mutation) | `MEMB_STAT.ConnectStat`, keyed by `memb___id` | `SELECT ConnectStat FROM MEMB_STAT WHERE memb___id = :user` — `true` only if `ConnectStat == 0`. Used to **block** self-service warehouse actions and AdminCP item edits while the account is logged into the game. |
| 2 | **Character online** (as shown in AdminCP Character Manager) | Same `MEMB_STAT.ConnectStat`, resolved via the character's owning account | Not a true per-character flag — MU only tracks connection at the account level. The admin UI relabels the account's status against each of the account's characters, plus shows `IP`/`ServerName`. |
| 3 | **Players online COUNT** (public homepage widget, admin dashboard) | Same table, aggregated | `SELECT COUNT(*) AS count FROM MEMB_STAT WHERE ConnectStat = 1 [+ server filter]`, cached 60–120s. A genuine live SQL query, briefly cached — not a static number. |
| 4 | **Game-server node online/offline** | **Not the database at all** | `helper.website.php::check_server_status()`: a live **TCP connect probe**, `@fsockopen($ip, $port, ...)` against each configured game server, cached 120s. If the socket opens, it also runs the same `ConnectStat=1` COUNT to compute a load percentage against `max_players`. |

**Separately, not a live check of anything:** `main_conf.xml`'s
`<maintenance>0</maintenance>` flag, read via `config_entry('main|maintenance')`,
forces a 503 maintenance page. This is a manually admin-edited setting with
zero relationship to whether the game server is actually reachable — it
must not be conflated with concept #4. This is precisely the same
manual-vs-live distinction the portal's own home page already handles
correctly (`launcher.service.ts`'s `statusSource: MANUAL/LIVE/UNKNOWN`,
shipped in the Global Portal Audit's P1.2 fix) — the legacy app just never
made that distinction explicit in its own naming.

## Confirms one thing indirectly

Two stored procedures offered (but not called) by the legacy app's
setup/upgrade routine — `WZ_CONNECT_MEMB` / `WZ_DISCONNECT_MEMB` — are the
likely mechanism that actually flips `MEMB_STAT.ConnectStat` on real
login/logout, invoked by the **game server**/connect-server process, not
the PHP web app. No call site in the web app itself execs them; the web
app only ever reads `ConnectStat`. See `stored-procedures.md`.

## Cross-reference against `docs/game-data/schema/`

Entirely **NEW_LEGACY_EVIDENCE** — `MEMB_STAT` did not previously exist in
the schema catalog. This directly informs Phase E's `BRIDGE_HEALTHY/STALE/
OFFLINE` vs `GAME_SERVER_STATUS` separation: a future real online-status
feature would read `MEMB_STAT.ConnectStat`, which is a completely
different signal from GameBridge Agent connectivity heartbeat, and neither
should ever stand in for the other.
