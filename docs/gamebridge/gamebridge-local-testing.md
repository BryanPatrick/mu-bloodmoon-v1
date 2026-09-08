---
status: LOCAL_IMPLEMENTATION_COMPLETE_INCLUDING_REAL_SQL_SERVER_VALIDATION_AND_PRODUCTION_SCHEMA_VERIFICATION (updated 2026-08-30, closure round -- see "SQL layer, updated" and "Closure round" sections below)
category: gamebridge/infrastructure
audience: internal
lastVerified: 2026-08-30
---

# GameBridge Agent extension — local implementation and testing record

Companion document to `docs/gamebridge/gamebridge-agent-extension-plan.md`
(the architecture/design plan) and the two `docs/environment/*.md` files
(the environment state that shaped what could actually be executed this
round). This document records what was actually built, tested, and left
pending during the local-implementation phase Bryan approved on
2026-08-30, following the permanent documentation rule: nothing here
should live only in chat.

## 1. O que foi feito

Four new GameBridge operations — `GRANT_VIP`, `SYNC_VIP_TIER`,
`ANONYMIZE_GAME_ACCOUNT`, `PURGE_GAME_ACCOUNT` — were added across every
layer of the existing, production-proven `CREATE_GAME_ACCOUNT` pipeline
except the one layer this session's environment could not exercise (the
SQL Server engine itself):

- **Cloudflare Worker** (`apps/game-data-worker`) — fully implemented and
  tested locally (real `workerd` + local D1 via
  `@cloudflare/vitest-pool-workers`, no Cloudflare account needed).
- **GameBridge Agent** (`apps/game-bridge-agent`, .NET 8) — fully
  implemented and tested locally (xUnit, in-memory fakes for the
  transport and database writer, no real SQL Server needed for this
  layer's own tests since it tests dispatch/idempotency logic against a
  fake `IGameDatabaseWriter`).
- **Portal reconciler** (`apps/api`) — the `SYNC_VIP_TIER` reconciler
  (`VipSyncService`) fully implemented and tested locally against a real
  local MySQL database.
- **Stored procedures** (`dbo.bm_GrantVip`, `dbo.bm_SyncVipTier`,
  `dbo.bm_AnonymizeGameAccount`, `dbo.bm_PurgeGameAccount`) — T-SQL text
  written and reviewed. **UPDATE, later the same day**: ANTERIOR — this
  document originally reported these as never executed, since this
  session's Windows account could not install a SQL Server engine
  (`docs/environment/sql-server-test-environment.md`). MOTIVO DA MUDANÇA —
  Bryan installed SQL Server 2022 Developer Edition manually,
  interactively, with admin privileges, and rebooted to activate mixed-mode
  authentication. NOVA DECISÃO/ESTADO — a disposable local test database
  and all four procedures were built and genuinely executed against the
  real engine, through the real least-privilege `bloodmoon_writer_local`
  login and the real .NET Agent code path. See the dedicated "SQL layer,
  updated" sections below and `docs/environment/sql-server-test-environment.md`
  for the full record.

## 2. Por que foi feito

Bryan's decision (round 2, 2026-08-30): `SYNC_VIP_TIER` was promoted from
"future follow-up" into the same implementation as `GRANT_VIP`,
`ANONYMIZE_GAME_ACCOUNT`, `PURGE_GAME_ACCOUNT` — see
`gamebridge-agent-extension-plan.md`'s decision E. The whole extension is
needed to close three real product gaps: real VIP tier delivery/expiry
enforcement on the GameServer, a real self-service account-deletion path
(anonymize), and a safe pre-Beta test-account cleanup path (purge) — all
explicitly named by Bryan as the top infrastructure priority before Open
Beta.

## 3. Como era antes

Before this round, exactly one GameBridge operation existed end-to-end and
in production use: `CREATE_GAME_ACCOUNT`. The Worker's D1 schema, the
Agent's command models, and the one stored procedure
(`dbo.DmN_CreateGameAccount`) were all hard-typed to that single
operation. No VIP tier ever reached the GameServer through this pipeline;
`VIP_DELIVERY_WORKER_ENABLED` has always been `false` in production for
exactly this reason (no real delivery mechanism existed to enable).

## 4. Como ficou depois

