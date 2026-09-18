---
status: ACTIVE
category: knowledge
audience: internal (product + engineering)
lastVerified: 2026-09-18
---

# Procedure index

"I need to do X" → where the runbook/knowledge actually lives. Classifies
each task `RUNBOOK_READY` / `KNOWLEDGE_NO_RUNBOOK` / `SOURCE_ONLY` /
`KNOWLEDGE_MISSING`.

| Task | Domain | Runbook/primary source | Legacy source | System | Risk | Approval required | Status |
|---|---|---|---|---|---|---|---|
| Deploy API/web to production | DEPLOYMENT | `~/.claude/skills/bloodmoon-deploy/SKILL.md` + `docs/deployment-architecture.md` | — | Portal | HIGH | YES, every step | RUNBOOK_READY |
| Rotate a production credential | SECURITY | `bloodmoon-deploy` Phase 8 + `docs/security/secret-rotation.md`/`secret-incident-history.md` | — | Portal | CRITICAL | YES, explicit per-credential | RUNBOOK_READY |
| Restore/backup the portal MySQL DB | BACKUP | `deploy/CPANEL_BACKUP_AUTOMATION.md`, `deploy/scripts/cpanel-production-backup.sh` | — | Portal | HIGH | YES | RUNBOOK_READY |
| Apply a Prisma migration to production | DATABASE | `bloodmoon-deploy` Phase 3 + `references/migration-and-remote-access.md` | — | Portal | HIGH | YES | RUNBOOK_READY |
| Configure/edit the legacy X-Shop or CashShop catalog | XSHOP_CASHSHOP | `docs/decisions/0024-legacy-shop-control-plane.md`, Portal admin UI `catalogo-legado.vue` | `docs/economy/xshop-cashshop-config-field-matrix.md` | GameServer (legacy files) + Portal (desired-state layer) | MEDIUM (desired-state only, no live sync) | Portal edits: normal RBAC. Live GameServer file edit: not built, would need explicit authorization | RUNBOOK_READY (desired-state); KNOWLEDGE_MISSING (live sync — reload/restart behavior unknown) |
| Understand how legacy Cash/WCoin purchases worked | CASH_WCOIN | `docs/knowledge/LEGACY_SUPPLIER_INDEX.md` (this audit) | Full PHP source, `D:\MU\Deploy\Cpanel-Backups\hostbr-web-20260716\` | Legacy DMN CMS (dormant) | LOW (read-only, historical) | None (read-only research) | RUNBOOK_READY (as reference, not an operational procedure — system is dormant) |
| Inspect the legacy DMN CMS's live schema | ADMIN/DATABASE | `docs/economy/legacy-dmn-cms-and-currency-investigation.md` | Same | SQL Server (production, dormant tables) | MEDIUM (production DB, read-only via `bm-sql.cmd`) | Read-only: none. Any DROP/decommission: YES, explicit | SOURCE_ONLY (decommission procedure not written — decision pending, GAP-P18-05) |
| Configure a GameServer setting (event, custom system) | GAMESERVER | `knowledge/vendor-sweep/` atomic claims (per-system) + `docs/knowledge/knowledge-sweep.md`'s query tools | Vendor tutorials, `Research/Vendor/Tutorials/` | GameServer | HIGH (no reload/restart-safety knowledge for most config families) | YES — reload/restart requirements UNKNOWN for most families | KNOWLEDGE_NO_RUNBOOK (GAP-P18-07), except the narrow case below |
| Reload a `Data/Command` or `Data/Custom` config file after editing (Buy Vip / CustomBuyVipAndCoin family specifically) | GAMESERVER | This row (18C Part 20) — vendor-demonstrated procedure: open GameServer Startup GUI → double-click the server row → "Reloads" tab → pick the matching reload ("Reload Comand" for `Data/Command` files, "Reload Custom" + "Reload Shop" for `Data/Custom`/shop-adjacent files) → change takes effect immediately, no restart | `CASH_VIP_INTEGRATION_MAP.md` Part 1 (2 independent vendor video demonstrations, `gqtSk1pdti4` and `XUeN6U74zME`) | GameServer | LOW (read/reload only, vendor-demonstrated, not a config edit itself) | None for the reload action itself; editing the underlying config file follows normal change-review practice | RUNBOOK_READY — narrow scope, does **not** extend to `CustomXShop.txt`/`CashShopProduct.txt` (still `KNOWLEDGE_NO_RUNBOOK`, different files, unproven) |
| Publish/rebuild a launcher update | LAUNCHER | `Deploy/Launcher-Research/20260722/ANALISE-LAUNCHER.md` (legacy) + current `apps/launcher` (rebuilt on modern stack) | Decompiled legacy source, same path | Launcher | MEDIUM | Depends on current launcher's own release process (not audited this phase) | RUNBOOK_READY for the legacy system's *documentation*; current system's own release runbook not re-verified this phase |
| Re-inventory the production VPS (incremental) | GAMESERVER/OPERATIONS | `docs/knowledge/vps-ingestion.md` §"Incremental sweeps" | — | VPS | LOW (read-only, allowlisted) | None for allowlisted roots; extending the allowlist is a reviewed one-line change | RUNBOOK_READY |
| Run a knowledge sweep (new vendor/community source) | KNOWLEDGE_SYSTEM | `docs/knowledge/knowledge-sweep.md` | — | Knowledge system | LOW | None (research only) | RUNBOOK_READY |
| Query the Knowledge Hub (read-only) | KNOWLEDGE_SYSTEM | `hub/docs/cli.md`, `akh knowledge list`/`source list`/`bootstrap <slug>` (slug: `bloodmoon`) | — | Knowledge Hub | LOW (read-only) | None | RUNBOOK_READY |
| Decide the legacy DMN CMS's fate (keep/decommission/audit) | ADMINISTRATION | `docs/economy/legacy-dmn-cms-and-currency-investigation.md` | Same | SQL Server (production) | Decision-only, no code risk | This IS the approval step — Bryan's decision | SOURCE_ONLY, decision pending |
| Trace a legacy item-delivery flow (web purchase → in-game item) | ITEM_DELIVERY | Not yet written | `controller.shop.php`/`model.shop.php`, same backup | Legacy DMN CMS (dormant) | LOW (read-only, historical) | None | KNOWLEDGE_MISSING (GAP-P18-09) |

## Runbook coverage summary

| Classification | Count (Phase 18) | Count (after Phase 18C) |
|---|---|---|
| RUNBOOK_READY | 8 | 9 (+1: GameServer Command/Custom reload) |
| KNOWLEDGE_NO_RUNBOOK | 1 | 1 (unchanged — narrowed to X-Shop/CashShop.txt specifically) |
| SOURCE_ONLY | 2 | 2 (unchanged) |
| KNOWLEDGE_MISSING | 2 | 2 (unchanged — item-delivery trace and DmN decommission procedure both still lack sufficient evidence for a real runbook; see `KNOWLEDGE_GAPS.md`) |

High-frequency operational tasks (deploy, backup, migration, credential
rotation) are already `RUNBOOK_READY` — this table's gaps cluster
specifically in the legacy/dormant-system area this audit targeted, which
is expected: those systems were never operationalized, so no runbook was
ever needed until now. Phase 18C closed exactly one gap with real evidence
(GameServer config reload, vendor-demonstrated) and deliberately left the
other two (item-delivery trace, DmN decommission procedure) as explicit
gaps rather than guessing operational steps, per instruction.
