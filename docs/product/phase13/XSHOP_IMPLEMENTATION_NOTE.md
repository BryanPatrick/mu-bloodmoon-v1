---
status: FINAL
category: product/economy
audience: internal (engineering + product)
lastVerified: 2026-08-30
---

# X-Shop — What Was (and Wasn't) Implemented This Phase

## Finding: there is no X-Shop code in apps/api or apps/web

An exhaustive search (`grep -ri "x-shop|xshop"` across both `apps/api` and `apps/web`) found **zero references**. The 168-item X-Shop catalog documented in Phase 11/12 (`docs/product/phase12/XSHOP_AUDIT.md`) lives entirely in a single GameServer configuration file — `C:\MuServer\Data\Custom\CustomXShop.txt` — read by the in-game NPC shop mechanism directly. The website/portal has no representation of it: no `ShopProduct` rows reference it, no controller serves it, no admin page manages it.

## What this means for "the safest application-level mechanism to ensure the incompatible catalog cannot be presented as current Blood Moon premium inventory"

**There is no application-level surface to gate**, because the application never presented this catalog in the first place. The instruction's premise (an app-level exposure that needs disabling) doesn't hold for this specific system — the actual exposure is purely in-game, via GameServer, which this phase is explicitly forbidden from touching (`NO_GAME_SERVER_CHANGE`).

## What was actually done

Nothing was implemented in code, because there was nothing safe or in-scope to change. What exists instead:

1. **The conflict is documented precisely** — `docs/product/phase12/XSHOP_AUDIT.md` (Phase 12) already classified all 168 items `REMOVE_FROM_PREMIUM_SHOP` with exact evidence.
2. **The real, product-safe precedent is documented** — `CashShopProduct.txt`'s 12 genuinely `+0` items, proving the Cash Shop Philosophy is achievable with the same engine.
3. **A preventive guard for the future**: if apps/api or apps/web ever grows a feature that surfaces X-Shop data (e.g. a future "sync GameServer shop catalog to the website" integration), it must independently re-run the same `KEEP`/`REMOVE_FROM_PREMIUM_SHOP` classification from `XSHOP_AUDIT.md` before displaying anything — noted here so that future work doesn't assume the current absence of code means the underlying policy question is resolved.
4. **The actual resolution path remains what it always was**: disabling or reconfiguring `CustomXShop.txt` on the real GameServer, which requires GameServer access this phase does not have and a product decision (`QUESTIONS_FOR_BRYAN.md` P0 #1) that has not been made.

## Conclusion

`XSHOP_OLD_ITEMS_EXPOSED` is best answered `N/A_NOT_APPLICATION_LAYER` rather than YES/NO — the exposure is real (in-game), but it was never an application-layer concern this phase could safely act on. This is reported honestly rather than fabricating an app-level toggle for a system the app doesn't touch.
