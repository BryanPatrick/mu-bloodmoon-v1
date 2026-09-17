---
status: CONFIRMED_BY_BRYAN_PHASE_S
category: economy
audience: internal (product)
lastVerified: 2026-09-02
---

# X-Shop / CashShop — Open Beta and full-release candidates — Phase R

**Confirmed unchanged by Phase S (2026-09-02)**: Bryan's own Part 18
instruction for this exact question matches this document's conclusion
almost verbatim (3 tickets only if event review passes; 9 rentals not
until empirical validation; 12 accessories not until balance validation;
153 RED and 3 dead rows never for sale) — nothing below was revised, it
was independently re-confirmed as the real policy. See
`docs/decisions/0023-store-catalog-decision-closure.md` for the seven
final decisions this candidate list is now downstream of.

Bryan's Part 22/23 request, drawn directly from
[`xshop-commercial-review.md`](xshop-commercial-review.md)'s and
[`cashshop-commercial-review.md`](cashshop-commercial-review.md)'s
classification. **These are recommendations, nothing is enabled.**

## OPEN_BETA_SAFE_STORE_CANDIDATES

**3 items — the CashShop event-entry tickets only**: Blood Castle
Ticket, Devil Square Ticket, Kalima Ticket. The only items in either
catalog with zero open conditions attached: confirmed `+0/+0/+0`,
permanent (no rental-mechanism dependency at all), no P2W dimension,
matches "cosmetics/convenience" policy directly, and would need only a
new `ShopProduct` row + a GameBridge delivery command to become real
Portal products (per `docs/store/store-product-taxonomy.md`'s mapping)
— no unresolved mechanism question blocks them.

**Nothing else qualifies as safe without further work.** The 9 CashShop
rentals are low-risk but not zero-condition (rental-mechanism safety
unproven); the 12 X-Shop pets/rings/pendants are non-zero power; the 153
X-Shop weapon/armor/wing items are `RED_INCOMPATIBLE_WITH_CURRENT_POLICY`.
If nothing beyond the 3 tickets can honestly be recommended, that is the
real, evidence-based answer for Open Beta — not a gap in this review.

## FULL_RELEASE_CANDIDATES

Pending their respective blocking condition being closed, not ready
today:

- **The 9 CashShop rentals**, pending the empirical rental-safety test
  plan (`lucky-set-rental-empirical-test-plan.md`) actually running —
  requires live GM/in-game access this session does not have.
- **The 12 X-Shop pets/rings/pendants**, pending Bryan's own magnitude
  judgment call (real but comparatively small power, `+13`/all-excellent
  on a `ReqLevel 0-1` accessory) — a real product decision, not a data
  gap.

Open Beta and full release are explicitly NOT assumed to need the same
catalog — the 3 tickets could reasonably launch at Open Beta while the
above two groups clear their conditions before full release, or later.

## NEEDS_BALANCE_TESTING

**The 12 X-Shop pets/rings/pendants** are the one group where the open
question is genuinely about in-game power magnitude, not a mechanism
gap — this session's static config review cannot determine how
impactful a `+13`/all-6-excellent ring or pendant actually feels in
practice at various character levels. Real in-game testing (or GM
judgment from direct game knowledge) would close this, not further
document review.

The 9 CashShop rentals are a **different kind of open condition**
(mechanism safety — warehouse/trade behavior around expiration), not a
power-balance question, and are not double-counted here; see
`lucky-set-rental-empirical-test-plan.md` for that specific test plan.

## Explicitly NOT recommended for either Open Beta or full release without a real policy change

The 153 X-Shop weapon/armor/wing items and the 12 pets/rings/pendants'
underlying items (all `+13`/all-6-excellent) — selling any of these
directly, as currently configured, is the exact "normal Excellent
endgame equipment"/"exclusive best-in-slot gear" scenario current
commercial policy names as incompatible. Nothing here recommends a
policy change; it documents that current policy, applied honestly to
the real catalog data, rules almost all of X-Shop out.
