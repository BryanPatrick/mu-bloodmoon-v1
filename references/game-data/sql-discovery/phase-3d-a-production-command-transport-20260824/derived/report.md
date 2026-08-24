# Derived Phase 3D-A result

The production path is operational without inbound VPS access or public SQL.
Queue duplicates and crashes converge through D1 leases plus the persistent
Agent ledger. One controlled QA account produced exactly the two authorized MU
rows. Its replay/restart/result-loss recovery produced zero additional rows.

The MU credential is independent of the Portal password, retained only as an
AES-256-GCM envelope, and decryptable only by Portal runtime/Agent key holders.
Cloudflare, Launcher, Discord and player APIs have no decryption or command
access. Public registration provisioning is still off.
