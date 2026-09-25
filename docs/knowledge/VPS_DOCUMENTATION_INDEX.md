---
status: ACTIVE
category: knowledge
audience: internal (product + engineering)
lastVerified: 2026-09-18
confidence: CONFIRMED — direct filesystem/VPS evidence
---

# VPS documentation index

Inventory of the production VPS's own documentation/manuals and Blood
Moon's local preservation of it. Written for Phase 18. Points at existing
material rather than duplicating it.

## VPS itself

`WIN-K82J9TU944D`, Windows Server 2012 R2, single volume (`C:`, 49.7GB,
32.6GB free at last check). Read-only access only, via
`D:\MU\Tools\RemoteOps\bm-remote.ps1`/`bm-sql.ps1` (SSH-key based, allowlisted
subcommands — see `docs/knowledge/vps-ingestion.md`, the canonical procedure
doc, not duplicated here).

## Full VPS filesystem inventory

`D:\MU\catalog\vps-inventory.json` (13.3KB) — a documented, 15-batch,
read-only inventory (2026-08-17/18). Covers: a comprehensive source-code
hunt (0 source files found anywhere on the VPS — runtime-only, confirmed),
all real user profiles, `ProgramData`, every discovered archive (hash-listed,
never extracted), the VPS's own MU client install, 14 days of Windows Event
Logs (0 MU-relevant errors). One sensitive artifact flagged by filename only,
never read: `C:\Users\Administrador\Desktop\Senha SQL.txt`.

Supporting docs (all at `D:\MU\docs\`, confirmed to exist exactly once, no
duplicates anywhere else under `D:\MU\`):

| Doc | What it covers |
|---|---|
| `vps-new-discoveries.md` | Phase 1/2 narrative findings — GameMaster.txt dating, absence of `dbo.WZ_CreateCharacter`, zero source files, the "Patch Client" find, `PGEditor.rar`/`CashShop.rar` archives |
| `vps-inventory-batch-log.md` | The 15-batch execution log behind `vps-inventory.json` — procedural, no new findings beyond it |
| `vendor-local-tutorial-index.md` | Indexes the 48-file `C:\MuServer\Tutoriais` set; full-text-searched for FakeOnline/Billing/GateNumber/MEMB_STAT (not found); flags `Configurando PagSeguro Auto.htm`/`Configurando PayPal Auto.htm` as unread |
| `fakeonline-activation-analysis.md` | The 2 legitimate `CustomFakeOnline.txt` reload channels (GM `/reload`, GameServer.exe GUI); notes account `BMFAKE01`'s "Sem informações de cobrança" login rejection |
| `configuration-history.md` | Confirms 2026-07-16 backup vs. 2026-07-30 snapshot are byte-identical; drop/zen/XP drift tracking |
| `vps-risk-map.md` | DO_NOT_TOUCH / SAFE_READ / BACKUP_ONLY / SENSITIVE classification map for future agents |

## Vendor tutorial manuals — locally preserved copy

`D:\MU\Research\Vendor\Tutorials\` — 48 files (42 top-level + 6 in a
`Seals - Boosts - Elixirs\` subfolder) + `manifest.json`, every file
SHA-256-verified against the live VPS `C:\MuServer\Tutoriais\` copy.
First-pass SCP copy got 46/48 (2 failed on accented-character filename
mangling — `CustomArena Horário.htm`, `Recarregando arquivos e
configurações.htm`); both were manually re-copied and hash-confirmed
afterward. **All 48 are present and hash-verified as of this audit.**
43/49 [sic — see note] were read and normalized into
`docs/vendor-tutorials-knowledge-extraction.md`; the 2 PagSeguro/PayPal
integration tutorials remain unread (see `LEGACY_SUPPLIER_INDEX.md`).

Note: `docs/knowledge/vps-ingestion.md` states "49 vendor tutorial files";
direct inspection this phase counted 48. Minor, unresolved discrepancy —
flagged, not resolved (possibly an off-by-one in the earlier doc, or a file
removed/renamed since).

Content types confirmed: 27 `.htm`, 3 `.html`, 6 `.png` (screenshots), 2
`.rtf` (Lua script docs), 11 `.txt`.

## Format coverage

**Zero PDF, DOC, DOCX, or CHM files exist anywhere under `D:\MU\`** —
confirmed by two independent full-tree recursive searches this phase (once
across the whole tree, once split per top-level directory). The vendor's
documentation format for this engine is exclusively `.htm`/`.html`/`.txt`/
`.rtf` plus screenshots — there is no PDF/Word manual to find. Do not assume
a missing PDF is a gap; none was ever produced by this vendor as far as this
audit found.

## Incremental re-check tooling

`bm-remote inventory <root>` / `inventory-json <root>` (allowlisted roots:
`Data`, `Tutoriais`, `GameServer\DATA`, `GameServerCS\DATA`), with 21 unit
tests covering path-safety (`Tools/RemoteOps/tests/test-inventory-safety.ps1`).
See `docs/knowledge/vps-ingestion.md` §"Incremental sweeps" for the exact
re-check procedure — not repeated here.

## Coverage summary

| Metric | Value |
|---|---|
| VPS documentation files known (`C:\MuServer\Tutoriais`) | 48 |
| Locally preserved + hash-verified | 48 (100%) |
| Normalized into a knowledge doc | 43 (~90%) |
| Explicitly flagged unread | 2 (PagSeguro/PayPal auto-integration) |
| Untranscribed but flagged high-value | 3 remaining (~5%, see `KNOWLEDGE_GAPS.md`) |
| PDF/DOC/DOCX/CHM anywhere on `D:\MU` | 0 (confirmed, not a format this vendor used) |
