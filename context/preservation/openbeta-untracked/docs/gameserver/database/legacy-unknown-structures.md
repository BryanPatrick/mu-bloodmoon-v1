---
status: LIVING_DOCUMENT
category: gameserver/database
audience: internal (engineering)
lastVerified: 2026-08-30
---

# GameServer database — legacy / unknown structures

The "DmN CMS": a previously-undocumented, third-party legacy web control
panel's own schema, living inside the same `MuOnline` database as the
real GameServer engine tables. 74+ tables carry the `DmN_` prefix
(CONFIRMED count from the real restored copy — see `database-overview.md`
for how this splits out of the 138-table total).

## Why "legacy" and "dormant" (CONFIRMED)

Every payment-gateway and marketplace table in this family was checked
for real rows in the restored snapshot and found **empty**:
`DmN_2CheckOut_Transactions`, `DmN_Donate_Transactions`,
`DmN_PagSeguro_Transactions`, `DmN_Market*`, `DmN_Vip_*`. This is strong,
direct evidence the panel this schema belonged to is no longer in active
use for financial transactions — not an assumption, a real `SELECT
COUNT(*)` result across every one of those tables during discovery.

## What it appears to be (STRONG_EVIDENCE)

A parallel, self-contained web admin/CMS panel bundled with (or sold
alongside) an older MU Online server distribution, providing:

- **Payment gateway integrations**: 2CheckOut, PagSeguro, Interkassa,
  PayCall, CuentaDigital — each with its own transaction-log table.
- **Its own VIP system** (`DmN_Vip_*`) — a second, independent VIP
  concept that predates and is unrelated to the Blood Moon Portal's own
  VIP tiers (`MEMB_INFO.AccountLevel`, GRANT_VIP/SYNC_VIP_TIER). Not
  wired into anything Blood Moon built.
- **Its own marketplace** (`DmN_Market*`) — separate from the real,
  active `CustomMarketShop` table documented in `economy-data-map.md`.
- **Referral and vote-reward tracking** (`DmN_Refferals`, vote-reward
  tables).
- **Admin/security audit logs** — `DmN_IP_Log`, `DmN_Admin_Logins`,
  `DmN_Account_Logs`, `DmN_GM_Logs` — the one sub-family that is **not**
  dormant: real rows exist for `DmN_IP_Log`/`DmN_Admin_Logins`
  referencing the same 4 known real accounts (`privacy-data-map.md`),
  meaning at least this logging piece may still be written by something
  live. `DmN_Account_Logs`/`DmN_GM_Logs` had 0 real rows in this
  snapshot.
- **Support tickets** (`DmN_Support_Tickets`/`DmN_Support_Replies`) — 0
  real rows.
- **Name-change history and ban list** (`DmN_ChangeName_History`,
  `DmN_Ban_List`) — 0 real rows in this snapshot; flagged
  `REVIEW_REQUIRED` in `privacy-data-map.md` in case a future snapshot
  has real data here.

## The one confirmed live coupling: `DmN_Update_Killer_Ranking` (STRONG_EVIDENCE)

The single real trigger in the database, named with the `DmN_` prefix but
firing on the very much live `Character` table (`views-triggers-functions.md`).
This means "the legacy CMS is dormant" cannot be stated as an absolute —
at minimum, one piece of its naming lineage (a killer/PvP ranking
mechanism) appears to still be wired into live character updates. Its
actual target table and logic were not read this round.

## Sensitive-shaped columns present but currently empty (REVIEW_REQUIRED if ever populated)

Catalogued in full in `privacy-data-map.md`: `payer_email` (three
different payment-transaction tables), `item_password` (`DmN_Market`),
`refferal_ip` (`DmN_Refferals`), `session_salt` (`DmN_User_Salts`),
`recipient_list` (`DmN_Bulk_Emails`), `email` (`DmN_Email_Confirmation`).
None were populated in the real snapshot, so none required sanitization
this round — but the sanitization script does **not** yet handle them,
and would need extending before any future, richer snapshot with real
rows in these specific tables could be safely sanitized.

