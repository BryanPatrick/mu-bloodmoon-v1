---
status: DRAFT
category: product/economy-audit
audience: internal (product + engineering)
lastVerified: 2026-08-29
evidenceMethod: read-only SQL via bm-sql.cmd (dedicated bloodmoon_observer login, CanSelect=1/CanUpdate=0, confirmed via `bm-sql health` before any query; single-statement SELECT only, no DDL/DML/multi-statement/OPENROWSET/EXEC — enforced server-side per RemoteOps documentation). No writes attempted or possible with this credential.
---

# Pre-Beta Account Cleanup — Read-Only Verification (Part M)

**Bryan previously requested all pre-Beta accounts be deleted. This document does NOT claim that happened — it reports only what a real, read-only query returned, today, on the GameServer database.**

## What was verified (GameServer / MuOnline SQL database)

| Metric | Real count | Query |
|---|---|---|
| Total game accounts (`MEMB_INFO`) | **9** | `SELECT COUNT(*) FROM MEMB_INFO` |
| Total characters (`Character`) | **14** | `SELECT COUNT(*) FROM Character` |
| Accounts with any VIP-day reward ever recorded (`RewardVip > 0`) | **0** | `SELECT COUNT(*) FROM MEMB_INFO WHERE RewardVip > 0` |

## A real, notable anomaly — reported factually, not over-interpreted

**All 9 accounts share the exact same creation timestamp: `17/08/2026 14:27:45`** (`MIN(appl_days) = MAX(appl_days)`). This is not how organic player registrations look — real signups spread out over time. This is consistent with (but does not prove) a **batch creation event** — either a database seed/reset script, or a bulk test-account setup, run at that exact moment.

**5 of the 9 account usernames match an obvious test/admin/seed/demo naming pattern** (`memb___id LIKE '%test%' OR '%admin%' OR '%seed%' OR '%demo%'`) — checked via a count-only query that never exposed the actual usernames, to avoid pulling more personal data than necessary for this verification. The remaining 4 do not match this simple pattern and could be either genuine early testers or differently-named test accounts — this audit cannot distinguish those from the aggregate count alone.

**A genuinely unresolved oddity**: character `MDate` values range from `23/04/2026` to `25/08/2026` — a wider span that includes dates **four months before** the uniform `17/08/2026` account-creation timestamp. If `MDate` reflects true character creation, this would be inconsistent with all 9 linked accounts being created on the same day in August. Two honest possibilities, neither confirmed: (a) `MDate` tracks last-modified rather than creation, so old characters could still be attached to newly-recreated accounts if some prior reset preserved character rows while regenerating account rows, or (b) some characters in the table are orphaned from accounts that no longer exist (a `Character.AccountID` not matching any current `MEMB_INFO.memb___id` — **not checked this pass**, would need one more query to confirm and wasn't run to keep this verification narrowly scoped). Flagged as a genuine open question, not resolved here.

## What could NOT be verified this phase — reported honestly, not glossed over

**Portal (apps/api / Postgres) account counts were not obtained.** No established, sanctioned read-only credential or tool for the Postgres portal database was found in this environment this phase, unlike the real, documented `bloodmoon_observer` SQL Server login used above for the GameServer database. Attempting an ad-hoc connection without an established safe credential path would not meet the same safety bar as the GameServer query above, so it was not attempted. **`CURRENT_PORTAL_ACCOUNT_COUNT` remains genuinely unknown from this audit** — this is a real gap, not a number to be inferred from the GameServer count (the two systems are architecturally separate — an `Account` row in apps/api's Postgres schema is not the same record as a `MEMB_INFO` row here).

## Interpretation — deliberately conservative

The small, uniform-timestamp, partly-test-named account set on the GameServer side is **consistent with** a cleanup having happened around 17/08/2026, followed by a handful of test/seed accounts. It is **not proof** that a deliberate "delete all pre-Beta accounts" action occurred — the same pattern would also result from, say, a database restore to a clean snapshot, or a fresh environment setup unrelated to any specific cleanup request. **This audit does not assert pre-Beta account deletion happened; it reports the real, current state and lets that state speak for itself**, per the explicit instruction not to claim it happened without verification.

## Safe read-only procedure, for reuse

```powershell
& "D:\MU\Tools\RemoteOps\bm-sql.cmd" health
& "D:\MU\Tools\RemoteOps\bm-sql.cmd" query 'SELECT COUNT(*) FROM MEMB_INFO'
& "D:\MU\Tools\RemoteOps\bm-sql.cmd" query 'SELECT COUNT(*) FROM Character'
```
Always run `health` first and confirm `CanSelect=1`/`CanUpdate=0` before trusting any query result in a fresh session — this is the same discipline applied throughout this audit. No `DELETE`/`UPDATE`/`INSERT` was run or attempted; the credential used cannot perform them (confirmed server-side, not just client-side self-restraint).
