# Game account provisioning

> Phase 3D-A adds production Queue + D1 delivery and encrypted credential
> persistence. Phase 3C SSH/file delivery remains controlled QA only.

Phase 3C introduces one deliberately narrow command: `CREATE_GAME_ACCOUNT`.
Public registration does not dispatch it; `GAME_ACCOUNT_PROVISIONING_ON_REGISTER`
remains off until Phase 3D-B is separately reviewed.

The Portal account and MU account use different credentials. The Portal password
and its hash never cross the MU boundary. The generated MU credential is 10 ASCII
alphanumeric characters, never logged and never persisted in plaintext. Portal
stores AES-256-GCM ciphertext; D1 only relays it; Agent decrypts before SQL.

The provisioning sequence is:

1. create the Portal `Account` and a `GameAccountIdentity` in `PENDING`;
2. generate a collision-safe, non-personal legacy login of at most 10 characters;
3. deliver an allowlisted command to the Agent-side provisioning runner through
   the authorized RemoteOps SSH file transport;
4. execute `dbo.DmN_CreateGameAccount` with the dedicated writer;
5. persist the successful result in the Agent SQLite ledger;
6. mark `GameAccountIdentity` `ACTIVE` with `membGuid`, `legacyLogin`, and
   `provisionedAt`.

The production dispatcher has no public controller. It persists immutable
command/provisioning identities, envelope and command expiry, then reconciles the
safe result. Phase 3C transport is not required by production. Public automatic
registration remains off.

An `ACTIVE` identity with zero characters is valid. `/launcher/me` returns
`gameReady: true`, and `/launcher/me/characters` returns an empty list.