## Phase K — complete DmN_* inventory and classification (2026-08-30)

A direct `sys.tables` count against the real restored copy found **75**
`DmN_`-prefixed tables (not 74 — the earlier count in
`docs/economy/legacy-dmn-cms-and-currency-investigation.md` was off by
one; reconciled here, that document is not being retroactively edited).
Zero `DmN_`-prefixed stored procedures, views, or functions exist —
`DmN_Update_Killer_Ranking` is the only `DmN_`-named object that is not a
table. This itself is a finding: whatever wrote to the populated DmN
tables did so via direct application-layer SQL (an external web panel
issuing `INSERT`s), never through a database-side procedure this
database still contains.

Classification taxonomy: `ACTIVE_CONFIRMED` (real, recent-looking rows
found), `ACTIVE_POSSIBLE` (real rows exist but activity can't be dated or
attributed with confidence), `READ_ONLY_LEGACY` (real catalog/reference
data present, no confirmed write path, plausibly still read by something
even if never written to), `DORMANT` (real table, zero rows, part of a
family where sibling tables also show zero real usage), `DEAD` (zero
rows and no plausible live path — e.g. payment gateways Blood Moon never
uses), `UNKNOWN` (insufficient evidence either way).

| Group | Tables (count) | Row evidence | Classification |
|---|---|---|---|
| Admin/session audit | `DmN_Admin_Logins` (7 rows, writer CONFIRMED — legacy panel's own `admin_login_attemt()`), `DmN_IP_Log` (19 rows, written by native `WZ_CONNECT_MEMB`), `DmN_OnlineCheck` (4 rows, written by native `WZ_DISCONNECT_MEMB`) | Real rows referencing real accounts/admin logins, latest dated 2026-07-16 (the backup's own snapshot date). `DmN_IP_Log`/`DmN_OnlineCheck`'s writers CONFIRMED via `sys.sql_modules` (native login/logout procedures); `DmN_Admin_Logins`'s writer CONFIRMED via the legacy panel's own PHP source (`docs/legacy/provider-web/database-mapping.md`) | **ACTIVE_CONFIRMED** |
| Shop catalog | `DmN_Shop_Harmony` (267 rows), `DmN_Shop_Sockets` (136 rows) | Real, substantial catalog data (item-harmony options and socket definitions with real prices) — but `DmN_Shop_Logs`/`DmN_Shop_Card`/`DmN_Shop_Credits` (the actual purchase/transaction tables) are all 0 rows | **READ_ONLY_LEGACY** — a real catalog was built out, but no evidence any purchase ever flowed through it |
| Other audit logs | `DmN_Account_Logs`, `DmN_GM_Logs` | 0 rows | DORMANT |
| Payment gateways | `DmN_2CheckOut_*` (3), `DmN_Donate*` (14), `DmN_PagSeguro_*` (3), `DmN_PayGoal_Log` | 0 rows across every table in every gateway family | **DEAD** — fully provisioned, zero real transactions ever (confirms `docs/economy/legacy-dmn-cms-and-currency-investigation.md`'s finding) |
| Legacy VIP system | `DmN_Vip_Packages`, `DmN_Vip_Users`, `DmN_VipSystem` | 0 rows | **DEAD** |
| Legacy marketplace | `DmN_Market`, `DmN_Market_Logs`, `DmN_Market_Slots` | 0 rows | DEAD |
| Vote-reward system | `DmN_Votereward*` (10 tables) | 0 rows | DEAD |
| Referral system | `DmN_Refferals`, `DmN_Refferal_Claimed_Rewards`, `DmN_Refferal_Reward_List` | 0 rows | DEAD |
| Support/CMS content | `DmN_Support_*` (3), `DmN_Downloads`, `DmN_Gallery`, `DmN_Guides`, `DmN_GM_Announcement`, `DmN_Web_Storage` | 0 rows | DEAD |
| Admin/moderation tooling | `DmN_Gm_List`, `DmN_Gm_Credits_Limit`, `DmN_Ban_List`, `DmN_Hidden_Chars`, `DmN_ChangeName_History`, `DmN_Warehouse_Delete_Log` | 0 rows | DORMANT — plausibly still reachable admin tooling, just unused in this snapshot |
| Misc | `DmN_Email_Confirmation`, `DmN_Bulk_Emails`, `DmN_User_Salts`, `DmN_Login_Attempts`, `DmN_GoogleAds_Click`, `DmN_Mmotop_Stats`, `DmN_Shopp`, `DmN_Shop_Custom_Price_List`, `DmN_Account_Invt` | 0 rows | DORMANT/DEAD (mixed — see individual note below) |

`DmN_Account_Invt` and `DmN_Mmotop_Stats` had 0 rows in this snapshot
(consistent with the legacy panel never having run against production —
see Decision 1 below), but their **writers are no longer UNKNOWN** as of
the 2026-08-31 provider-web second pass:
`docs/legacy/provider-web/database-mapping.md` confirms real write paths
for both in the legacy panel's own PHP source (`DmN_Account_Invt` is the
lost-password reset-token table, misleadingly named — not
invite/referral; `DmN_Mmotop_Stats` is written by the MMOTOP
vote-reward integration). 0 rows here reflects that this panel never ran
against production, not that these writers don't exist.

