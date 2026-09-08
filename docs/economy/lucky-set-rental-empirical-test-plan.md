---
status: TEST_PLAN_NOT_YET_EXECUTED
category: economy/cashshop
audience: internal (QA/GM + product)
lastVerified: 2026-08-30
---

# Lucky Set Rental — Empirical Test Plan

Per Bryan: before any Lucky Set rental product decision, the existing 7-day rental mechanic must be empirically validated across inventory, warehouse, trade/personal store, logout, server restart, and real expiration — closing the `UNKNOWN`s left in [`cashshop-full-inventory.md`](cashshop-full-inventory.md)'s technical dive. **Not executed this phase** — this is the test plan only, since it requires live GM/in-game access this session doesn't have.

## Why this is required before any go-ahead

The 8 real CashShop rental items are all `+0/+0/+0` cosmetics — the worst case of an undiscovered gap (e.g. a rental item surviving in warehouse past its expiry, or being trade-locked incorrectly) is a lost cosmetic. A Lucky Set is full combat equipment; the same gap in that context could mean a real player permanently keeps rented power. This asymmetry is exactly why the existing mechanic being "good enough for pets" does not imply "good enough for equipment."

## Test matrix

| # | Step | What to observe | Confirms/refutes |
|---|---|---|---|
| 1 | Grant a rental cosmetic (or a temporary equipment item, if a GM test-grant path exists) to a test character with a short duration (minutes, not days, if the engine allows an override — otherwise use the real 7-day item and a multi-day test window) | `CashShopPeriodicItem` gets a real row with `ItemSerial` + `Time` | Baseline: confirms the tracking mechanism activates on grant, as already observed for the one live production row |
| 2 | Leave the item in the character's active inventory, log out, log back in before expiry | Item still present and functional | Confirms survival across a normal session boundary (low risk, expected to pass) |
| 3 | Move the item into the account warehouse before expiry, log out, wait past expiry, log back in and check the warehouse | Item removed/flagged/still-present in warehouse after expiry | **The critical unknown** — `warehouse.Items` is an opaque binary blob (confirmed in Phase 14 Part B); this is the only way to observe real behavior without engine source |
| 4 | List the item on the personal store or player-to-player trade before expiry, have a second test account attempt to buy/receive it | Trade succeeds/fails; if it succeeds, does the NEW owner's copy still expire on schedule, or does it become permanent? | Determines whether trade is a viable "escape hatch" from the rental — directly relevant to whether Lucky Set rental could be laundered into a permanent transfer |
| 5 | Let the item expire while sitting in an active inventory slot (not warehouse) | Exact expiration action: silently deleted, visually flagged unusable, or requires a client relog to disappear | Answers the "exact expiration action" unknown from the Part B technical dive |
| 6 | Restart the GameServer process (or, if a full restart isn't feasible for a test, at minimum trigger a character reload) with an item mid-rental | Item state before/after — does the countdown survive a server-side interruption correctly | Confirms the mechanism isn't purely in-memory/session-based (the `CashShopPeriodicItem.Time` = epoch-timestamp finding from Part B strongly suggests it survives restarts by design, but this step proves it rather than inferring it) |
| 7 | If a GM re-grant/extend command exists, test it against an already-expired item | Whether recovery/extension is possible at all | Answers the "restoration/recovery behavior" unknown from Part B |

## Pass/fail criteria for a Lucky Set rental go-ahead

- **Must pass**: step 3 (warehouse does not silently preserve an expired item past its clock) and step 4 (trade cannot be used to convert a rental into a permanent item).
- **Should pass**: step 5 has a clean, non-exploitable expiration action (no window where an expired-but-not-yet-cleaned-up item is still usable).
- **Nice to have, not blocking**: steps 6-7 — informative for operational planning (what happens on a maintenance restart, whether GM support tooling exists) but not a go/no-go gate on the product decision itself.

## Who can run this

Requires a GM/test-account with real in-game access to the Blood Moon GameServer (not available to this session — no in-game access, no GM command execution capability). This is exactly the kind of "unknown GameServer behavior requiring live validation" blocker this phase's own scope explicitly allows deferring, named here so it isn't lost.
