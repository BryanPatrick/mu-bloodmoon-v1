---
status: DRAFT_FOR_REVIEW
category: accounts
audience: internal (Bryan approval required before any action)
lastVerified: 2026-08-30
---

# Pre-Beta Account Review — Phase 14 Part D

**Read-only. Nothing was deleted, locked, or modified.** Queried via `bm-sql.cmd` (`bloodmoon_observer`, `CanSelect=1`/`CanUpdate=0`, confirmed no write capability) against the real production `MuOnline` SQL Server. Columns selected deliberately exclude `mail_addr`, `addr_info`, `addr_deta`, `tel__numb`, `phon_numb`, `sno__numb` (social/ID number), `fpas_ques`/`fpas_answ` (security question/answer), and `last_login_ip` — every field below is either an account/character identifier already used in prior-phase docs or an operational status flag, never contact/personal-identity data.

**Every status below is a recommendation for Bryan to approve, reject, or override — none of it is a decision this phase made or acted on.**

## Accounts (9 real rows in `MEMB_INFO`)

| Username | AccountLevel | Lock | RewardVip/Coin/Indication | Admin | activated | Creation (`appl_days`) | Characters | Suggested status | Why |
|---|---|---|---|---|---|---|---|---|---|
| `BMFAKE01` | 0 | 0 | 0/0/0 | 0 | 0 | 2026-08-17 14:27:45 | 1 (untouched, cLevel 1) | **SAFE_PRE_BETA_PURGE** | Name itself signals "fake"; character never progressed at all |
| `teste` | 0 | 0 | 0/0/0 | 0 | 0 | *(blank — see note)* | 3 (one at cLevel 400, `CtlCode=32`) | **UNREVIEWED** | Portuguese "test," but one character reached max level — worth a human glance before purging, not obviously safe |
| `teste1` | 0 | 0 | 0/0/0 | 0 | 0 | *(blank)* | 4, including one named **"Bryan"** at cLevel 400 with **ResetCount=104** | **DO_NOT_PURGE** | A character named "Bryan" with 104 resets represents substantial real testing/dev activity — very likely your own primary working account. Needs your explicit confirmation, not an automatic sweep |
| `teste2` | 0 | 0 | 0/0/0 | 0 | 0 | *(blank)* | 5 (one with ResetCount=4, rest at 0) | **UNREVIEWED** | Light but nonzero activity (`Lucas`, 4 resets) — not obviously disposable |
| `teste3` | 0 | 0 | 0/0/0 | 0 | 0 | *(blank)* | 1, **"EtheriusZ"** at cLevel 400, **ResetCount=102**, `CtlCode=32` | **DO_NOT_PURGE** | Same reasoning as `teste1` — 102 resets is substantial real progress, not throwaway test data, regardless of the "teste" naming pattern |
| `teste4` | 0 | 0 | 0/0/0 | 0 | 0 | *(blank)* | 0 | **SAFE_PRE_BETA_PURGE** | Empty shell account, no characters at all |
| `q3c5v6vrrx` | 0 | 0 | 0/0/0 | 0 | 0 | *(blank)* | 0 | **SAFE_PRE_BETA_PURGE** | Auto-generated-looking username (random alphanumeric, matches the shape of test-suite-generated identifiers), never activated, no characters |
| `q3def7ec77` | 0 | 0 | 0/0/0 | 0 | 0 | *(blank)* | 0 | **SAFE_PRE_BETA_PURGE** | Same reasoning |
| `uec490107b` | 0 | 0 | 0/0/0 | 0 | 0 | *(blank)* | 0 | **SAFE_PRE_BETA_PURGE** | Same reasoning |

**Every account** has `Admin=0`, `Lock=0`, `AccountLevel=0`, and `activated=0` — none is a GameServer-side staff/admin account, none is locked, none carries any VIP/coin/indication reward, and **none has ever completed the activation flow**. This last point is itself worth a product question (see below) rather than an assumption.

## Characters (14 real rows in `Character`, safe fields only)

Already folded into the account table above by reference; full per-character detail (name, class, level, resets) is in the table. No inventory/warehouse/item data was queried — out of scope for an account-lifecycle review and unnecessary to reach a purge-eligibility judgment.

## Two findings worth Bryan's attention, neither acted on

1. **`appl_days` (GameServer-side account creation timestamp) is populated for only 1 of 9 accounts.** This does not contradict Phase 12's earlier finding that "all 9 accounts share one exact creation timestamp" — that finding was about the **portal's** `Account.createdAt` (a separate Prisma/MySQL database), not this real GameServer SQL Server's `MEMB_INFO.appl_days`. The two databases disagree on when 8 of these 9 accounts were "created," which most likely means those 8 `MEMB_INFO` rows were provisioned through a path that doesn't populate `appl_days` (e.g., a direct/manual GameServer-side insert rather than the normal registration flow) — flagged as `UNKNOWN`, not resolved further this phase.
2. **`q3c5v6vrrx` / `q3def7ec77` / `uec490107b`'s username shape closely resembles this session's own e2e test-suite username generator** (`Date.now().toString(36) + Math.random().toString(36).slice(2, 8)`, used throughout `apps/api/test/*.e2e-spec.ts`). This is circumstantial, not proven — but worth Bryan knowing: if any automated test run was ever pointed at a shared/staging database that later became (or fed) production `MEMB_INFO`, that would explain these three accounts precisely. Not something this phase can confirm or rule out from data alone.

## Explicit non-assumptions carried forward from this phase's own architecture doc

Per [`account-deletion-architecture.md`](account-deletion-architecture.md)'s `PRE_BETA_PURGE` eligibility rules: none of the `SAFE_PRE_BETA_PURGE`-suggested accounts above have been checked against the *portal-side* Prisma `Account`/`RechargeIntent`/`PurchaseIntent`/`VipGrant` tables in this pass — this document only covers the GameServer-side `MEMB_INFO`/`Character` data. A real purge attempt against any of these accountIds must still pass the full eligibility check (zero currency balance, no completed payment, no VIP grant history, correct `accountPhase`/`betaCycleId` scope) against the portal database before executing, exactly as designed — this table is a GameServer-side input to that decision, not a substitute for it.

**No deletion, lock, or modification was executed against any of these 9 accounts or 14 characters.**
