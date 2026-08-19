// Guards apps/api/src/modules/marketplace/marketplace-bridge-dev.controller.ts:
// raw, no-business-rule handlers that let an authenticated admin set a
// listing/order/bridge-job to ANY status directly (activateListing,
// updateListingStatus, updateOrderStatus, updateBridgeJob), fabricating a
// GameBridge confirmation the real bridge never sent. These exist only to
// unblock local/staging work while GameBridge itself doesn't exist yet --
// they are not the real admin moderation console (that is
// marketplace-admin.controller.ts's listingAction/orderAction/escrowAction,
// which enforce real state-transition rules and audit reasons, and stays
// registered everywhere).
//
// The previous protection was activateListing() throwing only when
// MU_BRIDGE_ENABLED === 'true' -- insufficient on its own, because
// production today has MU_BRIDGE_ENABLED unset/false (GameBridge isn't
// connected), which left these handlers wide open in production. Mirrors
// test-personas.env.ts's shape deliberately: no single flag is enough, so
// all three independent conditions have to hold at once, and this module is
// gated at Nest's controller-registration level (see marketplace.module.ts)
// so an unmet guard means the routes are never registered -- a real 404,
// not a guard that could be reverse-engineered or misconfigured to a 403.
const PRODUCTION_DATABASE_MARKER = /mubloodxz_bloodmoon/i
const ALLOWED_DATABASE_MARKER = /bloodmoon_local|bloodmoon_e2e/i
const ALLOWED_NODE_ENVS = new Set(['development', 'test'])

export function isMarketplaceBridgeDevControlsSafe(): boolean {
  if (process.env.MARKETPLACE_BRIDGE_DEV_CONTROLS_ENABLED !== 'true') return false
  if (!ALLOWED_NODE_ENVS.has(process.env.NODE_ENV || '')) return false
  const dbUrl = process.env.DATABASE_URL || ''
  if (!dbUrl) return false
  if (PRODUCTION_DATABASE_MARKER.test(dbUrl)) return false
  return ALLOWED_DATABASE_MARKER.test(dbUrl)
}