**Worker** (`apps/game-data-worker/src/commands.ts`,
`db/schema.sql`, `db/migrations/0004_gamebridge_extension_commands.sql`):
`game_command.command_type` widened from a single-value `CHECK` to five;
`legacy_login`/`credential_*` columns made nullable (only
`CREATE_GAME_ACCOUNT` uses them); two new nullable columns added
(`payload_json` for the request, `result_detail_json` for the response).
`parseCreate()` now validates each of the five types with its own rules
(`GRANT_VIP`: `targetLevel` 1-3; `SYNC_VIP_TIER`: `desiredLevel` 0-3;
`ANONYMIZE_GAME_ACCOUNT`: no payload at all; `PURGE_GAME_ACCOUNT`:
`betaCycleId` required) and normalizes the payload to exactly the known
field before hashing/storing it, so a canonical `requestHash` stays
deterministic regardless of what extra JSON keys a caller might send.
`canonicalRequest()`, `toClaim()`, `reportCommandResult()`,
`getCommandResult()`, and `retryFailedCommand()` were all generalized to
handle the credential-vs-payload split and the new `detailJson` result
shape (mirroring the existing `membGuid` shape, which stays
`CREATE_GAME_ACCOUNT`-only).

**Agent** (`apps/game-bridge-agent/`): four new command records
(`GrantVipCommand`, `SyncVipTierCommand`, `AnonymizeGameAccountCommand`,
`PurgeGameAccountCommand`), four new `IGameDatabaseWriter` methods, four
new `GameCommandProcessor.ExecuteAsync` overloads with per-type
idempotency handling, `GameCommandWorker.ExecuteClaimedAsync` rewritten as
a dispatch `switch` with an independent kill-switch check per operation
before ever touching the writer.

**Portal** (`apps/api/`): `GameCommandTransportClient`'s envelope type
widened to a discriminated union covering all five command types
(`GameCommandEnvelope`), exported from `GameAccountIdentityModule` for
reuse. A new `VipSyncState` Prisma model + migration
(`20260830160000_gamebridge_vip_sync_state`) tracks "what did we last
successfully tell the GameServer," separate from `VipEntitlement`
(commercial truth). A new `VipSyncService`
(`apps/api/src/modules/vip-sync/`) implements the reconciler design from
plan Part 3B: scans every `VipEntitlement`, computes the effective tier
(`expiresAt > now ? tierAsLevel : 0`), compares against `VipSyncState`,
and issues a `SYNC_VIP_TIER` command on divergence — gated behind its own
`VIP_SYNC_RECONCILIATION_ENABLED` env flag, independent of the Agent-side
kill switch (defense in depth at both ends, per plan Part 14). A new admin
controller (`GET /admin/vip-sync`, `POST /admin/vip-sync/:accountId/sync`)
provides the observability endpoint Part 3B step 6 asked for, gated by two
new permissions (`admin.vip-sync.view`, `admin.vip-sync.manage`).

**SQL** (`references/game-data/sql-discovery/gamebridge-extension-20260830/`):
four stored procedures' full T-SQL text plus a grants-extension script,
following `dbo.DmN_CreateGameAccount`'s exact discipline (static SQL only,
`sp_getapplock`, `TRY/CATCH` + `XACT_ABORT ON`, no raw SQL error text
returned). Written but never run — see section 13.

## 5. Componentes envolvidos

`apps/game-data-worker` (Cloudflare Worker, TypeScript), `apps/game-bridge-agent`
(.NET 8 Worker Service), `apps/api` (NestJS, Prisma/MySQL), the local MySQL
instance `bloodmoon_local`, the disposable-D1 test runtime
(`@cloudflare/vitest-pool-workers`), xUnit (.NET tests).

## 6. Arquivos envolvidos (principais, não exaustivo)

- `apps/game-data-worker/src/commands.ts`, `db/schema.sql`,
  `db/migrations/0004_gamebridge_extension_commands.sql`,
  `test/commands.spec.ts`
- `apps/game-bridge-agent/Commands/*.cs`, `GameDatabase/*.cs`,
  `Configuration/AgentOptions.cs`,
  `BloodMoon.GameBridgeAgent.Tests/*.cs`
- `apps/api/src/modules/game-account-identity/game-command-transport.client.ts`,
  `game-account-identity.module.ts`
