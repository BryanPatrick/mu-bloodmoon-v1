# Blood Moon marketplace

## Public and player areas

- `/marketplace`: public catalog of active player listings.
- `/painel/marketplace`: the authenticated player's listings, purchases and
  bridge status.
- Players can report suspicious listings from the item details.

## Administrative area

`/painel/admin/marketplace` provides:

- operational dashboard;
- listing moderation;
- escrow custody and controlled recovery;
- transaction review and reprocessing;
- report assignment and resolution;
- operational tasks;
- economy configuration;
- operational and strategic reports.

`/painel/admin/marketplace/escrow` opens the custody queue directly.
Consolidated financial values and economy changes are visible only to
`SUPER_ADMIN`.

## Permissions

Access is granular: view, listing moderation, escrow operation, transaction
operation, report moderation, user suspension, economy management, task
management and report viewing are independent permissions.

## Escrow states

`PENDING_LOCK` -> `HELD` -> `TRANSFER_PENDING` ->
`RELEASED_TO_BUYER`.

Cancellation or expiration moves custody through `RETURN_PENDING` and then
`RETURNED_TO_SELLER`. Inconsistency or bridge failure moves the record to
manual review or failure and produces operational evidence.

## Operational rules

- Administrators cannot alter the advertised item.
- Every manual action requires a reason.
- Audit and work logs identify actor, target and result.
- A `correlationId` links order, delivery, event and error.
- Game-server writes happen only through idempotent bridge jobs.
- Critical return failures raise an immediate system alert.

The production scheduler must run `npm --workspace apps/api run
worker:marketplace-expirations`. The game bridge worker processes the resulting
idempotent return and transfer jobs.
