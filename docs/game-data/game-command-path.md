# Game command path

The Phase 3C write path is physically separate from all read paths:

`Portal PENDING identity -> controlled RemoteOps command file -> Agent runner -> IGameDatabaseWriter -> dbo.DmN_CreateGameAccount`

The Agent does not expose an inbound HTTP listener and no new port was opened.
The controlled command file is transferred over the pre-existing authenticated
SSH administration channel, consumed locally on the VPS, and deleted in a
`finally` block. SQL traffic remains local to the VPS (`Server=localhost`).

The command model accepts only `CREATE_GAME_ACCOUNT` with GUID `commandId` and
`provisioningRequestId`, legacy login, and technical MU credential. It has no
raw-SQL, table, column, or generic-action field.

The persistent SQLite ledger records command/request IDs, command type, request
hash, status, safe result reference, and timestamps. It never stores the MU
credential. A unique request ID provides idempotency; a 30-second execution lease
allows restart recovery while preventing immediate concurrent double execution.
The SQL procedure independently serializes the legacy login with a transaction-
owned `sp_getapplock`, so different requests for the same login have one winner.

The controlled QA transport is intentionally not connected to public registration.
Replacing it with a production queue requires a separately reviewed encrypted
credential envelope and is a Phase 3D prerequisite, not part of this activation.
