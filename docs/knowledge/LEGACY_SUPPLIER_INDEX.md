---
status: ACTIVE
category: knowledge
audience: internal (product + engineering)
lastVerified: 2026-09-18
confidence: MIXED — see per-section confidence notes
---

# Legacy supplier index

What Blood Moon actually inherited from its game-engine vendor and its own
pre-Nuxt website, where the preserved material lives, and — the specific
question this document exists to answer — how a legacy Cash/WCoin purchase
became game-visible currency. Written for Phase 18 (Knowledge Preservation
Audit, 2026-09-18). Does not duplicate `docs/economy/*` or
`knowledge/vendor-sweep/*` — points at them.

## Vendor identity

- **Game engine vendor**: ProjectGamers (also referred to as "ProjectGamers/eMuGS").
  Confirmed by `ProjectGamers.dat`/`PGEditor.exe`/`PGClient.dll`/`PGVerify.dll`
  branding found directly on the production VPS (`catalog/vps-inventory.json`,
  IDs F2-P1-3a/F2-P1-3b) and by the `project-gamers-oficial` YouTube channel's
  tutorials matching Blood Moon's real config files 1:1
  (`docs/knowledge/source-authority.md`).
- **Legacy web CMS**: "Free MU CMS" / "DmN MuCMS" / "PG MuCMS" — a third-party
  open-source PHP template package (`github.com/pulseP1986/free-mu-cms`,
  Composer package `pulsep1986/free-mu-cms`, version `1.2.4` per its own
  header comment). Blood Moon built its **own first website** on top of this
  package, under its own `mubloodxz` cPanel account and `mubloodmoon.com.br`
  domain — this was Blood Moon's own site, not a hosted third-party service.
  Confirmed independently from two directions: the SQL Server side (`DmN%`
  table prefix, `docs/economy/legacy-dmn-cms-and-currency-investigation.md`)
  and the PHP source side (`index.php`'s own header comment, in the preserved
  backup below).

## Where the preserved material actually lives

