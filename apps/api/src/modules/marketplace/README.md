# Marketplace API

This module owns the player marketplace, administrative moderation and the
game-server bridge queue. Controllers must never write directly to the game
database.

## Player workflow

1. A player creates a listing.
2. The API validates currency, price, category, limits and cooldown.
3. The publication fee is debited and the listing enters `ESCROW_PENDING`.
4. A `LOCK_ITEM` bridge job moves the immutable item into escrow.
5. A successful lock activates the listing.
6. A buyer reserves the active listing atomically, pays and creates a
   correlated order.
7. A `TRANSFER_ITEM` job delivers the item.
8. Completion credits the seller after the configured fee and releases escrow.

Cancellation and expiration use `RETURN_PENDING` until a `RELEASE_ITEM` job
returns the item. Manual actions never edit `itemData`, serial or hash.

Run `worker:marketplace-expirations` from the production scheduler. Public
queries also hide overdue active rows immediately, even before the worker runs.

## Administration

`/admin/marketplace` contains dashboard, listings, transactions, escrow,
reports, tasks, economy and analytics endpoints. Every state-changing action
requires a reason and creates audit, work and operational logs.

Suspending a reported user has a dedicated endpoint and permission:
`admin.marketplace.users.suspend`. Report moderation alone cannot block an
account. Consolidated financial data and economy changes are restricted to
`SUPER_ADMIN`.

## Reliability and security

- Active listing reservation uses a conditional `updateMany`, preventing two
  buyers from reserving the same item.
- Orders have a unique `correlationId`.
- Bridge jobs use idempotency keys.
- Failed delivery, return and escrow jobs are sent to the Central de Erros.
- Failed item return is critical and generates an alert.
- Sensitive values are redacted by the shared observability layer.
- Destructive records use workflow states and retain audit history.

Apply the production migration before enabling the new admin screens:

```bash
npx prisma migrate deploy
```

## Bridge dev controls (never in production)

`activateListing`, `updateListingStatus`, `updateOrderStatus` and
`updateBridgeJob` (`marketplace-bridge-dev.controller.ts`) fabricate a
GameBridge confirmation by setting status directly, with no state-transition
rules -- they exist only to unblock local/staging work while GameBridge
itself doesn't exist. They are not the moderation console above and are
never the same thing as `MU_BRIDGE_ENABLED`. The controller is only
registered (Global Portal Audit P1.3) when
`isMarketplaceBridgeDevControlsSafe()` (`marketplace-bridge-dev.env.ts`)
holds: `MARKETPLACE_BRIDGE_DEV_CONTROLS_ENABLED=true`, `NODE_ENV` in
`development`/`test`, and `DATABASE_URL` matching a known local/e2e
database. Outside that, the routes are not registered at all -- a request
to them 404s at Nest's router, not a 403 from a guard.
