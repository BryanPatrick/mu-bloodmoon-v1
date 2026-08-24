# Minimal real account write set — decision (Phase 3C Part A/B)

## REQUIRED_MEMB_INFO_COLUMNS (NOT NULL, no DB default — must be supplied)

`memb___id`, `memb__pwd`, `memb_name`, `sno__numb`, `bloc_code`,
`ctl1_code`, `AccountLevel`, `AccountExpireDate`, `Lock`, `RewardVip`,
`RewardCoin`, `RewardIndication`, `Admin`, `activated` — 14 columns
(`memb_guid` excluded, it's the IDENTITY).

## DEFAULTABLE_MEMB_INFO_COLUMNS

None at the database level — zero `DEFAULT` constraints exist anywhere on
either table. "Defaultable" in practice means the columns that are
merely nullable and can be omitted/left `NULL`: `post_code`, `addr_info`,
`addr_deta`, `tel__numb`, `phon_numb`, `mail_addr`, `fpas_ques`,
`fpas_answ`, `job__code`, `appl_days`, `modi_days`, `out__days`,
`true_days`, `mail_chek`, `last_login`, `activation_id`,
`last_login_ip`, `country`, `dmn_country`.

## IDENTITY_COLUMNS

`MEMB_INFO.memb_guid`, `AccountCharacter.Number` (this second one was not
previously confirmed — new finding this phase). Neither is ever supplied
by an INSERT.

## Chosen values for the 14 required `MEMB_INFO` columns

| Column | Value | Basis |
|---|---|---|
| `memb___id` | generated legacyLogin | Part D |
| `memb__pwd` | generated game credential | Part C |
| `memb_name` | same as `memb___id` | matches legacy `create_account()`'s own `memb_name = user` pattern |
| `sno__numb` | fixed, obviously-fake 18-char filler | matches legacy pattern of a placeholder value in this field; never a real document number |
| `bloc_code` | `'0'` | unanimous real value across all 6 existing accounts |
| `ctl1_code` | `'0'` | **deliberately diverges** from the observed real value (`1` on all 6 existing accounts) — see below |
| `AccountLevel` | `0` | unanimous real value |
| `AccountExpireDate` | `1900-01-01` | unanimous real value — this install's "never expires" sentinel |
| `Lock` | `0` | unanimous real value |
| `RewardVip` | `0` | unanimous real value |
| `RewardCoin` | `0` | unanimous real value |
| `RewardIndication` | `0` | unanimous real value |
| `Admin` | `0` | unanimous real value |
| `activated` | `0` | unanimous real value (all 6 existing accounts function despite this — confirms `activated` does not gate real GameServer authentication in this install) |

**Why `ctl1_code` deliberately does not match the observed real value**:
legacy code evidence classifies `ctl1_code` as a GM/staff authority flag
(`docs/game-data/legacy-web-intelligence/account.md`). All 6 existing
accounts happening to carry `ctl1_code = 1` is not proof that's the safe
default for a *new* account — it may just mean the person who seeded
those 6 QA/test rows gave them GM-adjacent flags for testing. Copying an
unverified value that might grant elevated in-game authority to a brand
new account would be an unacceptable, silent privilege-escalation risk.
`'0'` is used instead — the unambiguous, non-privileged choice.

## AccountCharacter — required immediately

**Yes** — confirmed by both (a) 100% empirical coverage (Phase 2A.1: all
6 real `MEMB_INFO` accounts have exactly one matching `AccountCharacter`
row) and (b) two `NOT NULL` columns with no default (`ExtClass`,
`ExtWarehouse`) that must be explicitly supplied regardless. Both are `0`
on all 6 real rows, unanimous, no ambiguity.

`Id` on `AccountCharacter` must equal `memb___id` on `MEMB_INFO` exactly
(the confirmed logical join). All `GameID1..10`/`GameIDC`/`MoveCnt` stay
`NULL` — zero characters at creation, matching the "no Character row"
requirement (Part S).

## What this phase does NOT create

No `Character` row, no `warehouse` row, no `CashShopData` row, no
`MEMB_STAT` row — no evidence found that any of these are required for a
functional account to exist; all are nullable/optional/populated later
by real gameplay or by a separate provisioning step this phase does not
implement.
