# Game credential envelope

`GAME_CREDENTIAL_ENCRYPTOR = Portal internal provisioning service`

`GAME_CREDENTIAL_DECRYPTOR = Windows GameBridge Agent immediately before SQL`

The MU-only credential uses Node's established `aes-256-gcm` primitive with a
random 96-bit nonce and 128-bit authentication tag. AAD is exactly
`commandId + provisioningRequestId + CREATE_GAME_ACCOUNT`, preventing envelope
swaps across commands.

Persistence contains only `ciphertext`, `nonce`, `tag`, `keyVersion`,
`algorithm=AES-256-GCM`, and creation time. Portal MySQL retains this in the
dedicated `GameAccountCredential` model because future game login/rotation still
requires a recoverable credential. D1 relays ciphertext during command
retention. Neither stores plaintext or key material.

Launcher, player, Discord and generic Admin DTOs never select or serialize the
credential relation; they do not receive ciphertext either. The Portal key ring
is a runtime secret. The Agent key ring is DPAPI LocalMachine-protected with a
SYSTEM/Administrators-only ACL. Cloudflare cannot decrypt. `keyVersion` is
mandatory, so old keys remain available while new encryption moves to `v2`.

Plaintext is generated in a Buffer, encrypted immediately and best-effort
zeroed. The Agent decrypts only before the procedure and zeroes its byte array.
SqlClient requires a managed string; .NET cannot guarantee erasure of that
immutable object. It is never logged, serialized, or written to a temp file.
