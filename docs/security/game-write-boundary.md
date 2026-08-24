# Game write boundary

Read and write credentials are never interchangeable.

- `bloodmoon_observer`: read-only; effective INSERT, UPDATE, DELETE, EXECUTE, and
  ALTER permissions are zero.
- `bloodmoon_writer`: no server role, no broad database role, and no direct table
  permission. Its sole positive permission is object-level `EXECUTE` on
  `dbo.DmN_CreateGameAccount`.

The procedure uses static T-SQL only. It validates explicit parameters, acquires a
deterministic transaction-owned application lock before collision checks, inserts
only `MEMB_INFO` and `AccountCharacter`, captures the identity-generated
`memb_guid` with `SCOPE_IDENTITY()`, and uses `XACT_ABORT` plus TRY/CATCH rollback.
It cannot create characters, warehouses, cash-shop rows, currencies, inventory,
guild data, rankings, or arbitrary commands.

Administrative bootstrap uses the pre-authorized RemoteOps path to SQL Server on
VPS localhost. It does not weaken `bm-sql`, expose TCP 1433, or create a permanent
administrator. Writer credentials are generated cryptographically and stored only
as DPAPI-protected local secrets. The QA runner receives secrets in temporary
files that are deleted after use and does not echo them.

Discord routes remain GET/read-only and have no access to the writer credential or
writer interface. Public registration provisioning remains disabled.

## Phase 3D-A production boundary

The Agent is installed outside `C:\MuServer`, runs under `SYSTEM`, loads the
procedure-only writer and command key ring from DPAPI, and exposes no listener.
Command HMAC is separate from telemetry/read HMAC. Queue/D1 cannot send raw SQL
or broaden `bloodmoon_writer`; only `CREATE_GAME_ACCOUNT` is executable.
Passwords, keys, ciphertext bodies and SQL diagnostics are excluded from results
and operational logs.
