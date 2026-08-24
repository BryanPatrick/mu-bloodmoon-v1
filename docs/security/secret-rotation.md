# Game command secret rotation

Telemetry Agent HMAC, Portal-command HMAC, and Agent-command HMAC are separate.
Discord keys, player/Launcher JWTs, SQL credentials and Cloudflare account tokens
are never accepted as substitutes.

For HMAC rotation, add the new client/secret pair to the relevant Worker secret
map, deploy, update the caller's DPAPI/runtime secret, verify, then remove the old
pair. Nonces and timestamp validation remain mandatory.

For game-encryption rotation:

1. add `v2` to Portal runtime and Agent DPAPI key rings;
2. deploy the Agent ring first while `v1` stays active;
3. switch `GAME_CREDENTIAL_ACTIVE_KEY_VERSION` to `v2` in Portal;
4. new envelopes use `v2`, retained `v1` remains decryptable;
5. re-encryption/retirement is a later controlled migration after no retained
   envelope references `v1`.

Never put key material in git, D1, appsettings, the envelope, logs, or command
arguments. `deploy/game-bridge/Install-GameBridgeAgent.ps1` accepts installation
secrets on stdin and writes DPAPI LocalMachine material only.
