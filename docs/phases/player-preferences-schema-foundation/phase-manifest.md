# Phase manifest: player-preferences-schema-foundation

```
PHASE_ID: player-preferences-schema-foundation
TITLE: Player preferences -- schema-level architecture foundation
OBJECTIVE: Protect the real, coherent Player Preferences schema (Phase K)
  that existed only uncommitted in openbeta's dirty working tree, as its
  own clean, minimal branch -- without building any runtime code
  (matches the Survey extraction's own precedent for this project).
SCOPE: schema/migration only -- 2 Prisma models
  (PlayerPreferenceDefinition/PlayerPreference), 1 enum
  (PlayerPreferenceCategory), 1 migration.
NON_SCOPE: runtime/API/UI -- no controller, service, DTO, API route,
  frontend, or admin UI. Explicitly not built this phase.
SOURCE_BRANCH: extracted from open-beta/p0-foundation's dirty working
  tree (protected at D:\MU\RecoveryBackups\openbeta-2026-09-08\)
BASE_COMMIT: integration/open-beta @ b33ba56a
MIGRATION: 20260830191000_player_preferences_foundation (copied
  verbatim; validated 1:1 against the 2 models this phase -- 1 FK
  constraint in the SQL matches the 1 relation in the schema exactly,
  PlayerPreference.definitionKey -> PlayerPreferenceDefinition.key,
  onDelete: Cascade)
RUNTIME_CODE: NONE -- confirmed via repo-wide grep across apps/api/src
  and apps/web, zero references to either model anywhere. The current
  /painel/configuracoes page genuinely persists to localStorage only
  (key: blood-moon-preferences), confirmed by direct inspection -- zero
  coupling to this schema exists today.
EXTERNAL_COUPLING: NONE -- PlayerPreference.accountId is a bare string,
  deliberately not a Prisma @relation to Account (no FK, no cascade
  behavior tied to account lifecycle at all). The only real relation is
  the internal PlayerPreference -> PlayerPreferenceDefinition FK.
TESTS: NOT_APPLICABLE (no runtime code exists to test)
SCHEMA_VALIDATION: PASS (`prisma validate` clean; `prisma generate`
  clean)
INTEGRATION_STATUS: NOT_INTEGRATED
PRODUCTION_STATUS: NOT_DEPLOYED
KNOWN_DEBT: runtime intentionally absent -- this is the whole point of
  SCHEMA_FOUNDATION_ONLY, not a gap. Zero external dependency confirmed
  -- safe to integrate independently of every other branch.
LAST_UPDATED: 2026-09-09
```
