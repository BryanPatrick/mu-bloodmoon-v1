---
status: SECOND_PASS_COMPLETE
category: legacy
audience: internal (engineering)
lastVerified: 2026-08-31
confidence: CONFIRMED (real source read)
---

# Legacy provider-web — cron and background jobs

23 files in `application/tasks/`. Every one read in full (not inferred
from filename). Cross-checked against `application/config/scheduler_config.json`
to distinguish what actually ran from what merely exists as a file.

## Every task file

| File | Real behavior |
|---|---|
| `BCMonthlyReward.php` | Monthly cron: reads top-N Blood Castle scorers (native `RankingBloodCastle`), awards credits via `add_credits()`, logs via `add_account_log()`, resets the score column to 0. |
| `BulkEmail.php` | Cron: pulls unsent rows from `DmN_Bulk_Emails`, reads a serialized recipient list from a `.txt` file, sends via SwiftMailer (SMTP/PHP mail/sendmail/SparkPost per `email_config.json`), batches max 75 recipients per run. |
| `CCMonthlyReward.php` | Same pattern as BC, for Chaos Castle (`RankingChaosCastle`). |
| `CheckBans.php` | Cron: two-way reconciliation between GameServer ban state (`Character.CtlCode=1`, `MEMB_INFO.bloc_code=1`) and web-side `DmN_Ban_List` — syncs new bans in, reverses unbans if a `DmN_Ban_List` row no longer has a GameServer-side ban. |
| `CheckHiddenChars.php` | **Byte-for-byte identical to `CheckBans.php`** (confirmed via diff; still declares `class CheckBans`). Not related to hidden-character detection despite the name. Not in the active cron list — dead duplicate. |
| `DSMonthlyReward.php` | Same pattern as BC, for Devil Square (`RankingDevilSquare`). |
| `DeleteOldSessions.php` | Cron: deletes files older than 12 hours from `application/data/sessions/` (flat-file session GC). |
| `DuelerMonthlyReward.php` | Same monthly-reward pattern for the Duel ranking, with an optional excluded-account list. |
| `LastForumTopics.php` | Cron: fetches an external forum RSS/XML feed, caches the latest N items for the homepage widget. |
| `LastMarketItems.php` | Cron: caches recently-added/recently-sold `DmN_Market` (web-db player market) listings per server for homepage display. |
| `LiveStreams.php` | Cron: polls the Twitch Helix API for configured streamers, caches live-stream data, logs streaming time. **Not in the active cron list** — orphaned in this snapshot. |
| `ParseMMOTOPVotes.php` | Cron: for each `DmN_Votereward` row with `api = 2` (MMOTOP), pulls vote data and writes `DmN_Mmotop_Stats` (see [`database-mapping.md`](database-mapping.md)). |
| `ParseServerFiles.php` | Cron: thin wrapper invoking `lib.parse_server_file.php` to parse server data files (drop lists etc.). |
| `RemoveBans.php` | Cron (disabled): removes expired temporary bans from `DmN_Ban_List`, reversing the corresponding `MEMB_INFO.bloc_code`/`Character.CtlCode`. |
| `RemoveExpiredVip.php` | Writes `MEMB_INFO.AccountLevel = 0` directly, bypassing `WZ_SetAccountLevel` entirely — see [`vip-legacy.md`](vip-legacy.md). |
| `RemoveNotVerifiedAccounts.php` | Cron (disabled by default): `DELETE FROM MEMB_INFO WHERE activated = 0 AND appl_days < DATEADD(DAY, -15, GETDATE())` — see [`account-lifecycle-legacy.md`](account-lifecycle-legacy.md) for the `appl_days` resolution. |
| `ResetAchievementDaily.php` / `Monthly.php` / `Weekly.php` | Three near-identical crons resetting `DmN_User_Achievements` rows matching the relevant period. **None appear in the active cron list** — likely meant to be wired up by the achievements plugin's own install routine rather than the base scheduler. |
| `Retry.php` | Self-removing stub: deletes its own `'Retry'` entry from `scheduler_config.json` and does nothing else. A leftover one-shot maintenance task, not a recurring job. |
| `SynchronizeVip.php` | Mirrors native `MEMB_INFO.AccountLevel`/`AccountExpireDate` into `DmN_Vip_Packages`/`DmN_Vip_Users` bookkeeping — read-only against the GameServer side. See [`vip-legacy.md`](vip-legacy.md). |
| `VoteMonthlyReward.php` | Monthly cron: rewards top voters from `DmN_Votereward_Ranking`, marks `reward_is_give = 1`. |

## What actually ran (per `scheduler_config.json`)

Only 16 of the 23 files above are in the active schedule:
`VoteMonthlyReward`, `BCMonthlyReward`, `DSMonthlyReward`,
`CCMonthlyReward`, `DuelerMonthlyReward`, `RemoveExpiredVip`,
`RemoveNotVerifiedAccounts` (disabled flag), `RemoveBans` (disabled flag),
`CheckBans` (disabled flag), `BulkEmail`, `ParseMMOTOPVotes`,
`DeleteOldSessions`, `ParseServerFiles`, `LastForumTopics`,
`LastMarketItems`, `SynchronizeVip`.

`CheckHiddenChars`, `LiveStreams`, `ResetAchievementDaily/Weekly/Monthly`,
and `Retry` have real PHP files but no active cron entry — see
[`dead-and-dormant-components.md`](dead-and-dormant-components.md).

## Production relevance

None of this ever ran in production regardless of what's scheduled here
— see `docs/vip/wz-setaccountlevel-coexistence.md`'s Decision 1 section:
production's actual cron list has exactly two jobs, both Blood Moon's own
(`bloodmoon-backup.sh`, `release-regenerate-prisma-once.sh`), zero legacy
references. This inventory is historical/reference value only.
