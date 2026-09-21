# GameBridge Agent extension — SQL (2026-08-30, validated later the same day)

Status: **REVIEWED AND VALIDATED AGAINST A REAL LOCAL SQL SERVER; NOT INSTALLED ON PRODUCTION.**
Written per `docs/gamebridge/gamebridge-agent-extension-plan.md` (Parts 3–7)
as part of the local-implementation round Bryan approved on 2026-08-30.

**Update, later the same day**: ANTERIOR — this README originally said none
of this SQL had run anywhere, because this session's Windows account had
no SQL Server engine and no admin rights to install one. MOTIVO DA
MUDANÇA — Bryan installed SQL Server 2022 Developer Edition himself,
interactively, with admin privileges, and rebooted to activate mixed-mode
authentication (`docs/environment/sql-server-test-environment.md` has the
full account). NOVA DECISÃO/ESTADO — all four procedures were installed
on a disposable local database (`bloodmoon_gamebridge_test`) and validated
two ways: raw T-SQL smoke tests (23/23 pass) and the real .NET Agent
(`SqlServerGameDatabaseWriter`) connected through the real least-privilege
`bloodmoon_writer_local` login (22/22 new integration tests pass, 123/123
including the pre-existing Agent suite). **Still never run against
production** — that remains a separate, later, explicitly-gated decision.

## Contents

| File | What it is |
|---|---|
| `derived/proposed-bm-grant-vip-procedure.sql` | `dbo.bm_GrantVip` — commercial-delivery, `MAX()`-idempotent, never lowers a tier. **Validated locally.** |
| `derived/proposed-bm-sync-vip-tier-procedure.sql` | `dbo.bm_SyncVipTier` — desired-state sync, unconditional set, 0 is valid. **Validated locally.** |
| `derived/proposed-bm-anonymize-game-account-procedure.sql` | `dbo.bm_AnonymizeGameAccount` — the most complex of the four. **Validated locally**, including both `VERIFY_BEFORE_USE` design choices (tombstone naming, the `NOCHECK`/`CHECK CHECK CONSTRAINT` technique) |
| `derived/proposed-bm-purge-game-account-procedure.sql` | `dbo.bm_PurgeGameAccount` — irreversible, 11-step exclusion order per plan Part 5. **Validated locally.** |
| `derived/proposed-writer-login-grants-extension.sql` | The grants to apply to production's existing `bloodmoon_writer` login — the exact shape validated locally via `local-writer-login.sql`/`local-writer-smoke-test.sql` below |
| `derived/local-test-schema.sql` | **New.** The disposable local test database's schema — 25 tables, exactly one FK (`FK_CustomQuest_Character`, matching production), synthetic only |
| `derived/local-writer-login.sql` | **New.** The local `bloodmoon_writer_local` login/grants (password is a placeholder in this tracked file, per policy — the real local-only password was generated ad hoc and never written to any tracked file) |
| `derived/local-smoke-test.sql`, `local-smoke-test-2.sql` | **New.** Raw T-SQL smoke tests, run as sysadmin for simple fixture setup — 23/23 pass |
| `derived/local-writer-smoke-test.sql` | **New.** The same procedures called through the real restricted `bloodmoon_writer_local` login — proves the least-privilege model actually works, not just that it's configured — 5/5 pass |

## Before any of this is installed on real production SQL Server

1. ~~Resolve the SQL Server environment blocker~~ — done (see above).
2. ~~Build minimal synthetic test fixtures~~ — done (`local-test-schema.sql`).
3. ~~Run the full test matrix~~ — done, both via raw T-SQL and via the real Agent (see `docs/gamebridge/gamebridge-local-testing.md`).
4. ~~Verify `bm_AnonymizeGameAccount`'s two `VERIFY_BEFORE_USE` items~~ — both exercised for real and passed.
5. **Still open**: confirm the exact column layout of `T_FriendMain`/`T_FriendList`/`T_WaitFriend` and `CustomMarketShop`'s real "active listing" predicate against **production's** `sys.columns` — the local test schema reproduces the same assumed shape, so passing local tests don't newly confirm this against the real production database specifically.
6. A second human reviewer should still read the T-SQL text before production install — passing tests prove the code does what it was written to do, not that a reviewer's fresh eyes wouldn't catch something the author missed.
7. Only after 5–6, and only as Bryan's own explicit, separate decision: install on production, apply `proposed-writer-login-grants-extension.sql` to the real `bloodmoon_writer` login, and re-run that script's own `HAS_PERMS_BY_NAME` verification block against production — exactly like `local-writer-smoke-test.sql` did locally.

## Never done by this folder's contents

Altering the real production SQL Server, granting any real production permission, executing a real anonymize or purge against any real account (including the 9 pre-Beta accounts — see plan Part 15, unchanged), enabling VIP sales in production.
