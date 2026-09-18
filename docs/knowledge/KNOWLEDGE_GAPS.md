---
status: ACTIVE
category: knowledge
audience: internal (product + engineering)
lastVerified: 2026-09-18
---

# Knowledge gap register

Real, evidence-based gaps found during Phase 18/18B (2026-09-18). Extends
`knowledge/vendor-sweep/reference-gap-manifest.json` (which this file does
not duplicate — that manifest's 6 gaps are almost entirely `RESOLVED`
already and stay there) with gaps found by this specific audit.

| ID | Domain | Missing knowledge | Impact | Best source to obtain | Priority | Status |
|---|---|---|---|---|---|---|
| GAP-P18-01 | CASH_WCOIN | 3 vendor tutorial videos already have captured transcripts but zero downstream processing: `gqtSk1pdti4` "Custom Buy Vip", `Jia1TrtgZfY` "Command Buy Vip Check User", `XUeN6U74zME` "Custom Buy Vip And Coin" (`knowledge/vendor-sweep/transcript-inventory.json`) | These describe the vendor engine's native in-game `/buy vip` command flow — a second, GameServer-side purchase path distinct from the DMN CMS website flow already traced in `LEGACY_SUPPLIER_INDEX.md` | Read the 3 already-captured transcripts (no new capture needed), run them through the existing `knowledge-*.mjs` pipeline (normalize → claims → verify against real config) | P1 | OPEN |
| GAP-P18-02 | CASH_WCOIN | `Configurando PagSeguro Auto.htm` / `Configurando PayPal Auto.htm` vendor tutorials locally preserved, hash-verified, never read | Would confirm/contradict whether Blood Moon's DMN CMS payment integration (traced in `LEGACY_SUPPLIER_INDEX.md`) matches the vendor's stock recommendation or was customized | `D:\MU\Research\Vendor\Tutorials\` — already on disk | P2 | OPEN |
| GAP-P18-03 | CASH_WCOIN | Admin-config values behind `credits_<server>\|db_<type>`/`table_<type>`/`credits_column_<type>` in the legacy DMN CMS (exact type→WCoinC/WCoinP/GoblinPoint mapping) not read | Low risk — table shape already independently confirmed via `currencies.md`'s direct SQL introspection — but the exact per-type mapping is still formally unconfirmed | Read the DMN CMS's own config store (table or file — not yet located) via `bm-sql.cmd`, read-only | P3 | OPEN |
| GAP-P18-04 | GOVERNANCE | `D:\MU\mu-bloodmoon-legacy-catalog` (separate worktree) holds a stale, smaller `docs/economy/` (4 files) missing `legacy-dmn-cms-and-currency-investigation.md` and others present in `mu-bloodmoon-v1` | An agent bootstrapping from that worktree alone would miss the DMN CMS finding and the fuller economy doc set entirely | Decide: archive/retire the stale worktree copy, or add a pointer doc redirecting to `mu-bloodmoon-v1` | P1 | OPEN — decision needed from Bryan |
| GAP-P18-05 | GOVERNANCE | `docs/economy/legacy-dmn-cms-and-currency-investigation.md` (2026-08-30, `status: FINDING_FOR_BRYAN_REVIEW`) — a 74-table live-but-unused legacy CMS schema in production — has not been formally decided (keep dormant / decommission / audit further) | Production SQL Server carries a large, fully-provisioned, unused schema indefinitely without an explicit retention decision | Bryan's decision — no further research needed, the finding is already complete | P1 | OPEN — decision needed from Bryan |
| GAP-P18-06 | PRESERVATION | `mu-bloodmoon-legacy-catalog/README.md` references `C:\Users\Admin\Documents\BloodMoonBackups\ProjectCleanup\20260730-season6-scope` — that Windows user profile does not exist on this machine | Unclear whether this pruned-scope historical snapshot is preserved anywhere reachable, or lost | Ask Bryan whether this exists on another machine, or update the stale reference | P2 | OPEN — decision needed from Bryan |
| GAP-P18-07 | XSHOP_CASHSHOP | `RUNTIME_MUTABLE`/`RELOAD_REQUIRED`/`RESTART_REQUIRED` are honestly `UNKNOWN` for every field in `docs/economy/xshop-cashshop-config-field-matrix.md` | Blocks any real "edit from Portal, live-sync to GameServer" implementation (ADR-0024's `#sync()` stays a guard with nothing behind it) | Requires either GameServer engine source (not available) or a live reload/restart test against a non-production instance (no such instance exists in this project) | P2 | OPEN, long-standing, not newly found |
| GAP-P18-08 | GAMESERVER | `Common.dat`'s CashShop block (`CashShopSwitch`, `CashShopWCGiftEnable`/`WPGiftEnable`/`GPGiftEnable`, `CashShopGoblinPointDelay`, etc. — documented in the vendor's `GameServerInfo - Common.htm` tutorial) has not been cross-checked against Blood Moon's own live `Common.dat` | Unknown whether Blood Moon's CashShop gift/delay settings match vendor defaults or were customized | Read Blood Moon's real `Common.dat` (already downloadable via existing RemoteOps tooling) and diff against the tutorial's field list | P3 | OPEN |
| GAP-P18-09 | ITEM_DELIVERY | `controller.shop.php`/`model.shop.php`'s in-game item/warehouse delivery path (`UPDATE Warehouse SET Items = 0x... WHERE AccountId = :user`) inventoried but not traced end-to-end | A second "how does a purchased ITEM reach the game" question, parallel to the currency question this phase closed, remains open | Same method as `LEGACY_SUPPLIER_INDEX.md`'s trace — read `model.shop.php` in full (already locally preserved) | P2 | OPEN |
| GAP-P18-10 | KNOWLEDGE_SYSTEM | Sensitive files in the legacy web backup located but deliberately not read: `constants.php`, 3 TLS `.key` files, a Gerencianet `.p12`/`.pem` cert, a `mysql.sql` GRANT statement (hashed password) | If this legacy backup is ever redistributed/shared, these files must be excluded or redacted first | No action needed unless the backup is repackaged for a new purpose | P3 | ACKNOWLEDGED, not blocking |

## Format/coverage gaps (quantified, Phase 18B §28-30)

- PDFs: 0 exist anywhere under `D:\MU\` — not a coverage gap, a confirmed
  fact about the vendor's documentation format (see `VPS_DOCUMENTATION_INDEX.md`).
- Videos: 108 `project-gamers-oficial` videos catalogued
  (`knowledge/vendor-sweep/transcript-inventory.json`); of those, the 3 in
  GAP-P18-01 are the highest-value fully-untouched items. The broader
  per-video pipeline-stage breakdown (how many have NORMALIZED/CLAIMS/
  VERIFICATION complete vs. partial vs. missing) is already tracked
  file-by-file in `knowledge/vendor-sweep/provenance-report.json` — not
  re-derived here, see `TOPIC_COVERAGE.md` for the summary numbers.
- HTML tutorials: 48/48 preserved and hash-verified, 43 normalized, 2
  specifically flagged unread (GAP-P18-02).

## What this register deliberately does not include

Long-standing, already-tracked gaps that predate this phase and are not new
findings — e.g. the `RUNTIME_MUTABLE`/`RELOAD_REQUIRED` unknowns (GAP-P18-07
is listed because it's directly relevant to this audit's topic, but its
underlying cause is unchanged from ADR-0024's own admission), or the six
already-`RESOLVED` gaps in `reference-gap-manifest.json`. See that file for
the full historical gap history instead of duplicating it here.
