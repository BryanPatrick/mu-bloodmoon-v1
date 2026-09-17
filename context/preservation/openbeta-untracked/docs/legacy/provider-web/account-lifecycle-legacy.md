---
status: SECOND_PASS_COMPLETE
category: legacy
audience: internal (engineering)
lastVerified: 2026-08-31
confidence: CONFIRMED (real source read)
---

# Legacy provider-web — account lifecycle

## `appl_days` — resolved

`model.account.php`'s `create_account()` writes `appl_days` (a Unix
timestamp) at registration time. Two real readers:
`tasks/RemoveNotVerifiedAccounts.php` (15-day unverified-account purge
cron, disabled by default: `DELETE FROM MEMB_INFO WHERE activated = 0 AND
appl_days < DATEADD(DAY, -15, GETDATE())`) and `model.admin.php` (admin
account-detail display, showing registration date). This resolves the
column's original mystery — it is a registration timestamp, not
referenced by any of the 90 native GameServer procedures (confirmed
separately via full-text search).

## Registration and password recovery

Registration (`controllers/controller.registration.php`) writes
`activated = 0` initially; the 15-day purge above is the only cleanup
mechanism for accounts that never verify, and it's disabled by default in
this snapshot's scheduler config.

Password recovery flow: `controller.lost_password.php` →
`create_reminder_entry_for_name()` writes a reset token into
`DmN_Account_Invt` (see [`database-mapping.md`](database-mapping.md) for
why that table's name is misleading) → user follows the emailed link →
`load_reminder_by_code()` validates it → password is reset directly
against `MEMB_INFO.memb__pwd` (plaintext in this deployment's
configuration — see [`security-findings.md`](security-findings.md)
finding #7).

## Ban/unban

`CheckBans.php`/`RemoveBans.php` (both disabled by default in this
snapshot) two-way-reconcile `MEMB_INFO.bloc_code`/`Character.CtlCode`
(native ban flags) against a web-side `DmN_Ban_List` mirror table.

## Account deletion (admin capability)

The admin panel can fully delete an account: `MEMB_INFO` row, all
characters, `AccountCharacter`, web-side logs, `DmN_Shop_Credits`, and
ban-list entries — see
[`useful-historical-reference.md`](useful-historical-reference.md)'s
admin-capability inventory for the complete list of what an admin could
do. This is unrelated to and does not inform Blood Moon's own
purge/anonymize design (`bm_AnonymizeGameAccount`/`bm_PurgeGameAccount`),
which was built from a full 138-table dependency audit of the native
schema, not from this legacy admin tool's own (narrower, less
systematically verified) delete logic.

## Relevance

None of this code is deployed to production (Decision 1, NOT_DEPLOYED).
The `appl_days` resolution is the one finding with direct documentation
value — it closes a previously-open question in
`docs/gameserver/database/account-data-map.md` about what that column is
for.