- `apps/api/src/modules/vip-sync/vip-sync.service.ts`,
  `vip-sync.controller.ts`, `vip-sync.module.ts`
- `apps/api/src/modules/auth/permissions.ts`
- `apps/api/src/app.module.ts`
- `apps/api/prisma/schema.prisma`,
  `apps/api/prisma/migrations/20260830160000_gamebridge_vip_sync_state/migration.sql`
- `apps/api/test/vip-sync.e2e-spec.ts`
- `references/game-data/sql-discovery/gamebridge-extension-20260830/` (all
  five files)

## 7. Banco/tabelas envolvidas

**D1** (Worker): `game_command` (widened, see section 4).
**MySQL** (Portal, local `bloodmoon_local`): new table `VipSyncState`
(`id`, `accountId` unique+FK→`Account`, `lastSyncedLevel`, `lastSyncedAt`,
`lastSyncCommandId`, `pendingDesiredLevel`, `lastSyncStatus`,
`lastSyncReason`, `updatedAt`).
**SQL Server** (MuOnline, production — untouched, never connected to this
round): the four new procedures would touch `MEMB_INFO`, `Character`,
`AccountCharacter`, `Guild`, `GuildMember`, `CustomMarketShop`,
`CashShopData`, `warehouse`, `CustomQuest`, `T_FriendMain`,
`T_FriendList`, `T_WaitFriend`, and (`PURGE_GAME_ACCOUNT` only) every
`Ranking*` table plus `Gens_Rank` — see the plan's Part 4/5 for the full
dependency map and each procedure's own file header for the exact real
column names used.

## 8. Configurações envolvidas

New environment variables, all default-safe (off/absent):
`GAME_BRIDGE_GRANT_VIP_ENABLED`, `GAME_BRIDGE_SYNC_VIP_TIER_ENABLED`,
`GAME_BRIDGE_ANONYMIZE_ENABLED`, `GAME_BRIDGE_PURGE_ENABLED` (Agent-side
kill switches, `AgentOptions`, all default `false`); `VIP_SYNC_RECONCILIATION_ENABLED`,
`VIP_SYNC_RECONCILIATION_INTERVAL_MS` (Portal-side reconciler gate,
default off, default interval 60000ms if unset). Existing
`GAME_COMMAND_ENVIRONMENT`/`GAME_COMMAND_SERVER_ID`/`GAME_DATA_WORKER_URL`/
`GAME_COMMAND_PORTAL_SECRET`/`GAME_COMMAND_PORTAL_CLIENT_ID` are reused
unchanged by `VipSyncService` (same transport, same secrets).

## 9. Dependências

The Worker/Agent/Portal changes have no new external dependencies (no new
npm/NuGet packages). The SQL procedures depend on a real SQL Server
Developer/Express-compatible engine to ever be tested, which this
session's environment does not have (`docs/environment/sql-server-test-environment.md`).

## 10. Riscos

See the plan's own Part 16 (Segurança) for the full threat table —
unchanged by this document. The one new operational risk worth restating
here: `VipSyncService`'s reconciler, once enabled, will call
`transport.create()` for every diverging account on every tick. Until the
Agent-side `GAME_BRIDGE_SYNC_VIP_TIER_ENABLED` switch is also on, every
one of those commands will sit `FAILED_FINAL COMMAND_TYPE_DISABLED` at the
Agent — harmless, but worth knowing before turning
`VIP_SYNC_RECONCILIATION_ENABLED` on in any environment, so the resulting
command backlog isn't mistaken for a bug.

## 11. Decisões tomadas (nesta rodada de implementação, além das já registradas no plano)

- **`VipSyncState` as a dedicated table, not a reuse of `GameBridgeJob`** —
  per plan Part 3B's own explicit instruction that this is "not a thin
  wrapper" around the one-shot job-queue pattern `VipDeliveryService`
  uses.
- **`pendingDesiredLevel` as a separate field from `lastSyncedLevel`** — a
  design choice made during implementation, not specified in the plan: the
  Agent's `detailJson` result is documented as being for audit, not a
  guaranteed-stable machine-readable contract this service should parse
  back out. Storing the desired value at command-creation time and
  promoting it only on confirmed `SUCCEEDED` avoids that fragile
  round-trip.
