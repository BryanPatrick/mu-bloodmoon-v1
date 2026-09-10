// PHASE S (2026-09-02) -- Bryan's authoritative Phase R decisions,
// persisted as real, enforceable code (not just documentation). See
// docs/decisions/0023-store-catalog-decision-closure.md for the full
// decision record and docs/economy/xshop-bryan-decision-table.csv for
// the per-item evidence this list was generated from.
//
// This is a point-in-time snapshot of the X-Shop review outcome, not a
// live read of the CSV -- the classification is now final, codified
// policy (Bryan's Decision 1/2), not a working document that changes
// often. If a future review re-classifies any of these items, this
// file must be regenerated/edited alongside the ADR update -- keeping
// this in sync with the CSV is a manual, deliberate step, never
// automatic. Keys are "{X-Shop ItemType}-{X-Shop ItemIndex}", the exact
// same `key` format `commerce-item-catalog.json`'s items already use
// (cross-checked against real catalog entries this phase -- e.g. "0-0"
// resolves to "Kris" in both sources).

// Decision 1 -- 153 items (69 Weapons + 72 Armor/Sets + 12 Wings), every
// one shipping +13 with all 6 excellent options simultaneously.
// LEGACY_CATALOG_NOT_FOR_COMMERCIAL_SALE. Not deleted, not silently
// weakened -- preserved as historical/legacy configuration, just never
// auto-approvable as a Portal Store product via catalog import.
export const LEGACY_XSHOP_NOT_FOR_SALE_KEYS: ReadonlySet<string> = new Set([
  '0-0', '0-1', '0-2', '0-3', '0-4', '0-5', '0-6', '0-7', '0-8', '0-9', '0-10', '0-11',
  '1-0', '1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '1-8',
  '2-0', '2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-7', '2-8', '2-9', '2-10', '2-11',
  '3-0', '3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-7', '3-8', '3-9', '3-10', '3-11',
  '4-0', '4-1', '4-2', '4-3', '4-4', '4-5', '4-6', '4-7', '4-8', '4-9', '4-10', '4-11',
  '5-0', '5-1', '5-2', '5-3', '5-4', '5-5', '5-6', '5-7', '5-8', '5-9', '5-10', '5-11',
  '6-0', '6-1', '6-2', '6-3', '6-4', '6-5', '6-6', '6-7', '6-8', '6-9', '6-10', '6-11',
  '7-0', '7-1', '7-2', '7-3', '7-4', '7-5', '7-6', '7-7', '7-8', '7-9', '7-10', '7-11',
  '8-0', '8-1', '8-2', '8-3', '8-4', '8-5', '8-6', '8-7', '8-8', '8-9', '8-10', '8-11',
  '9-0', '9-1', '9-2', '9-3', '9-4', '9-5', '9-6', '9-7', '9-8', '9-9', '9-10', '9-11',
  '10-0', '10-1', '10-2', '10-3', '10-4', '10-5', '10-6', '10-7', '10-8', '10-9', '10-10', '10-11',
  '11-0', '11-1', '11-2', '11-3', '11-4', '11-5', '11-6', '11-7', '11-8', '11-9', '11-10', '11-11',
  '12-0', '12-1', '12-2', '12-3', '12-4', '12-5', '12-6', '12-36', '12-37', '12-38', '12-39', '12-40'
])

// Decision 2 -- 12 Pets/Rings/Pendants. NOT permanently RED like the
// 153 above -- these are BALANCE_TEST_REQUIRED, pending real in-game
// power-magnitude validation (see the runbook in
// docs/economy/accessory-balance-test-plan.md). Held at NOT_FOR_SALE
// only until that test runs, not on the same "conflicts with current
// policy" basis as Decision 1's 153 items.
export const LEGACY_XSHOP_BALANCE_TEST_REQUIRED_KEYS: ReadonlySet<string> = new Set([
  '13-8', '13-9', '13-12', '13-13', '13-21', '13-22', '13-23', '13-24', '13-25', '13-26', '13-27', '13-28'
])

// Decision 3 -- the 3 dead/unresolvable Axes rows. Listed here for
// documentation completeness only -- they structurally cannot appear
// in commerce-item-catalog.json's `items` array at all (confirmed this
// phase: no Item.txt definition exists for them, so the catalog
// generator itself never produced a row for these keys), so no
// blocking logic is needed for them specifically. Never silently
// dropped from any report that enumerates X-Shop rows.
export const LEGACY_XSHOP_DEAD_ROW_KEYS: readonly string[] = ['1-9', '1-10', '1-11']

export type LegacyCatalogPolicyResult = 'NOT_FOR_COMMERCIAL_SALE' | 'BALANCE_TEST_REQUIRED' | null

/**
 * Classifies a legacy X-Shop item key ("{ItemType}-{ItemIndex}") against
 * Bryan's Phase S decisions. Returns null for any key not covered by
 * either hold list -- e.g. a genuinely new, never-reviewed item, which
 * falls through to the existing text-based heuristic in
 * StoreAdminService#catalogItemBlocked, not silently approved.
 */
export function classifyLegacyCatalogKey(key: string | undefined): LegacyCatalogPolicyResult {
  if (!key) return null
  if (LEGACY_XSHOP_NOT_FOR_SALE_KEYS.has(key)) return 'NOT_FOR_COMMERCIAL_SALE'
  if (LEGACY_XSHOP_BALANCE_TEST_REQUIRED_KEYS.has(key)) return 'BALANCE_TEST_REQUIRED'
  return null
}
