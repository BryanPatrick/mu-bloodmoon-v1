# Blood Moon official store

## Public experience

`/loja` lists only approved and active products. Visitors can search and filter
the catalog without receiving internal codes, source paths or administrative
notes. The product page exposes available variants, limits, price, currency and
delivery destination.

Authenticated players purchase with account currencies. Character-bound
products require a character owned by the current account.

## Administrative experience

`/painel/admin/loja` provides:

- operational dashboard;
- product and category management;
- catalog import;
- product variants and workflow;
- order timeline, notes and evidence;
- delivery queue and retry handling;
- operational reports;
- protected delivery tests.

Consolidated financial values are visible only to `SUPER_ADMIN`.

## Product workflow

1. Create or import as `DRAFT`.
2. Send to `IN_REVIEW`.
3. A different authorized administrator, or a `SUPER_ADMIN`, approves it.
4. Publish immediately or schedule it.
5. Hide, archive or restore without destroying history.

Unnamed and ambiguous imported products are `BLOCKED`. A product cannot be
published without approval and a valid price.

## Order and delivery integrity

Purchase creation uses a serializable database transaction to reserve stock,
debit the wallet, create the paid order and enqueue delivery. A shared
`correlationId` links the purchase, delivery, operational event, audit and
errors.

Refunds must be performed through the order action. The refund transaction
credits the wallet, restores stock, updates deliveries and marks the order as
refunded. Direct delivery refund is intentionally rejected.

## Operations

Relevant product, order, delivery and refund actions create audit and work logs.
Import, balance, delivery, duplicate and refund failures are sent to the central
error module. Store permissions are maintained in the centralized permission
registry.