- **SYNC_VIP_TIER command `expiresAt` window shortened to 1h**, not the
  full 24h `CREATE_GAME_ACCOUNT` uses — a single-column update has no
  reason to stay claimable for a full day, and a shorter window reduces
  how long a stale command can sit `AVAILABLE`. Flagged in the plan's own
  Part 2 as an open call ("Bryan may want a different window"); this
  implementation's own default is 1h, easily changed later.
- **Reconciler reason heuristic** (`PURCHASE`/`EXPIRY`/`RECONCILIATION_DIVERGENCE`)
  implemented exactly as sketched in plan Part 2's SYNC_VIP_TIER
  auditoria row — a simple three-way classification based on whether
  `lastSyncedLevel` was null (first sync), higher than the new effective
  level and the new level is 0 (expiry), or anything else (divergence).

## 12. Alternativas descartadas

- **Parsing `detailJson` to recover the synced level** — rejected in favor
  of `pendingDesiredLevel` (section 11) for the reason given there.
- **A single ranking-table-per-JSON-key breakdown in `bm_PurgeGameAccount`'s
  result** — rejected in favor of one aggregated `rankingRows` count,
  matching the plan's own "small, fixed-shape JSON object" preference
  (Part 6) over one key per table.
- **A full pre-purge SQL Server backup** — already rejected in the plan
  itself (Part 11, decision D); restated here only for completeness.

## 13. Testes executados

**Worker** (`apps/game-data-worker`): `npm test` (vitest,
`@cloudflare/vitest-pool-workers`) — **52/52 passing** (40 pre-existing +
12 new, covering all four new command types' validation, claim, and
result-reporting paths). `npm run typecheck` (`tsc --noEmit`) —
**0 errors**.

**Agent** (`apps/game-bridge-agent`): `dotnet test` — **101/101 passing**
(75 pre-existing + 26 new, covering per-operation idempotency at the
processor level and kill-switch dispatch at the worker level). 0 build
warnings.

**Portal** (`apps/api`): `apps/api/test/vip-sync.e2e-spec.ts` against a
real local MySQL database (`bloodmoon_local`) — **7/7 passing**, covering
divergence detection (never-synced, already-in-sync, expiry-to-zero),
honest-failure-on-unconfigured-transport for both the automatic tick and
the manual admin trigger (never a false "synced" result), and in-flight
reconciliation leaving state untouched on a transport error. Regression
run of three related pre-existing suites
(`game-account-production-provisioning.e2e-spec.ts`,
`vip-delivery.e2e-spec.ts`, `game-provisioning-admin-rbac.e2e-spec.ts`) —
**14/14 passing**, confirming the widened `GameCommandTransportClient`
type didn't break the existing `CREATE_GAME_ACCOUNT` path. `npm run check`
(structure checks + `tsc --noEmit`) — **all green**.

**SQL — UPDATE, later the same day**: ANTERIOR — this section originally
read "0 tests executed." NOVA — with SQL Server 2022 Developer Edition now
installed (`docs/environment/sql-server-test-environment.md`), the full
local environment was built and exercised for real:

- **T-SQL smoke tests** (`references/game-data/sql-discovery/gamebridge-extension-20260830/derived/local-smoke-test.sql`
  + `local-smoke-test-2.sql`, run via `sqlcmd`): **23/23 checks PASS**,
  covering GRANT_VIP/SYNC_VIP_TIER/ANONYMIZE_GAME_ACCOUNT/PURGE_GAME_ACCOUNT
  including block conditions (guild master, active market listing, staff
  rejection), idempotency, and the CustomQuest FK lockstep-rename.
- **Real .NET Agent integration tests**
  (`apps/game-bridge-agent/BloodMoon.GameBridgeAgent.Tests/SqlServerLocalIntegrationTests.cs`,
  run via `dotnet test`): **22/22 new tests PASS**, using the actual
  `SqlServerGameDatabaseWriter` connected through the real, verified
  least-privilege `bloodmoon_writer_local` login (not sysadmin) — this is
  the genuine "Agent → real local SQL Server" validation, covering AL1-3
  grants, extension/no-downgrade, duplicate commands, real concurrency
  (`Task.WhenAll` racing calls), divergence reconciliation, idempotent
  replay, staff/guild-master blocks, and post-verification queries after
  each mutating call.
