# Commerce module

This module owns the official store, recharge intents and the administrative
commerce workflow.

## Main flows

- Public catalog: only `ACTIVE`, non-deleted products inside their sale window.
- Catalog import: creates `DRAFT` products; unnamed or ambiguous records become
  `BLOCKED`. Import never publishes content.
- Product workflow: draft, review, approval, scheduling, publication,
  unpublication and archive are separate audited actions.
- Purchase: validates product, variant, limits, destination, stock and wallet in
  a serializable transaction.
- Delivery: a paid order creates a correlated delivery record. Processing is
  tracked independently from payment.
- Refund: always starts from the order. Wallet credit, stock restoration, order
  state and delivery state are changed atomically.

## Security

Administrative routes require a store-specific permission. `ADMIN` does not
implicitly receive every operation; `SUPER_ADMIN` bypasses granular checks.
Financial aggregates are returned only to `SUPER_ADMIN`.

Internal product codes, source paths and operational notes are never returned by
public catalog endpoints. Sensitive values must not be placed in audit metadata.

## Development delivery tests

Product delivery simulation is disabled in production unless
`ALLOW_STORE_DELIVERY_TESTS=true`. Enabling it in production should be temporary
and requires the `admin.store.test` permission.

## Data changes

Run Prisma migrations before starting a build that includes schema changes. The
structural guard is part of `npm run check` and validates models, permissions,
routes and transaction invariants.
