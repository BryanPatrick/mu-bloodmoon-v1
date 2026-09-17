---
status: LIVING_DOCUMENT
category: security
audience: internal (engineering + security review)
lastVerified: 2026-08-31
---

# GameServer credential/secret field audit (Phase L, Part 5)

Deep audit of the confirmed sensitive structures Bryan named. **No real
secret or PII value is printed anywhere in this document** — every
finding below is expressed as shape/format/length, never the literal
value, per explicit instruction.

## `MEMB_INFO.memb__pwd`

- **Format**: real observed lengths across all real accounts in the
  lab snapshot: 9-10 characters, alphanumeric only, no special
  characters. The column itself is `VARCHAR(10)`.
- **Plaintext vs. hash vs. encoded**: **structurally cannot be a real
  cryptographic hash** — the column's own maximum width (10 characters)
  is too short to hold even the shortest common hash format in hex
  (MD5 = 32 hex chars minimum). Combined with the observed lengths
  landing right at the column's max width, this is strong, concrete
  evidence the column holds a **plaintext (or minimally-transformed)
  password**, not a hash. This matches a well-documented characteristic
  of the original MU Online account schema lineage this project
  inherited (`VARCHAR(10)` plaintext game passwords was the era-typical
  design).
- **Read/write paths**: written by `dbo.DmN_CreateGameAccount` (Blood
  Moon's own account-provisioning procedure) at account creation; read
  by the compiled GameServer client-login flow (native MU protocol,
  outside this project's code). No Blood Moon code reads this column
  back for any purpose beyond initial write — confirmed via grep across
  `apps/api`/GameBridge Agent.
- **Current active usage**: yes — this is the real, live credential the
  MU game client authenticates with when connecting directly to the
  GameServer (a separate protocol/session from the Portal's own web
  login).
- **Exposure risk**: real and structural, inherent to the original MU
  Online engine design, not something Blood Moon's own code introduced
  or can trivially fix — changing this would require GameServer engine
  source access, which this project does not have.
- **Does the Portal bypass it?** Yes — the Portal's own authentication
  (`Account.passwordHash`, real bcrypt) is entirely separate and does
  not read or write `memb__pwd`.
- **Does the GameServer require it?** Yes — inherent to the native MU
  client-server login protocol.
- **Migration/hardening feasibility**: not feasible without GameServer
  engine source/binary access (packed, not available locally — see
  `docs/vip/wz-setaccountlevel-coexistence.md`). The only real
  mitigation available at the Blood Moon layer: continue generating this
  value randomly server-side (already the case for `bm_AnonymizeGameAccount`'s
  post-anonymize credential) rather than deriving it from anything a
  player chose, and never displaying or logging it.

## `MEMB_INFO.fpas_ques` / `fpas_answ`

- **Format**: `VARCHAR(50)` each, both **NULL for every real account**
  in the restored snapshot.
- **Plaintext vs. hash**: column width/shape is consistent with
  plaintext free-text (a security question and its answer), not a hash.
- **Current active usage**: **NONE observed** — genuinely unpopulated
  real data, consistent with these being legacy self-service
  account-recovery fields tied to the (now-superseded, or at minimum
  currently-unused-by-Blood-Moon) registration flow found in the legacy
  `hostbr-web` CMS, not something Blood Moon's own `CREATE_GAME_ACCOUNT`
  path populates.
- **Exposure risk**: low today (no real data to expose), but the
  pattern itself (plaintext security question/answer) is a known-weak
  account-recovery design if ever repopulated.
- **Portal bypass**: yes, entirely — the Portal has its own real
  password-recovery flow (`docs/security/` password-recovery
  documentation) that does not touch these columns.
- **Recommendation**: leave unpopulated; do not build any future
  feature that writes to them.

## `DmN_Market.item_password`

- **Format**: `VARCHAR`, table has 0 real rows — format cannot be
  observed directly.
- **Inference from name**: strongly suggests plaintext item-listing
  password protection (a legacy market-item PIN/lock feature), a known
  pattern in some MU Online marketplace add-ons.
- **Current active usage**: none (table has 0 rows; procedure-level
  reference count is also 0 — no stored procedure touches this table).
- **Exposure risk**: none today (dormant); flagged `REVIEW_REQUIRED` in
  `privacy-data-map.md`'s sanitization hardening if this table is ever
  populated in a future backup.

## `DmN_Admin_Logins`

- **Format**: `memb___id VARCHAR(50)` (holds the literal string
  `'admin'` in every real row, not a player login), `time DATETIME`,
  `ip VARCHAR(50)` (real IP addresses observed).
- **Real leak found and fixed this session** (Phase K): the first
  version of the lab sanitization script left 7 real production IP
  addresses in this table in plain text, because its `INNER JOIN`
  against the player-login mapping table never matched the literal
  `'admin'` value. Fixed — see `privacy-data-map.md`'s hardening
  addendum.
- **Writer**: genuinely **UNKNOWN** even after this round's expanded
  search (see `legacy-unknown-structures.md`'s data-flow section) — not
  `WZ_CONNECT_MEMB`/`WZ_DISCONNECT_MEMB` (those write `DmN_IP_Log`/
  `DmN_OnlineCheck`, confirmed, but not this table), not any of the 90
  cataloged procedures, not individually traced in the legacy CMS source
  this round (scope was prioritized toward the VIP-cron files instead).
- **Exposure risk**: real IP addresses of whoever/whatever authenticates
  as `'admin'` — a genuine, if narrow, security-relevant log. Already
  pseudonymized in the sanitized lab.

## `DmN_IP_Log`

- **Format**: `id INT`, `account VARCHAR(50)`, `ip VARCHAR(50)`,
  `last_connected SMALLDATETIME`, `login_type INT`.
- **Writer — CONFIRMED this round**: the native `dbo.WZ_CONNECT_MEMB`
  procedure, fired (near-certainly) on every player login — full body
  read via `sys.sql_modules`, see `docs/vip/wz-setaccountlevel-coexistence.md`.
  This is a real, live, native-engine-maintained IP log, not a legacy
  panel artifact.
- **Exposure risk**: real, ongoing — every login's IP is recorded here
  with no observed truncation, hashing, or retention limit. This is the
  single most concrete "insecure IP logging" finding of this audit
  precisely because it's confirmed ACTIVE, not dormant.
- **Recommendation**: out of scope to change (native engine table/write
  path, no source access) — but worth flagging to product/legal as a
  real, currently-active IP-retention practice with no visible retention
  policy, relevant to `docs/security/data-classification.md` and any
  future LGPD review.

## Summary

| Field | Plaintext/weak? | Currently active? | Portal bypasses it? | Hardening feasible? |
|---|---|---|---|---|
| `memb__pwd` | Yes (structural) | Yes | Yes | No (engine-level) |
| `fpas_ques`/`fpas_answ` | Yes (by design, if populated) | No (unpopulated) | Yes | N/A — recommend never populating |
| `DmN_Market.item_password` | Likely (by name) | No (dormant) | Yes | N/A — dormant |
| `DmN_Admin_Logins` (ip) | N/A (not a credential, but sensitive) | Yes (writer unknown) | Yes | Already pseudonymized in the lab |
| `DmN_IP_Log` | N/A | **Yes, confirmed active** | Yes | No (engine-level) |