- **Full Agent suite** (unit + integration together): **123/123 passing,
  0 warnings, 0 errors.**
- Plan Part 12's full manual test matrix (every bullet Bryan listed for
  each of the four operations) is covered by the union of the two test
  files above — see `docs/environment/sql-server-test-environment.md`'s
  own results section for the itemized mapping.

## 14. Resultados

All Worker/Agent/Portal layers pass their full test suites, including new
coverage specific to this round's four operations, with zero regressions
detected in the pre-existing `CREATE_GAME_ACCOUNT` path.

**UPDATE, later the same day**: ANTERIOR — this line originally read "The
SQL layer is written and internally reviewed... but has zero empirical
validation." NOVA — with SQL Server 2022 installed and validated (section
13 above), the SQL layer now has real, passing test coverage too: 23/23
T-SQL smoke checks, 22/22 real Agent-integration tests (123/123 including
the pre-existing suite), and the least-privilege grant model independently
confirmed via `HAS_PERMS_BY_NAME` while connected AS the restricted login.
Two `VERIFY_BEFORE_USE` design choices in `bm_AnonymizeGameAccount`
(tombstone naming scheme, the `NOCHECK`/`CHECK CHECK CONSTRAINT` technique)
are no longer just reasoned-through — both were exercised for real by the
integration tests (`AnonymizeGameAccount_full_pass_with_all_dependency_types`
proves the FK stays satisfied after the lockstep rename) and passed.

Additionally, since this document was first written, the ANONYMIZE_GAME_ACCOUNT/
PURGE_GAME_ACCOUNT senders were built: `AccountLifecycleBridgeService`
(`apps/api/src/modules/accounts/account-lifecycle-bridge.service.ts`),
`PURGE_GAME_ACCOUNT` queueing added to `executePreBetaPurge()`, PURGE RBAC
narrowed to a dedicated `admin.accounts.purge.manage` permission, and a
structured exit-feedback questionnaire added to the self-service deletion
request flow. See `docs/accounts/account-deletion-architecture.md`'s
"Phase 15 addendum" section for the full design; the combined
`account-lifecycle-bridge.e2e-spec.ts` + `account-deletion-request.e2e-spec.ts`
+ `account-deletion.e2e-spec.ts` regression run is 36/36 passing (7 of
those specifically the new lifecycle-bridge tests, the rest pre-existing
Phase 14/15 coverage confirmed unbroken).

## 15. Problemas encontrados

- **`prisma migrate dev`/`--create-only` fails against `bloodmoon_local`**:
  the `bloodmoon` local MySQL user lacks permission to create a shadow
  database, which Prisma 5's `migrate dev` requires even in
  `--create-only` mode. **Not a new problem** — every migration in this
  project's history since at least Phase 13 was hand-authored for exactly
  this reason (confirmed by inspecting `20260830150000_phase15_account_deletion_request/migration.sql`'s
  style). Resolved the same way: hand-wrote the `CREATE TABLE`/`ALTER
  TABLE` SQL matching Prisma's own generated style, then applied it with
  `prisma migrate deploy` (which does not need a shadow database).
