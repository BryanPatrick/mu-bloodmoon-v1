---
status: RUNBOOK_READY_NOT_EXECUTED
category: economy/cashshop
audience: internal (future QA/GM agent)
lastVerified: 2026-09-02
---

# CashShop Rental Empirical Test Runbook — Phase S (Part 21)

Precise enough for a future agent/GM with real in-game access to execute
without further design work. **Not executed this phase** — no in-game or
GM command access exists in this session (same blocker
`lucky-set-rental-empirical-test-plan.md`, Phase 14, already named).
This supersedes that document's own test matrix with more exact,
step-by-step execution detail per Bryan's Part 21 instruction, while
preserving its original pass/fail criteria unchanged.

## Scope

The 9 real CashShop 7-day rentals (Decision 4,
`docs/decisions/0023-store-catalog-decision-closure.md`): Guardian
Angel, Imp, Horn of Dinorant, Demon, Spirit of Guardian, Pet Rudolf, Pet
Panda, Pet Unicorn, Pet Skeleton. Any ONE of these is sufficient for a
first pass — they share the identical mechanism
(`CashShopPeriodicItem(ItemSerial, Time)`, `ItemDuration=604800`).

## Pre-conditions

- A test/QA account with real in-game access to the Blood Moon
  GameServer (not a `tp_*` test-persona Portal account — this requires
  actually playing the character).
- Read access to the GameServer `MuOnline` database (`bm-sql.cmd` or
  equivalent read-only path) to inspect `CashShopPeriodicItem` before
  and after each step.
- A second test account, for the trade step.
- **No production player account or real player-owned item is used at
  any step.**

## Runbook

1. **Setup**: log in as the test account, confirm current inventory/
   warehouse state via `bm-sql.cmd` (empty or known baseline).
2. **Item grant/purchase**: purchase one of the 9 rentals through the
   real CashShop in-game interface (or the equivalent test-grant path if
   a GM command exists for it — record which method was used).
3. **Serial capture**: immediately query
   `SELECT TOP 5 * FROM CashShopPeriodicItem ORDER BY Time DESC` and
   record the new row's `ItemSerial` and `Time` (convert `Time` from
   Unix epoch to a human-readable UTC timestamp for the report).
4. **CashShopPeriodicItem verification**: confirm `Time` is
   approximately `now + 604800` seconds (± a few minutes for
   transaction latency) — this is the baseline sanity check every
   further step compares against.
5. **Inventory move**: leave the item in the active inventory slot, log
   out, log back in before any expiry, confirm the item is still present
   and the `CashShopPeriodicItem` row is unchanged.
6. **Warehouse move** (the critical unknown): move the item into the
   account's shared warehouse. Log out. **Do not wait for real
   expiration during this step** — instead, directly and temporarily
   edit the `CashShopPeriodicItem.Time` value for this one test row
   (via the read-write QA credential, on the QA/lab database only,
   never production) to a past timestamp, simulating expiry while the
   item sits in warehouse. Log back in and open the warehouse. Record:
   is the item still present, removed, or flagged unusable?
7. **Trade attempt**: with a fresh (non-expired) rental item, attempt to
   trade it to the second test account via the personal store or direct
   trade. Record: does the trade succeed or get rejected? If it
   succeeds, does `CashShopPeriodicItem.ItemSerial` still track the same
   serial under the new owner, and does the original `Time` value carry
   over correctly?
8. **Store attempt**: same as step 7 but via listing on the personal
   store (`CustomMarketShop`) rather than direct trade, if the engine
   distinguishes the two paths.
9. **Logout/login**: with an active (non-expired) rental, log out and
   back in at least twice, confirming stable state and an unchanged
   `Time` value each time (proves the countdown isn't reset by session
   boundaries).
10. **Server restart**: if a maintenance window exists, restart the
    GameServer process with a rental mid-countdown, and confirm the item
    state and `CashShopPeriodicItem.Time` are unchanged post-restart
    (this is a real operational event, coordinate with Bryan before
    scheduling one purely for this test).
11. **Expiration while inventory**: let a real rental expire naturally
    (or use the timestamp-edit technique from step 6, applied to an item
    sitting in active inventory this time) and observe the exact client-
    visible expiration action — silently removed, flagged unusable, or
    requires a relog to disappear.
12. **Expiration while equipped**: same as step 11 but with the item
    equipped/active (e.g. a pet actively summoned) at the moment of
    expiry — the highest-risk case, since an equipped item's removal
    behavior may differ from an inventory item's.
13. **Database post-state**: after each expiration test (steps 11-12),
    query `CashShopPeriodicItem` again — confirm the row is deleted,
    flagged, or left stale, and record which.
14. **Cleanup**: remove any test items/characters created, restore the
    test accounts to a clean state, and if step 6's manual timestamp
    edit was used, confirm no other real `CashShopPeriodicItem` row was
    touched.

## Pass/fail criteria (unchanged from Phase 14's original plan)

- **Must pass**: step 6 (warehouse does not silently preserve an expired
  item past its clock) and step 7/8 (trade/store cannot be used to
  convert a rental into a permanent item).
- **Should pass**: steps 11/12 have a clean, non-exploitable expiration
  action (no window where an expired-but-not-yet-cleaned-up item is
  still usable).
- **Nice to have, not blocking**: steps 9/10 — informative for
  operational planning, not a go/no-go gate.

## What a PASS unlocks

If all "must pass" criteria hold, the 9 rentals may be reclassified from
`RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST` to a real commercial
recommendation (still requiring Bryan's own final sign-off, per Decision
4's own "only after this test may Bryan approve them commercially"). A
FAIL on step 6 or 7/8 does not automatically mean `NOT_SUITABLE` — it
means the specific gap must be closed (e.g., blocking warehouse storage
for rental items, or blocking trade of rental-flagged items) before
re-testing.

## Related systems

`docs/economy/cashshop-commercial-review.md`,
`docs/economy/cashshop-full-inventory.md` (original technical dive),
`docs/economy/lucky-set-rental-empirical-test-plan.md` (superseded in
detail, not in conclusion, by this runbook),
`docs/decisions/0023-store-catalog-decision-closure.md` (Decision 4),
OQ-028.
