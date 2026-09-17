---
status: SECOND_PASS_COMPLETE
category: legacy
audience: internal (engineering)
lastVerified: 2026-08-31
confidence: CONFIRMED (real source read)
---

# Legacy provider-web — module inventory

Every meaningful code area found, classified. See individual docs in this
tree for full detail on each row. All classifications are about the
legacy panel's own internal state at capture time (2026-07-16 snapshot),
**not** about production deployment — every module below inherits
`NOT_DEPLOYED` from Decision 1 in
`docs/vip/wz-setaccountlevel-coexistence.md` regardless of its own
internal ACTIVE/DORMANT/DEAD status.

| Module | Classification | Detail |
|---|---|---|
| VIP purchase/tracking (`SynchronizeVip.php`, shop `buy_vip`) | ACTIVE_CONFIRMED (within the panel itself) | [`vip-legacy.md`](vip-legacy.md) |
| VIP expiry removal (`RemoveExpiredVip.php`) | DORMANT — gated flag + 0 rows in its target table | [`vip-legacy.md`](vip-legacy.md), [`dead-and-dormant-components.md`](dead-and-dormant-components.md) |
| VIP rankings display (`check_vip()`) | DEAD — live query commented out | [`vip-legacy.md`](vip-legacy.md) |
| PayPal / PagSeguro / PaymentWall / 2CheckOut / Interkassa gateways | ACTIVE_CONFIRMED (within the panel itself), verification quality legitimate | [`payments-legacy.md`](payments-legacy.md) |
| Fortumo gateway | ACTIVE_POSSIBLE — signature check intact, but a defense-in-depth IP check was removed | [`payments-legacy.md`](payments-legacy.md) |
| CuentaDigital gateway | ACTIVE_CONFIRMED, but with a real unauthenticated-crediting vulnerability | [`payments-legacy.md`](payments-legacy.md), [`security-findings.md`](security-findings.md) |
| Paygol gateway | ACTIVE_CONFIRMED, trivially bypassable via IP-header spoofing | [`payments-legacy.md`](payments-legacy.md), [`security-findings.md`](security-findings.md) |
| Newer plugin gateways (Gerencianet/MercadoPago/Xendit/Coinbase/Binance/Stripe/PagHiper/NganLuong) | ACTIVE_POSSIBLE — presence confirmed, not deep-audited | [`payments-legacy.md`](payments-legacy.md) |
| Referral system | ACTIVE_CONFIRMED, abuse control possibly non-functional (depends on `DmN_IP_Log`, which may not have been populated) | [`payments-legacy.md`](payments-legacy.md) |
| Registration / password recovery | ACTIVE_CONFIRMED | [`account-lifecycle-legacy.md`](account-lifecycle-legacy.md) |
| Unverified-account purge (15-day) | DORMANT — disabled by default in scheduler config | [`account-lifecycle-legacy.md`](account-lifecycle-legacy.md) |
| Ban/unban reconciliation (`CheckBans.php`/`RemoveBans.php`) | DORMANT — disabled by default | [`account-lifecycle-legacy.md`](account-lifecycle-legacy.md) |
| Admin panel (accounts/currency/items/GM/bans/content/support/bulk-email/plugins) | ACTIVE_CONFIRMED (within the panel itself), very broad capability surface | [`useful-historical-reference.md`](useful-historical-reference.md) |
| Admin raw-SQL/DDL executor | ACTIVE_CONFIRMED, real security risk if reachable | [`security-findings.md`](security-findings.md) finding #8 |
| Player market (`DmN_Market`) | ACTIVE_CONFIRMED | [`useful-historical-reference.md`](useful-historical-reference.md) |
| Vote-reward system (Mmotop/Gtop/Top100arena/Topg/Xtremetop) | ACTIVE_CONFIRMED for Mmotop (writes `DmN_Mmotop_Stats`); other providers config-driven, not individually traced | [`database-mapping.md`](database-mapping.md) |
| T_Friend rename-consistency helper | ACTIVE_CONFIRMED, narrow (only fires on character rename, not a general friends feature) | (see below) |
| Guild integration | LEGACY_BUT_USEFUL_REFERENCE — read-only against native `Guild`/`GuildMember`, no writes found | (see below) |
| Cron scheduler (23 files, 16 active) | Mixed — see [`cron-and-background-jobs.md`](cron-and-background-jobs.md) for the full per-file table | [`cron-and-background-jobs.md`](cron-and-background-jobs.md) |
| `CheckHiddenChars.php` | DEAD — byte-identical duplicate of `CheckBans.php`, unrelated to its name | [`dead-and-dormant-components.md`](dead-and-dormant-components.md) |
| `LiveStreams.php` (Twitch) | DORMANT — file exists, not cron-scheduled | [`dead-and-dormant-components.md`](dead-and-dormant-components.md) |
| Achievement reset crons (Daily/Weekly/Monthly) | DORMANT — not cron-scheduled | [`dead-and-dormant-components.md`](dead-and-dormant-components.md) |
| `DmN_Shop_Harmony`/`DmN_Shop_Sockets` shop config | ACTIVE_CONFIRMED (admin-curated), no gameplay-event writer | [`database-mapping.md`](database-mapping.md) |
| `PixPayments` | UNKNOWN — no reference anywhere in this codebase; not this panel's | [`database-mapping.md`](database-mapping.md) |
| `DmN_OnlineCheck` writer | UNKNOWN — read-only here, real writer unresolved | [`database-mapping.md`](database-mapping.md) |

## Guild and T_Friend detail (not covered elsewhere in this tree)

**Guild**: read-only against native `Guild`/`GuildMember` — guild
rankings, castle-siege owner lookups (`models/model.stats.php`), a
guild-member badge shown in a character's friend list. No write path to
any guild table found anywhere in the panel.

**T_Friend** (native `T_FriendList`/`T_FriendMail`/`T_FriendMain`): only
touched by `models/model.character.php`'s
`update_t_friendlist`/`update_t_friendmail`/`update_t_friendmain`
(lines ~1676-1696), and only as a side effect of a character-rename
operation (the `transfer_char` plugin flow) — keeping friend-list name
references consistent after a rename. Not a general friends-management
feature in the web panel itself.
