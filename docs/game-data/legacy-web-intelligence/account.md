# Account — legacy evidence

## Core table: `MEMB_INFO` (account DB)

| Column | Role | Evidence |
|---|---|---|
| `memb___id` | Login username; the identifier used almost everywhere else in the app as "the account" | `model.account.php::login_user()`: `SELECT ... FROM MEMB_INFO WHERE (memb___id Collate Database_Default = :user ...)` |
| `memb_guid` | A GUID-shaped surrogate id; used in AdminCP URLs (e.g. `check_account($id)`: `SELECT memb___id, bloc_code FROM MEMB_INFO WHERE memb_guid = :id`) | `model.account.php::login_user()`, `model.admin.php::check_account()` |
| `memb__pwd` | Password | `login_user()` |
| `mail_addr` | Email | `get_email()`/`update_email()`: `SELECT/UPDATE ... mail_addr ... WHERE memb___id = :acc` |
| `bloc_code` | Account block/ban flag (1 = blocked) | `ban_account()`: `UPDATE MEMB_INFO SET bloc_code = 1 WHERE memb___id = :account`; `check_banned_account()` |
| `activated` | Activation flag | `create_account()` INSERT column list |
| `Admin` | Selected by `login_user()`, role/permission indicator | `login_user()` SELECT list |
| `ctl1_code` | GM/staff flag | `search_condition_status()`: `AND m.ctl1_code = 1` for a "gm" filter |
| `last_login`, `last_login_ip`, `dmn_country` | Login telemetry | `login_user()` SELECT list |

**Two identifier conventions for the same account row**: the player-facing session and almost every account-scoped query use `memb___id` (the username string); the AdminCP account-manager list/URL uses `memb_guid` (a GUID). Both resolve to the same `MEMB_INFO` row.

**LEGACY_CODE_CONFIRMED** (verbatim query text, not inference) for all of the above.

## Session identity after login

`application/libraries/lib.session.php::register($key, $val)` is literally
`$_SESSION[$key] = $val;`. `login_user()` calls
`$this->session->register('user', ['id' => $info['memb_guid'], 'username' => $info['memb___id'], ...])`.
Every later account-scoped controller action reads it back via
`$this->session->userdata(['user' => 'username'])`. This is the strongest
possible evidence for what the app treats as "the account identity" — not
a guess from a column name, but the literal value the whole rest of the
app is built around.

## Registration (`create_account()`, full column list)

`memb___id, memb__pwd, memb_name, sno__numb, post_code, addr_info, addr_deta, mail_addr, fpas_ques, fpas_answ, phon_numb, job__code, appl_days, modi_days, out__days, true_days, mail_chek, bloc_code, ctl1_code, activated, activation_id, dmn_country[, servercode]`

## Ban — two parallel mechanisms

1. `MEMB_INFO.bloc_code` (account-row flag, gates login).
2. **`DmN_Ban_List`** (web DB, a separate ledger with reason/duration):
   `name, type (1=account, 2=character), server, time, is_permanent, reason`.
   Both are written together on a real admin ban action
   (`ban_account()` + `add_to_banlist()` called as a pair).

## Online status

See `online-status.md` — account-level online comes from a **different**
table, `MEMB_STAT` (`memb___id`, `ConnectStat`), not `MEMB_INFO`.

## Credits editor account lookup

`acc_exists($user)`: `SELECT memb_guid, memb___id FROM MEMB_INFO WHERE memb___id = :user` — the entry point the AdminCP credits editor uses to resolve an account before mutating `CashShopData` (see `currencies.md`).

## Cross-reference against `docs/game-data/schema/`

`docs/game-data/schema/` (Phase 1) had no account-side evidence at all —
this is **NEW_LEGACY_EVIDENCE** in full: `MEMB_INFO`, `MEMB_STAT`, and
`DmN_Ban_List` did not previously exist anywhere in the schema catalog.