- **`prisma generate` failed with `EPERM` on
  `query_engine-windows.dll.node`**: four orphaned `node.exe` processes
  from this session's earlier (already-resolved) `AuthAbuseGuard`
  debugging saga were still running (identifiable by their command line —
  `jest ... account-deletion-request.e2e-spec.ts ... bisect2.json`/`bisect3.json`),
  holding a file lock on the Prisma query engine binary. Resolved by
  stopping those four specific processes (confirmed via `Get-CimInstance
  Win32_Process` command-line inspection before stopping anything, per
  this project's standing rule against blind process kills) and retrying.
- **A pre-existing test file's literal `GameCommandState` object broke
  compilation** after `detailJson` was added as a required field:
  `game-account-production-provisioning.e2e-spec.ts:61` constructed a
  `GameCommandState` without it. Fixed with a one-line addition
  (`detailJson: null`) to that literal — the field is genuinely required
  on every real response the Worker now sends (`getCommandResult()`
  always includes it), so the fix was to update the test, not to make the
  type optional.
- **Worker's `reportCommandResult()` initially rejected the pre-existing
  `FAILED_RETRYABLE`/`FAILED_FINAL` test cases that explicitly send
  `membGuid: null`**: an overly strict validation check treated an
  explicit `null` the same as a malformed value. Fixed by distinguishing
  "field present and non-null but invalid" (reject) from "field present
  and explicitly null" (valid — means "no value for this result shape").

## 16. Correções feitas

All four problems in section 15 were fixed in the same working session
before moving on — see the corresponding commit/diff for exact lines.

## 17. Limitações atuais

- ~~The four new stored procedures have never executed against any SQL
  Server engine~~ — **RESOLVED, later the same day**: executed and passing
  against a real SQL Server 2022 Developer Edition instance (section 13/14
  above). Both `VERIFY_BEFORE_USE` design choices in `bm_AnonymizeGameAccount`
  (tombstone naming scheme; the `NOCHECK`/`CHECK CHECK CONSTRAINT` technique)
  were exercised for real and passed — no longer just reasoned-through.
- `CustomMarketShop`'s real "active listing" status column is still
  unconfirmed against production — both procedures still block on ANY
  existing row for the seller (safe, possibly stricter than necessary).
  The local test schema reproduces this same conservative behavior; this
  limitation is about production's real column, not something the local
  test environment could resolve on its own.
- `T_FriendMain`/`T_FriendList`/`T_WaitFriend`'s exact column layout beyond
  `Name` is still asserted from the plan's own stated join keys, not
  independently re-verified against production's real `sys.columns` — the
  local test schema uses the same assumed shape, so passing local tests
  don't newly confirm this against production specifically.
- ~~`ANONYMIZE_GAME_ACCOUNT` and `PURGE_GAME_ACCOUNT` have no Portal-side
  sender yet~~ — **RESOLVED**: `AccountLifecycleBridgeService` now sends
  both (see section 14's update above and
  `docs/accounts/account-deletion-architecture.md`'s Phase 15 addendum).
  The read-only `PRE_BETA_PURGE` dry-run admin UI already existed before
  this round (`GET pre-beta-purge/dry-run`, Phase 14) — what was missing
  and is now built is the *GameServer-side* delivery and its own
  observability (`GET pre-beta-purge/:betaCycleId/report`, `GET
  lifecycle-bridge`).
- ~~`AuditEvent` mirroring... has not been implemented — there is no
  sender yet to mirror~~ — **RESOLVED**: `AccountLifecycleBridgeService`
  writes `gamebridge.anonymize.sent`/`.completed`/`.failed` (and the
  `purge` equivalents), correlated via `commandId`.
- The Portal-side reconciler's `IN_FLIGHT_STATUSES` polling has no
  attempt ceiling/backoff of its own (unlike `VipDeliveryService`'s
  `MAX_ATTEMPTS`) — it relies entirely on the transport-layer `expiresAt`
  window to eventually terminalize a stuck command. This was a deliberate
  simplification (re-sending the same `desiredLevel` is always safe, so
  there is no harm in retrying indefinitely) but is worth naming as a
  difference from the more defensive `VipDeliveryService` pattern.

## 18. Pendências reais (para além desta rodada)

Itens 1, 2, 3 e 5 abaixo (na redação original desta seção) foram
resolvidos nesta mesma sessão, depois que Bryan instalou o SQL Server —
ver seção 17 para o detalhe de cada um. O que resta genuinely pendente:

1. Confirmar os detalhes de schema ainda não confirmados (coluna real de
   "active listing" do `CustomMarketShop`; layout exato de
   `T_FriendMain`/`T_FriendList`/`T_WaitFriend`) contra a **produção** real
   (`sys.columns`) — o ambiente local não resolve isso sozinho, já que ele
   reproduz a mesma suposição, não a verifica.
2. Instalar as quatro procedures + grants na produção **só depois** de: (a)
   revisão humana adicional do texto T-SQL (agora com evidência real de
   funcionamento, mas ainda sem revisão de um segundo humano), (b) decisão
   explícita do Bryan de avançar para produção, (c) todos os kill switches
   permanecerem desligados até um teste controlado.
3. Habilitar `ACCOUNT_LIFECYCLE_BRIDGE_ENABLED`/`VIP_SYNC_RECONCILIATION_ENABLED`/
   os kill switches do Agent em qualquer ambiente real (mesmo de staging)
   é uma decisão separada, não implícita neste trabalho.
4. O questionário de saída (seção Phase 15 addendum,
   `docs/accounts/account-deletion-architecture.md`) ainda não tem UI —
   só o backend (aceitar, nunca bloquear, anonimizar na execução).
5. O "Centro de Privacidade" consolidado (visualizar/copiar/corrigir
   dados, gerenciar consentimentos) continua não construído — a
   arquitetura do fluxo de exclusão já é compatível (ver o addendum), mas
   nada além disso foi implementado, por decisão explícita de escopo do
   Bryan para esta rodada.

## 19. Como operar

Nothing in this round is enabled by default. To exercise any of it in a
non-production environment: set the relevant Agent `AgentOptions`
kill-switch(es) to `true` in `appsettings.Local.json` or environment
variables, and/or set `VIP_SYNC_RECONCILIATION_ENABLED=true` for the
Portal reconciler — never in production until the rollout plan's steps
1-10 (`gamebridge-agent-extension-plan.md` Part 13) are actually green
against a real SQL Server.

## 20. Como validar

Worker: `cd apps/game-data-worker && npm test && npm run typecheck`.
Agent: `cd apps/game-bridge-agent && dotnet test`.
Portal: set `E2E_LOCAL_MYSQL_URL`/`DATABASE_URL` per
`docs/environment/development-environment.md`'s DPAPI-credential pattern,
then `cd apps/api && npx jest --config ./test/jest-e2e.json --runInBand
vip-sync.e2e-spec.ts` (and the three regression suites named in section
13 for a broader check), then `npm run check`.

## 21. Como reverter/recuperar

Nothing in this round has been deployed or enabled anywhere. To fully
back out the local-only changes: revert the commit(s) covering this round
and run `npx prisma migrate resolve --rolled-back
20260830160000_gamebridge_vip_sync_state` against `bloodmoon_local` (or
just `DROP TABLE VipSyncState` directly, since it has no data yet in any
real environment) if the migration was already applied locally. No
production system, permission, or data is affected by any of this
document's contents.

## 22. Rodada de fechamento (2026-08-30, mesma data) — schema de produção + manuais + frontend

Depois do registro acima, Bryan pediu para fechar quatro coisas
adicionais na mesma rodada, todas concluídas:

1. **Verificação de schema de produção somente-leitura**: `CustomMarketShop`
   e as quatro tabelas `T_Friend*` foram confirmadas via `bm-sql`
   (`sys.tables`/`sys.columns`/`sys.indexes`). Achado real: `T_FriendList`/
   `T_WaitFriend` não têm coluna `Name` nenhuma — as duas procedures
   (`bm_AnonymizeGameAccount`, `bm_PurgeGameAccount`) tinham essa
   suposição errada, o que teria causado erro de compilação contra
   produção. Corrigido, schema local reconstruído para bater com a
   realidade confirmada, e tudo reexecutado: **28/28 smoke tests T-SQL,
   123/123 testes do Agent .NET** (nenhuma regressão). Ver
   `docs/environment/sql-server-test-environment.md`'s seção "Verificação
   de schema de produção" para a tabela completa MATCH/DIFFERENCE/RISCO.
2. **Quatro manuais dedicados**: `docs/manuals/player/manual-player.md`,
   `docs/manuals/admin/manual-adm.md`,
   `docs/manuals/super-admin/manual-super-admin.md`,
   `docs/manuals/technical/manual-operacao-tecnica.md` — documentos reais,
   não placeholders, cobrindo cada audiência conforme pedido.
3. **Glossário central**: `docs/glossary.md`, incluindo o padrão de notas
   de rodapé numeradas documentado explicitamente.
4. **Fundação de frontend da exclusão de conta**: ver
   `docs/accounts/account-deletion-architecture.md`'s update do mesmo dia
   — página `/painel/privacidade`, questionário de saída, confirmações
   explícitas, status do fluxo, e o endpoint de analytics anonimizado.

Com isso, `MANUALS_UPDATED` deixa de ser `PARTIAL` — os quatro manuais
pedidos existem, com conteúdo real. Ver o FINAL_REPORT desta rodada no
chat para o status consolidado exato.