## Phase K — DmN data-flow investigation (who writes to the active tables?)

Bryan's instruction was explicit: search GameServer configs, server
files, legacy CMS source, web code, stored procedures, triggers, jobs,
and external tools — do not assume the writer. This was done:

- **Stored procedures/triggers**: confirmed above — zero `DmN_*`
  procedures exist. The trigger `DmN_Update_Killer_Ranking` fires on
  `Character`, not on any of the three active DmN tables.
- **Local GameServer binaries/config**: `D:\MU\MU-Server\Current\` (the
  expected location for GameServer server files) is **empty** — no
  binaries, no config, no source available locally to search.
- **Local legacy CMS source — CORRECTION, 2026-08-31 (Phase L)**: the
  claim below (originally written in Phase K) that no legacy CMS source
  exists locally was **wrong**, found via a more thorough search this
  round. The real source **does** exist: `D:\MU\Deploy\Cpanel-Backups\hostbr-web-20260716\extracted\backup-7.16.2026_12-53-47_mubloodxz\homedir\public_html\application\`
  — a full PHP panel (account registration/login, admin dashboard, VIP
  sync/expiry cron tasks, a Gerencianet PIX payment plugin). It was
  missed in Phase K because that search matched directory/file *names*
  containing `dmn`/`cms` literally — this backup's folder is named
  `hostbr-web-20260716` instead, a naming mismatch, not an absence.
  ~~Original (Phase K, wrong) text: "searched `D:\MU\` for any
  `*dmn*`/`*cms*` directory or file — none found. The panel this schema
  belonged to does not exist as source code anywhere on this machine."~~
- **`WZ_CONNECT_MEMB`/`WZ_DISCONNECT_MEMB` — the REAL writers of
  `DmN_IP_Log`/`DmN_OnlineCheck` (Phase L, CONFIRMED via `sys.sql_modules`)**:
  contrary to the HYPOTHESIS below, these two active tables are written
  by the **native GameServer engine's own connect/disconnect
  procedures**, not by the legacy CMS. `WZ_CONNECT_MEMB` upserts
  `MEMB_STAT` and `[MuOnline].dbo.DmN_IP_Log` on every login;
  `WZ_DISCONNECT_MEMB` upserts `MEMB_STAT` and
  `[MuOnline].dbo.DmN_OnlineCheck` on every logout (computing
  `OnlineMinutes` via `DATEDIFF` against the connect timestamp — a real
  bug was also spotted here: the `TotalTime` column's SET expression
  reads the pre-update `OnlineMinutes`, not the pre-update `TotalTime`,
  so the two columns collapse to the same value after every disconnect;
  native/vendor code, not something to fix here, just documented).
  **This resolves the "who writes DmN_IP_Log/DmN_OnlineCheck" mystery
  for these two tables specifically** — it is NOT the legacy panel.
  `DmN_Admin_Logins` remains genuinely unresolved (see below).
- **`DmN_Admin_Logins` — still UNKNOWN**, and now a real, related legacy
  writer is confirmed for a *different* purpose: the legacy CMS's
  `tasks/RemoveExpiredVip.php` directly writes `MEMB_INFO.AccountLevel = 0`
  (bypassing `WZ_SetAccountLevel` entirely) for expired legacy VIP
  entries — full detail in `docs/vip/wz-setaccountlevel-coexistence.md`.
  This does not explain `DmN_Admin_Logins` specifically, but confirms
  the legacy panel's cron jobs are a real, if likely currently-inert,
  category of native-adjacent write.
- **`DmN_Admin_Logins` — RESOLVED, 2026-08-31 (provider-web second pass)**:
  `models/model.admin.php:171`, `admin_login_attemt($user)`, inserts
  `(memb___id, time, ip)` on every admin-panel login attempt (read back at
  `:109` for a dashboard "last 5 admin logins" widget). This is the
  legacy `hostbr-web` panel itself, not the native engine — consistent
  with `DmN_Admin_Logins` being an *admin-panel* login log, a genuinely
  different concept from `DmN_IP_Log` (native, *player* connect log). Full
  detail: `docs/legacy/provider-web/database-mapping.md`.
- **`DmN_Account_Invt`/`DmN_Mmotop_Stats` — RESOLVED, 2026-08-31 (same
  pass)**: both had confirmed writers in the legacy panel.
  `DmN_Account_Invt` is misleadingly named — it is the **lost-password
  reset-token table**
  (`create_reminder_entry_for_name()`,
  `models/model.account.php:408-417`), not an invite/referral table as
  its name might suggest. `DmN_Mmotop_Stats` is written by
  `insert_mmotop_stats()` (same file, lines 1110-1123), called from
  `tasks/ParseMMOTOPVotes.php`, for the MMOTOP vote-reward integration.
  Both now correctly classified `ACTIVE_CONFIRMED` (within the legacy
  panel — see the deployment-status note below) rather than UNKNOWN.
- **`DmN_Shop_Harmony`/`DmN_Shop_Sockets` — writer confirmed as
  admin-CRUD-only**, not gameplay-event-driven: `load_harmony_list`/
  `edit_harmony`/`change_harmony_status` (`models/model.admin.php`) let an
  admin edit these price lists directly; no code path populates them from
  actual gameplay. Consistent with this section's existing
  `READ_ONLY_LEGACY` classification for these two tables.
- **`PixPayments` — remains UNKNOWN.** Exhaustively searched across the
  entire legacy `application/` tree (PHP, JSON, `.sql` schema files) —
  zero references, exact-case and loose. Not written by any gateway in
  this panel, old or new generation (see
  `docs/legacy/provider-web/payments-legacy.md`). Stays
  `DORMANT_LEGACY_UNKNOWN_WRITER` per
  `docs/payments/payment-surfaces-comparison.md` and Phase L Decision
  Closure Decision 4.
- **`DmN_OnlineCheck`'s writer** — still resolved as native
  (`WZ_DISCONNECT_MEMB`, above); the legacy panel only ever *reads* this
  table (online-hour-to-credit exchange, rankings, achievement/battle-pass
  progress) and never writes it, confirmed again this pass — no change to
  the existing conclusion, additional confirmation only.
- **Conclusion**: of the original 8 UNKNOWN-writer targets from this
  investigation, **6 are now resolved** with a real writer or reader
  found in the legacy panel (`DmN_Admin_Logins`, `DmN_IP_Log` [native,
  already resolved], `DmN_OnlineCheck` [native, reader-only here],
  `DmN_Account_Invt`, `DmN_Mmotop_Stats`, plus admin-CRUD confirmation for
  `DmN_Shop_Harmony`/`DmN_Shop_Sockets`). **`PixPayments` remains the one
  genuinely unresolved writer** — confirmed absent from this panel too,
  narrowing but not closing the mystery. Whether the legacy `hostbr-web`
  panel is STILL deployed/running on the production server today is
  **no longer an open question** — see Phase L Decision Closure Decision
  1, in full in `docs/vip/wz-setaccountlevel-coexistence.md`: three
  independent read-only production checks (filesystem, cron, database
  activity) confirmed **NOT_DEPLOYED**.

## Phase K — security review of DmN components (read-only, no production changes)

Reviewed for the specific risk categories Bryan named, against the real
schema/data available:

| Risk | Finding |
|---|---|
| Plaintext passwords | `DmN_Market.item_password` (VARCHAR) — column name strongly implies plaintext storage, not a hash; table has 0 real rows so this could not be confirmed against a real value. Flagged `REVIEW_REQUIRED` if this table is ever populated. |
| Weak password hashing | No confirmed hashing scheme found anywhere in the DmN schema — no column shaped like a bcrypt/argon2/salted-hash output was found; `DmN_User_Salts.session_salt` (0 rows) suggests SOME hashing scheme existed, but its algorithm cannot be determined from schema alone. |
| Session secrets | `DmN_User_Salts.session_salt` — 0 rows, genuinely unknown whether this was ever a strong secret. |
| SQL injection patterns | Cannot be assessed — no application source code for the legacy panel exists locally to review (see data-flow investigation above). The zero-`DmN_*`-procedure finding means all of its data access was almost certainly raw, ad-hoc SQL from application code, which is a real elevated-risk *pattern* (no stored-procedure boundary at all) even without being able to point to a specific injectable query. |
| Broad database permissions | Cannot be assessed directly (the login(s) the legacy panel used are not present in this database backup's principals — they were either never captured in this backup or already dropped before it was taken). |
| Admin backdoors | `DmN_Gm_List`/`DmN_Gm_Credits_Limit` are real admin-tooling tables (0 rows) — no evidence of a backdoor account, but also no way to rule one out from schema alone. |
| Legacy web authentication | `MEMB_INFO.memb__pwd` (the REAL, live GameServer credential column) is a `VARCHAR(10)` holding a short value that is **not obviously hashed** (`privacy-data-map.md`) — this is a real, live finding, not limited to the dormant DmN system, and is the single most concrete authentication-related risk this audit found. Reported here as a security finding, not acted on (no production change made). |
| Hardcoded credentials | None found in the database schema itself (credentials, if any, would live in the legacy panel's own source code, which is not available locally). |
| Obsolete account recovery | `MEMB_INFO.fpas_ques`/`.fpas_answ` (security question/answer, plaintext-shaped `VARCHAR`) — a real, live column on the ACTIVE account table, empty in this snapshot but structurally present; plaintext security-question storage is a known weak recovery pattern if ever populated. |
| Insecure IP logging | Confirmed: `DmN_IP_Log`/`DmN_Admin_Logins`/`MEMB_STAT`/`MEMB_INFO.last_login_ip` all store raw IP addresses with no evidence of truncation, hashing, or retention limits. |
| Dormant but reachable endpoints | Cannot be assessed — would require production web-server/routing configuration, out of scope for a read-only SQL audit. |

**No production system was probed, activated, or modified to produce
this review** — every finding above comes from the real, already-
restored local schema and data, or is explicitly marked as unknowable
without further (out-of-scope) access.

## Recommendation (not a decision — for Bryan/product to make)

This document does not recommend dropping, migrating, or re-activating
any part of the legacy CMS. It exists to make an honest record that this
surface is real, present in the live database, mostly inactive by
evidence, but not fully understood — a genuine "unknown legacy risk"
distinct from the well-understood, actively-used engine tables mapped in
`account-data-map.md`/`character-data-map.md`/`economy-data-map.md`.
Any future decision to remove or repurpose these tables should start
from a full read of their stored-procedure/trigger dependencies, not
from this document's name-based inventory alone.
