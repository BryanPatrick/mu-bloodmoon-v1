---
status: SECOND_PASS_COMPLETE
category: legacy
audience: internal (engineering)
lastVerified: 2026-08-31
confidence: CONFIRMED (real source read)
---

# Legacy provider-web — dead and dormant components

Confirmed-dead or already-disabled features found while reading the real
source, kept separate from [`module-inventory.md`](module-inventory.md)'s
broader classification so the specific "this was already off before the
panel was ever removed" findings aren't lost in a larger table.

## Confirmed dead code

- **`tasks/CheckHiddenChars.php`** — byte-for-byte identical to
  `tasks/CheckBans.php` (confirmed via diff; still internally declares
  `class CheckBans`), not related to hidden-character detection despite
  its name, and not present in `scheduler_config.json`'s active task
  list. A stale duplicate file, not a real feature.
- **`login_user()`'s `insert_ip_log()` call** — commented out in
  `models/model.account.php` around lines 523-524, despite a dedup guard
  still being wired up around the dead call. `DmN_IP_Log` may not have
  actually been populated by ordinary user logins in this configuration
  (see [`database-mapping.md`](database-mapping.md)).
- **`models/model.rankings.php`'s `check_vip()`** — entire live query
  commented out, function just `return 0;`. VIP display in rankings was
  effectively disabled site-wide in this snapshot (see
  [`vip-legacy.md`](vip-legacy.md)).
- **Fortumo's IP-allowlist check** — commented out in
  `controller.payment.php`, leaving signature verification as the only
  remaining control for that gateway (see
  [`payments-legacy.md`](payments-legacy.md)).
- **CSRF verification calls** — loaded but commented out in every
  controller/plugin except the VIP-purchase handler (see
  [`security-findings.md`](security-findings.md) finding #3).

## Not cron-scheduled (files exist, never run automatically)

Per `scheduler_config.json`'s active task list (see
[`cron-and-background-jobs.md`](cron-and-background-jobs.md) for the full
23-file inventory):

- `CheckHiddenChars.php` (dead duplicate, above)
- `LiveStreams.php` (Twitch integration — orphaned)
- `ResetAchievementDaily.php` / `Monthly.php` / `Weekly.php` (likely
  meant to be wired up by the achievements plugin's own install routine)
- `Retry.php` (a self-removing one-shot maintenance stub)
- `RemoveNotVerifiedAccounts.php`, `RemoveBans.php`, `CheckBans.php` —
  present in the config but with their `status` flag set to disabled

## `RemoveExpiredVip.php` — dead by data, not just by deployment

Even setting aside that this panel is NOT_DEPLOYED to production (see
`docs/vip/wz-setaccountlevel-coexistence.md` Decision 1), this specific
script would have nothing to act on regardless: it's gated behind
`vip_config.active` AND requires real rows in `DmN_Vip_Users`, which has
**0 rows** in the real local snapshot.

## Relevance

None of this affects Blood Moon. Documented for completeness — anyone
reading this backup for reference should know which pieces were already
non-functional even within the legacy system itself, before ever
considering whether the whole panel was reachable in production.