| What | Path | Confidence |
|---|---|---|
| Full legacy website backup (PHP source + assets, 9,099 files extracted from a 10,270-entry, SHA256-verified cPanel tarball) | `D:\MU\Deploy\Cpanel-Backups\hostbr-web-20260716\` (tarball + `extracted\backup-7.16.2026_12-53-47_mubloodxz\`) | CONFIRMED |
| Pre-migration route/bootstrap snapshot (`.htaccess`, `index.php`, taken at the exact PHP→Nuxt cutover) | `D:\MU\Deploy\Cpanel-Backups\websource-web-20260716\` | CONFIRMED |
| GameServer (ProjectGamers engine) runtime backup, 92.9MB/5,364 files, hash `4F694EF2...` | VPS `C:\MuServer BloodMoon 11-08.rar` (listed read-only, never extracted — `catalog/vps-inventory.json` F2-P1-4) | CONFIRMED (listing only) |
| GameServer season-6 pre-prune snapshot (full `MuServer-stage` tree: GameServer/ConnectServer/DataServer/JoinServer/DB) | `D:\MU\Deploy\Predeploy-Snapshots\20260730-season6-scope-cleanup\workspace-binaries\muserver-extracted\` (~2.0GB, 6,971 files) | CONFIRMED (inventoried, not extracted further) |
| 49 vendor tutorial files (27 `.htm`, 3 `.html`, 6 `.png`, 2 `.rtf`, 11 `.txt`), hash-verified against the live VPS copy | `D:\MU\Research\Vendor\Tutorials\` + `manifest.json` | CONFIRMED, 43/49 normalized into `docs/vendor-tutorials-knowledge-extraction.md` |
| Real GameServer cash-shop data export (352 rows) | `D:\MU\mu-bloodmoon-legacy-catalog\references\game-data\muserver-export\cash-shop-products.json` | CONFIRMED |
| Vendor engine capability knowledge (108 videos catalogued, 99 atomic claims, incl. CustomPix/CustomMarketShop) | `mu-bloodmoon-v1/knowledge/vendor-sweep/*` (see `docs/knowledge/knowledge-sweep.md`) | CONFIRMED, real tooling |
| Legacy X-Shop/CashShop config, byte-hash-verified, 180 rows | `docs/economy/xshop-cashshop-config-field-matrix.md`, `legacy-catalog-effective-state-snapshot.json` | CONFIRMED |
| Legacy DMN CMS database schema investigation (74 tables) | `docs/economy/legacy-dmn-cms-and-currency-investigation.md` | CONFIRMED, `status: FINDING_FOR_BRYAN_REVIEW` — **not yet acted on**, see Open decision below |
| Decompiled launcher/patch-generator (C# source, 63 files) | `D:\MU\Deploy\Launcher-Research\20260722\` + `ANALISE-LAUNCHER.md` | CONFIRMED |

`D:\MU\BloodMoonBackups\{WebSource-web,game-vps,hostbr-web,project-references,ProjectCleanup}`
and `C:\Users\Admin\Documents\BloodMoonBackups\...` (referenced by
`mu-bloodmoon-legacy-catalog/README.md`) are **empty or nonexistent on this
machine** — see Gaps below.

## The legacy Cash/WCoin purchase flow — traced end to end

This directly answers the question that motivated this audit: *"purchasing
Cash and having the result reflected inside the game."* Traced this phase by
reading the real, preserved PHP source at
`D:\MU\Deploy\Cpanel-Backups\hostbr-web-20260716\extracted\backup-7.16.2026_12-53-47_mubloodxz\homedir\public_html\application\`
— no step below is inferred from a tutorial or generic engine knowledge.

```
Player checkout page (controller.donate.php)
  paypal() / paycall() / paymentwall() / paygol() -- one function per gateway
    |
Gateway confirms payment (IPN/webhook/callback)
  e.g. post_back_paypal() -> validate_paypal_payment() -> paypal_complete()
    |
model.donate.php records the transaction (audit trail, per gateway):
  insert_paypal_order() / insert_pagseguro_order() / insert_paycall_order() / ...
  insert_*_transaction() -> DmN_Donate_Transactions / DmN_PagSeguro_Transactions / ...
  update_transaction_status()
    |
reward_user($account, $server, $credits, $reward_type)
  - applies an active VIP's donation-bonus % (check_vip + get_vip_package_donation_bonus)
  - add_total_recharge() -> INSERT INTO DmN_Total_Recharge (web-side "lifetime recharge" counter)
  - $this->website->add_credits($account, $server, $credits, $reward_type, ...)
    |
helper.website.php: add_credits() -> increase_credits()
  reads the TARGET db/table/column from admin config:
    credits_<server>|db_<type>, |table_<type>, |credits_column_<type>, |account_column_<type>
  then runs a generic, config-driven mutation:
    UPDATE <table> SET <column> = <column> + :credits WHERE <identifier_column> = :user AND server = :server
    (INSERT-then-UPDATE fallback if the account row doesn't exist yet)
    |
Lands in CashShopData(AccountID, WCoinC, WCoinP, GoblinPoint) on the SQL Server
game DB for types 1-3 (per-server currencies), or DmN_Shop_Credits.credits4
for "type 4" (a web-only currency, hardcoded, not server-scoped) -- table
identity for types 1-3 confirmed both by source-code shape (this trace) AND
independently by direct SQL introspection
(docs/economy/legacy-dmn-cms-and-currency-investigation.md's
`UPDATE CashShopData SET WCoinC = WCoinC + :credits WHERE AccountID = :user`
finding) -- two independent methods agree.
    |
GameServer's own in-game CashShop/X-Shop NPC menus read CashShopData
DIRECTLY at interaction time -- no separate sync/push step exists or is
needed, since it's the same live table.
```

File/function references (all in the preserved backup above):
`application/controllers/controller.donate.php:85` (`paypal()`), `:180`
(`paypal_complete()`), `:347` (`paycall()`), `:363` (`paymentwall()`);
`application/models/model.donate.php` (`reward_user`, `decrease_credits`,
`add_total_recharge`, `insert_recharge`, all `insert_*_order`/`insert_*_transaction`
functions); `application/helpers/helper.website.php` (`add_credits`,
`charge_credits`, `increase_credits`, `decrease_credits`).

**Was this ever used for a real purchase? No — confirmed by direct evidence,
not absence of evidence.** Live SQL introspection this phase found: `DmN_Vip_Packages`
0 rows, `DmN_Vip_Users` 0 rows, `DmN_Donate`/`DmN_Donate_Transactions`/`DmN_Donate_Orders`
0 rows, `DmN_2CheckOut_Transactions`/`DmN_PagSeguro_Transactions` 0 rows despite
both gateways being fully wired at the schema+code level. The only nonzero
`CashShopData` balances (4 rows) belong to the known test accounts
`teste`/`teste1`/`teste2`/`teste3` (`docs/accounts/pre-beta-account-review.md`),
consistent with manual dev-time grants, not real player activity. **This
system was fully built and end-to-end traceable, but never went commercially
live.**

A second, completely separate legacy path exists and was also never used:
the ProjectGamers GameServer engine itself ships a native in-game Pix
payment feature (`CustomPixSwitch`, GameServer config) — confirmed present
but disabled, URL still at the vendor's own placeholder
(`https://seudominio.com.br/pix.php`), all 6 price fields at `0`
(`knowledge/vendor-sweep/atomic-claims.json` CLAIM-098).

**Confidence**: CONFIRMED for the code path and the "never used" finding
(both independently corroborated). One honest residual gap: the exact
admin-config values behind `credits_<server>|table_1/2/3` (which of
WCoinC/WCoinP/GoblinPoint each numeric `type` maps to) were not read this
phase — the config store itself (`DmN_Config` or similar table/file) was not
located. Low-risk gap: the currencies.md cross-check already independently
confirms the target table shape.

## DmN CMS schema — decision recorded (Phase 18D: `KEEP_DORMANT`)

`docs/economy/legacy-dmn-cms-and-currency-investigation.md` (dated
2026-08-30, status `FINDING_FOR_BRYAN_REVIEW`) reports this entire 74-table
DMN CMS schema as still live in the production SQL Server database, fully
provisioned and unused. It stayed undecided through Phase 18/18C; **Bryan's
direction on 2026-09-18 is `KEEP_DORMANT`** (recorded below). This whole system
is `LEGACY_ONLY`, `STILL_PRESENT` (not deleted), and `NOT_INTEGRATED` with the
current Portal's `AccountCurrency`/`WalletLedgerService` economy, by
deliberate, already-recorded decision (no equivalence assumed).

### DmN CMS schema classification (Phase 18C Part 16)

**Classification: `LEGACY_DORMANT_SCHEMA`.**

- **Known usage**: none commercially. 0 rows in `DmN_Vip_Packages`,
  `DmN_Vip_Users`, `DmN_Donate`, `DmN_Donate_Transactions`,
  `DmN_Donate_Orders`, `DmN_2CheckOut_Transactions`,
  `DmN_PagSeguro_Transactions` — despite the code/schema being fully wired
  for real payment gateways. Only `CashShopData` has nonzero rows (4, all
  known test accounts).
- **Historical purpose**: the DMN/"Free MU CMS" website's own commerce
  layer (donation packages, VIP sales, a marketplace, a referral system,
  vote-reward tracking, support tickets, ban list, GM tools, account/
  character logs) — either an originally-planned web panel superseded
  before launch by the current custom Nuxt/NestJS portal, or a vendor
  package installed/evaluated and not adopted. Not determined which,
  this phase or prior ones.
- **Current observed usage**: dormant. No application in this repo reads
  or writes any `DmN_*` table (confirmed by this phase's own code search —
  `mu-bloodmoon-v1`'s current `apps/api`/`apps/web` never reference the
  `DmN_*` prefix).
- **Dependencies**: the legacy PHP website itself (`hostbr-web-20260716`
  backup) is the only known consumer, and that website is not deployed —
  it was replaced by the current Nuxt SSR site at the exact cutover point
  documented in `websource-web-20260716`'s `.htaccess`/`index.php`
  snapshots. No current production system depends on `DmN_*` tables.
- **Decommission prerequisites** (evidence needed before any removal,
  regardless of which option is eventually chosen): (1) a full, fresh
  row-count sweep of all 74 tables immediately before any action, not just
  the ~9 checked in the 2026-08-30 investigation, to rule out any
  since-changed state; (2) explicit confirmation no scheduled job/trigger/
  stored procedure anywhere in the SQL Server instance references these
  tables (the 2026-08-17 VPS inventory found 0 stored procedures in
  `MuOnline`, but the `DmN_*` tables were only discovered 2026-08-30 —
  this specific cross-check was not re-run against them); (3) a full
  backup/export of the schema+data before any `DROP`, regardless of option
  chosen; (4) explicit, fresh, in-the-moment authorization for the specific
  destructive step, per this project's standing production-safety rules.

### Decommission options (considered; `KEEP_DORMANT` chosen — see below)

| Option | What it means | Trade-off |
|---|---|---|
| `KEEP_DORMANT` | Leave the schema exactly as-is, documented (as this file now does) | Zero risk, zero effort, but an indefinitely-growing "why does this exist" question for future agents/operators |
| `ARCHIVE_THEN_REMOVE` | Full backup/export of all 74 tables + data, then `DROP` from production | Removes the "phantom sitting in production" concern permanently; requires the prerequisites above and fresh explicit authorization for the `DROP` step specifically — this project's standing rules make that a real, separate approval gate, not a rubber stamp |
| `AUDIT_FURTHER` | Read the remaining ~65 unchecked tables' row counts/content before deciding anything | Lowest-risk way to rule out a surprise (e.g., a marketplace/referral table with real historical data not yet checked) before committing to either option above |

No option was selected by the earlier phases.

**Decision recorded (Phase 18D, 2026-09-18) — source: Bryan's direction in the
Phase 18D brief (`ADMIN_DECISION`, dated, not a backdated or invented source):
`DmN CMS legacy schema = KEEP_DORMANT`.** Do not delete or decommission. Reason
given: the schema is still valuable as historical/reference knowledge and the
dependency audit is incomplete. Technical removal remains future work and
keeps every prerequisite listed above; row counts (CLAIM-124) are a
2026-08-30 point-in-time reading and must be re-checked before any future
removal decision. The machine index records the schema as `LEGACY` /
`LEGACY_DORMANT_SCHEMA`.

## Known worktree fragmentation risk

`D:\MU\mu-bloodmoon-legacy-catalog` (a separate, older git worktree, branch
`feature/legacy-catalog-control-plane`, last commit `79911735`) has its own,
**smaller and stale** copy of `docs/economy/` (4 files) that does **not**
include `legacy-dmn-cms-and-currency-investigation.md` or several other
files this repo (`mu-bloodmoon-v1`) has. An agent that bootstraps from the
`mu-bloodmoon-legacy-catalog` worktree alone would miss the DMN CMS finding
entirely. `mu-bloodmoon-v1` is the current, canonical source for economy/
legacy-supplier knowledge; `mu-bloodmoon-legacy-catalog` is closer to an
equipment/asset catalog plus an earlier snapshot of the same investigation.

**Decision recorded (Phase 18D, 2026-09-18) — source: Bryan's direction in the
Phase 18D brief (`ADMIN_DECISION`): `mu-bloodmoon-legacy-catalog =
KEEP_WITH_STALE_WARNING`.** Not deleted, not archived, not merged. The other
two options considered (`ARCHIVE_READ_ONLY`, `REMOVE_LATER_AFTER_VERIFIED_REDUNDANCY`)
are not chosen; removal in particular is not verified redundant (its `knowledge/`
and `references/` trees are only partly mirrored here).

**Prepared warning — NOT yet applied.** The worktree is a separate git
worktree on its own branch (`feature/legacy-catalog-control-plane`) and is
currently clean; writing to it from this branch would leave it dirty and
could interfere with any session using it, so the text below is prepared here
for a one-file commit there once Bryan wants it applied. Suggested target:
a banner at the very top of that worktree's `README.md`.

```text
> STALE COPY -- DO NOT USE AS THE CURRENT SOURCE.
> This worktree (mu-bloodmoon-legacy-catalog, branch
> feature/legacy-catalog-control-plane) is an older snapshot. The current source
> of truth for Blood Moon code, docs, economy, legacy-supplier and knowledge
> material is D:\MU\mu-bloodmoon-v1 (start at docs/knowledge/KNOWLEDGE_MASTER_INDEX.md).
> Notably, docs/economy/ here is missing legacy-dmn-cms-and-currency-investigation.md
> and several other files present in mu-bloodmoon-v1. Its README's reference to
> C:\Users\Admin\Documents\BloodMoonBackups\ProjectCleanup\20260730-season6-scope
> is stale: that content is at D:\MU\Deploy\Predeploy-Snapshots\20260730-season6-scope-cleanup\.
> Kept for its equipment/asset catalog and as history; do not delete without a
> verified-redundancy review.
```

## Gaps

- `D:\MU\BloodMoonBackups\{WebSource-web,game-vps,hostbr-web,project-references,ProjectCleanup}`
  are empty on this machine. `mu-bloodmoon-legacy-catalog/README.md`
  references `C:\Users\Admin\Documents\BloodMoonBackups\ProjectCleanup\20260730-season6-scope`
  — that user profile (`C:\Users\Admin`) **does not exist on this machine**
  (confirmed: only `Mini DELL3080`, `Default`, `Public` under `C:\Users`).
  This specific pruned-scope snapshot is unconfirmed to exist anywhere
  reachable from this session. It may be present on a different machine, or
  the reference may be stale.
- ~~3 real, already-captured-but-unprocessed YouTube transcripts … remain
  unread~~ **RESOLVED (Phase 18C read them; Phase 18D registered them as
  KI-042/043/044 with CLAIM-100..124).** They describe the vendor engine's OWN
  in-game `/buyvip` command and `CustomBuyVipAndCoin` flows — the **spend side**,
  distinct from the DMN web donation flow traced above (the **entry side**).
  Both legacy paths are `LEGACY_ONLY`-dormant on Blood Moon: DmN never took a
  real payment (CLAIM-124), and the `/buyvip` command is present but disabled
  (CLAIM-101). Full comparison: `CASH_VIP_INTEGRATION_MAP.md`.
- `controller.shop.php`/`model.shop.php` (in-game item/warehouse delivery,
  `UPDATE Warehouse SET Items = 0x... WHERE AccountId = :user`) were
  inventoried but not traced end-to-end this phase — a second, separate
  "how does a purchased ITEM (not currency) reach the game" question, out of
  this phase's immediate scope.
- Two vendor tutorials that specifically document the vendor's own
  recommended website-side payment integration are locally preserved,
  hash-verified, and have never been read: `Configurando PagSeguro Auto.htm`
  and `Configurando PayPal Auto.htm`
  (`D:\MU\Research\Vendor\Tutorials\`, flagged as unread in
  `D:\MU\docs\vendor-local-tutorial-index.md`). These could confirm or
  contradict whether Blood Moon's own DMN CMS implementation
  (traced above) followed the vendor's stock integration exactly or was
  customized.
- The vendor's own `GameServerInfo - Common.htm` tutorial
  (`D:\MU\Research\Vendor\Tutorials\`) documents the real Common.dat
  CashShop field names: `CashShopSwitch`, `WriteCashShopLog`,
  `CashShopWCGiftEnable`/`CashShopWPGiftEnable`/`CashShopGPGiftEnable`
  (per-currency gift toggles for WCoinC/WCoinP/GoblinPoint),
  `CashShopScriptVersion1-3`, `CashShopBannerVersion1-3`,
  `CashShopGoblinPointDelay`/`Value_AL0-3` — not yet cross-checked against
  Blood Moon's own live `Common.dat` (that specific field-by-field
  cross-check was not performed this phase; `docs/economy/xshop-cashshop-config-field-matrix.md`
  covers `CustomXShop.txt`/`CashShopProduct.txt` only, not `Common.dat`'s
  CashShop block).
- One community (non-vendor) video transcript
  (`D:\MU\Research\YouTube\eusantiago\transcripts\qJ6Xp6o51C8.pt.json`)
  describes buying "WCoin" with real money on a server, at an account-level
  purchase cap — but that channel is independently classified
  `PROVIDER_SPECIFIC_OTHER_SERVER`/RealMU-affiliated, not Blood Moon
  (`docs/knowledge/source-authority.md`'s worked example). Treat this as
  generic terminology corroboration only, never as Blood-Moon-specific
  evidence.
- The 6 VPS-investigation docs referenced by `catalog/vps-inventory.json`
  (`vps-new-discoveries.md`, `vps-inventory-batch-log.md`,
  `vendor-local-tutorial-index.md`, `fakeonline-activation-analysis.md`,
  `configuration-history.md`, `vps-risk-map.md`) live at `D:\MU\docs\`
  (**not** inside any git-tracked repo) — confirmed to exist exactly once,
  no duplicates across any worktree. None of the six directly resolves the
  Cash/WCoin purchase flow (that trail is the DMN CMS PHP source trace
  above, not these docs) — `vendor-local-tutorial-index.md` came closest
  but explicitly left the PagSeguro/PayPal tutorials unread (previous
  bullet).
- Sensitive files in the legacy web backup were located but deliberately
  **not read**: `constants.php` (live DB credentials, per the backup's own
  README warning), 3 `.key` files (TLS private keys), `certificate.p12`/
  `.pem` under `application/plugins/gerencianet/libraries/` (likely a live
  payment-gateway mTLS cert, as distinct from that vendor SDK's own bundled
  example certs), and `mysql.sql` (a cPanel `GRANT USAGE` statement — opened
  before its nature was clear, found to contain a **hashed**, not
  plaintext, password; the hash itself was not reproduced anywhere).
