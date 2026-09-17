---
status: SECOND_PASS_COMPLETE
category: legacy
audience: internal (engineering + product)
lastVerified: 2026-08-31
confidence: CONFIRMED (real source read)
---

# Legacy provider-web — VIP model

How the legacy panel modeled VIP, for historical reference only. Blood
Moon's own VIP architecture (Portal = source of truth, documented in
`docs/vip/wz-setaccountlevel-coexistence.md`'s Decision 2) is unrelated
and does not reuse any of this design.

## Confirmed: this panel never calls the native VIP procedures

Exhaustive search across the entire `application/` tree: **no file
anywhere calls `WZ_SetAccountLevel` or `WZ_GetAccountLevel`.** The panel's
only pattern for ever touching `MEMB_INFO.AccountLevel` is
`tasks/RemoveExpiredVip.php`'s direct `UPDATE MEMB_INFO SET AccountLevel = 0
WHERE memb___id = :account` — a hard bypass of the native procedure, not
an isolated exception.

`RemoveExpiredVip.php` is gated behind `vip_config.active` (a config
flag) AND requires real rows in `DmN_Vip_Users`, which has **0 rows** in
the real local snapshot — so even if this panel were deployed, this
specific script would currently have nothing to act on regardless of
scheduling.

`SynchronizeVip.php` is read-only against the GameServer side: it reads
`MEMB_INFO.AccountLevel`/`AccountExpireDate` and mirrors them into
`DmN_Vip_Packages`/`DmN_Vip_Users` bookkeeping tables. It never writes
`AccountLevel`.

## `vip_query_config.json` — 7 alternate VIP-schema profiles (template dead code)

This CMS template ships pre-built support for 7 different VIP-storage
conventions, presumably selectable at install time for different MU
distributions:

| Profile | Storage |
|---|---|
| `igcn` | `T_VIPList` |
| `zteam` | `PremiumData` |
| **`xteam`** | **`MEMB_INFO.AccountLevel`/`AccountExpireDate`** — the one actually configured, matches the real native Blood Moon schema |
| `muengine` | `MEMB_INFO.vipstamp` |
| `exteam` | `Character.PremiumTime` |
| `muemu_s1` | `VipSystem` table |
| `custom_skymu` | `MEMB_INFO.VipExpirationTime`/`IsVip` |

Only `xteam` is relevant to this deployment; the other 6 are template
dead code for unrelated MU server distributions, included for
completeness since they demonstrate the panel's VIP feature was
originally built to be storage-agnostic.

## VIP is currently disabled in rankings display (real bug found)

`models/model.rankings.php`'s private `check_vip($account, $server)`
function has its **entire** live query — both the primary
`AccountLevel`/`AccountExpireDate` lookup and a fallback against
`DmN_Vip_Users.viptype` — commented out. The live code just
`return 0;`. Every account is therefore treated as non-VIP for rankings
display purposes in this snapshot, even though VIP purchase/tracking
itself (`SynchronizeVip.php`, the shop purchase flow) was still fully
live. The commented-out code shows the intended design: try native
`MEMB_INFO` first, fall back to the web-side `DmN_Vip_Users` mirror.

## The real admin-defined VIP package model (richer than AccountLevel + expiry)

`models/model.admin.php`'s `add_vip_package`/`edit_vip_package`
(around lines 1511-1591) define VIP packages with far more fields than
tier/duration alone:

`reset_price_decrease`, `reset_level_decrease`, `reset_bonus_points`,
`grand_reset_bonus_credits`, `grand_reset_bonus_gcredits`,
`hide_info_discount`, `pk_clear_discount`, `clear_skilltree_discount`,
`online_hour_exchange_bonus`, `change_name_discount`,
`change_class_discount`, `bonus_credits_for_donate`, `shop_discount`,
`wcoins` (a bonus WCoin grant on purchase), `allow_extend`,
`server_vip_package` (the raw `xteam`-style code, e.g.
`xteam|vip_gold`), `server_bonus_info`, `connect_member_load`.

VIP tiers in this legacy design grant per-purchase discounts across
nearly every monetized feature, plus a donation-bonus stacking effect
(`models/model.donate.php:563-576`'s `reward_user()` adds
`bonus_credits_for_donate` percentage on top of any donation while a VIP
tier is active). **This is HISTORICAL_REFERENCE only** — Blood Moon's own
VIP benefit design (`VipBenefitConfig` in `apps/api/prisma/schema.prisma`)
is a deliberately much narrower, explicitly-approved-only feature set (see
that model's own comments: "all bonus values default to 0/disabled per
explicit instruction"). This legacy richness is not a roadmap.

## Relevance to Decision 1 (production deployment status)

None of this ever ran against production — `WZ_SetAccountLevel`'s DORMANT
status and the panel's own NOT_DEPLOYED classification are both already
documented in `docs/vip/wz-setaccountlevel-coexistence.md`. This document
adds detail (the 7-profile template structure, the disabled rankings VIP
check, the richer package model) but changes no conclusion there.
