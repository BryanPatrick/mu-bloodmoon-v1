# Game account provisioning

Phase 3C introduces one deliberately narrow command: `CREATE_GAME_ACCOUNT`.
Public registration does not dispatch it; `GAME_ACCOUNT_PROVISIONING_ON_REGISTER`
remains off until Phase 3D is separately reviewed.

The Portal account and MU account use different credentials. The Portal password
and its hash never cross the MU boundary. The legacy MU credential is 8–10 ASCII
alphanumeric characters, is never logged or persisted in the command ledger, and
for the controlled QA run was held only in local DPAPI-protected secret storage.

The provisioning sequence is:

1. create the Portal `Account` and a `GameAccountIdentity` in `PENDING`;
2. generate a collision-safe, non-personal legacy login of at most 10 characters;
3. deliver an allowlisted command to the Agent-side provisioning runner through
   the authorized RemoteOps SSH file transport;
4. execute `dbo.DmN_CreateGameAccount` with the dedicated writer;
5. persist the successful result in the Agent SQLite ledger;
6. mark `GameAccountIdentity` `ACTIVE` with `membGuid`, `legacyLogin`, and
   `provisionedAt`.

The Phase 3C transport is a controlled operator/QA path, not an automatic public
registration path. The temporary runner and secret request files are removed
after validation; the two SQLite ledgers remain on the VPS as recovery evidence.

An `ACTIVE` identity with zero characters is valid. `/launcher/me` returns
`gameReady: true`, and `/launcher/me/characters` returns an empty list.
