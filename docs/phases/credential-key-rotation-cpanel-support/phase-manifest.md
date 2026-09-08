# Phase manifest: credential-key-rotation-cpanel-support

```
PHASE_ID: credential-key-rotation-cpanel-support
TITLE: Credential-key migration tooling + cPanel deploy wiring
OBJECTIVE: Give migrate-game-credential-keys.ts (new, matching the
  already-committed migrate-two-factor-keys.ts) real npm-script wiring,
  both locally and in the packaged cPanel deploy, plus base64 keyring
  support for cPanel's env-var quote-mangling.
SCOPE: game-credential-envelope.service.ts (GAME_CREDENTIAL_KEYS_B64
  support), its e2e spec, migrate-game-credential-keys.ts (new),
  package.json + package-cpanel-deploy.mjs (npm script registration for
  reconcile:provisioning, migrate:two-factor-keys, migrate:game-credential-keys).
NON_SCOPE: any actual credential rotation execution; any change to
  production env; reconcile.ts's own internal logging fix (separate
  phase: fix/reconcile-output-cleanup).
SOURCE_BRANCH: extracted from main's own dirty working tree (protected
  at D:\MU\RecoveryBackups\main-2026-09-08\)
BASE_COMMIT: governance/engineering-pack @ b4fea68c (main @ 3adfd053 +
  the engineering governance pack)
DEPENDENCIES: none — confirmed via git cat-file across all 10 project
  branches, this content exists nowhere else, tracked or untracked
MIGRATIONS: none
TEST_PLAN: apps/api/test/game-credential-envelope.e2e-spec.ts (pure
  unit-style, no DB/app bootstrap required)
TEST_RESULTS: 8/8 PASS (jest --config ./test/jest-e2e.json --runInBand
  --testPathPatterns="game-credential-envelope"), 2026-09-08
DEPLOY_TARGET: none this phase — tooling wiring only, does not itself
  deploy or rotate anything
EXIT_CRITERIA: files extracted, classified, tests passing, committed
  with scoped commit(s) on this branch
INTEGRATION_STATUS: NOT_INTEGRATED
PRODUCTION_STATUS: NOT_DEPLOYED
KNOWN_DEBT: none new. The actual credential rotation this tooling
  enables remains a separate, future, explicitly-authorized action —
  this phase only makes the tooling runnable, it does not run it.
LAST_UPDATED: 2026-09-08
```

## File classification

| File | Classification | Notes |
|---|---|---|
| `apps/api/src/modules/game-account-identity/game-credential-envelope.service.ts` | MODIFIED | Adds `GAME_CREDENTIAL_KEYS_B64` as an additive alternative; `GAME_CREDENTIAL_KEYS_JSON` remains fully supported (falls through when B64 unset) |
| `apps/api/test/game-credential-envelope.e2e-spec.ts` | MODIFIED | Adds one new test case for the base64 keyring path; all pre-existing assertions unchanged |
| `apps/api/src/migrate-game-credential-keys.ts` | NEW | Standard NestJS bootstrap script (imports `AppModule`, `PrismaService`, `GameCredentialEnvelopeService`); zero secret literal confirmed via structural + pattern scan |
| `apps/api/package.json` | MODIFIED | Adds 3 npm script entries (`reconcile:provisioning`, `migrate:two-factor-keys`, `migrate:game-credential-keys`) |
| `scripts/package-cpanel-deploy.mjs` | MODIFIED | Mirrors the same 3 script entries into the packaged cPanel deploy's generated `package.json` |
| DEPENDENCY_REQUIRED | none | No other file/module required beyond what already exists on `main` |

## Confirmations

- `GAME_CREDENTIAL_KEYS_B64` is additive, not destructive — confirmed by reading the diff: `serializedKeyRing = encodedKeyRing ? Buffer.from(encodedKeyRing, 'base64').toString('utf8') : process.env.GAME_CREDENTIAL_KEYS_JSON || ''`.
- `GAME_CREDENTIAL_KEYS_JSON` remains fully supported (the exact same parse path as before, when B64 is unset).
- Zero secret literal (structural + pattern scan, this session and the prior one).
- No production environment variable modified.
- No credential rotated — this phase only makes rotation tooling runnable.
