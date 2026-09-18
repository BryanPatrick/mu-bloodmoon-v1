---
status: ACTIVE
category: knowledge
audience: internal (product + engineering)
lastVerified: 2026-09-18
---

# Conflict register

Per `docs/knowledge/conflict-resolution.md`'s rule: never silently pick a
winner. Findings from Phase 18/18B (2026-09-18).

## No direct factual contradictions found this phase

Unlike the 2026-08-25 sweep (also "no conflicts found," per
`conflict-resolution.md`), this phase's new captures (the DMN CMS PHP source
trace, the Knowledge Hub counts, the VPS doc cross-check) are net-new
evidence filling gaps, not re-descriptions of something already documented
differently elsewhere.

## Two near-conflicts, resolved with reasoning (not merged, not deleted)

### 1. "49" vs. "48" vendor tutorial files

- **Claim A**: `docs/knowledge/vps-ingestion.md` states "49 vendor tutorial
  files were copied... 43 of 49 have been read."
- **Claim B**: Direct inspection this phase (`Research/Vendor/Tutorials/`
  directory listing + `Tutorials_copy_results.json`'s 48 entries +
  `manifest.json`'s 48 entries) found 48, not 49.
- **Resolution**: Unresolved discrepancy, not adjudicated. Possibly an
  off-by-one error in the original doc, or a file removed/renamed since
  2026-08-17. Both numbers are now recorded (`VPS_DOCUMENTATION_INDEX.md`)
  rather than one silently overwriting the other.

### 2. "46/48 copied" vs. "48/48 OK"

- **Claim A**: `Tutorials_copy_results.json` (first-pass SCP transfer log)
  records 46 `COPIED` + 2 `FAILED` (accented-filename SCP mangling).
- **Claim B**: `Tutorials/manifest.json` (later SHA-256 verification pass)
  records all 48 as `OK`, with the same 2 files annotated "name mangled in
  SSH text transport, fixed manually; hash/size confirmed match."
- **Resolution**: **Not a conflict** — a two-stage record of the same real
  event (first-pass failure, then manual fix + verification). Both files
  are kept; `manifest.json` is the current-state source of truth.

## Worktree fragmentation (a source-duplication issue, not a factual conflict)

`mu-bloodmoon-legacy-catalog`'s `docs/economy/` (4 files, stale) vs.
`mu-bloodmoon-v1`'s `docs/economy/` (9 files, current) do not contradict
each other — the smaller set is simply an earlier snapshot missing later
findings (`legacy-dmn-cms-and-currency-investigation.md` and others). Not a
CLAIM-vs-CLAIM conflict; recorded as a governance gap instead
(`KNOWLEDGE_GAPS.md` GAP-P18-04).

## Community source vs. vendor source (a relevance boundary, not a conflict)

The EuSanTiago/RealMU WCoin-purchase transcript describes different game
mechanics/economics than Blood Moon's own — this is expected and correctly
handled by the existing `PROVIDER_SPECIFIC_OTHER_SERVER` classification,
not a conflict requiring resolution (per `source-authority.md`'s own
worked example, already in place before this phase).

## Phase 20 (2026-09-18) — real contradictions found

Per `conflict-resolution.md`: no silent winner. Where a primary source and a
later summary disagree, the primary source is recorded as the working position
and the summary is left in place, marked. Nothing outside `docs/knowledge/` was
edited.

### 3. Was the GameBridge Agent ever deployed?

- **Claim A** ("never deployed"): `docs/operations/deployment-rollback-runbook.md:104,125`,
  `incident-response-runbook.md:142`, `phase-aa-ops-hardening-report.md:302`,
  `pre-beta-go-no-go-checklist.md:20`, `context/CURRENT_STATE.md:60-62`.
- **Claim B** (running): Phase 3D-A raw evidence dated 2026-08-24 —
  `references/game-data/sql-discovery/phase-3d-a-production-command-transport-20260824/raw/02-…:6`
  ("VPS task BloodMoonGameBridgeAgent Running, one process"), `raw/03-…` (a real
  QA account created, `memb_guid=8`), `raw/04-…`; corroborated by
  `docs/security/secret-incident-history.md:53-58` and
  `docs/operations/provisioning-health.md:70-72`.
- **Resolution (working position)**: the raw evidence wins over later prose —
  `GAME_COMMAND_TRANSPORT` was deployed and active for `CREATE_GAME_ACCOUNT` as
  of 2026-08-24. Claim A is probably about the *extension* commands or about a
  "Windows Service" (the Agent is a scheduled task), but that is inference. The
  live state was **not** re-verified in Phase 20. Tracked: GAP-P20-02.

### 4. Was the Worker extended for GRANT_VIP / SYNC_VIP_TIER / ANONYMIZE / PURGE?

- **Claim A** (yes): `docs/gamebridge/gamebridge-agent-extension-plan.md:625`
  ("`commands.ts` estendidos para os 5 tipos de comando … implementado e testado
  localmente").
- **Claim B** (no): the committed `apps/game-data-worker/src/commands.ts` is
  the identical blob on all 30 local branch tips and accepts only
  `CREATE_GAME_ACCOUNT` (`parseCreate`); `db/schema.sql` still has
  `CHECK (command_type = 'CREATE_GAME_ACCOUNT')`;
  `docs/architecture/control-plane-domain-audit.md:306-313` says the extension
  is "not wired through the Worker".
- **Resolution**: **both are true of different places.** The extension exists
  as **uncommitted** changes in the `mu-bloodmoon-v1-openbeta` worktree
  (`commands.ts` +189, `schema.sql`, `commands.spec.ts`; migration `0004`
  untracked there, committed here). "Implemented and tested locally" is true
  *there*; "not wired" is true of every committed branch. Loss risk, tracked as
  GAP-P20-02.

### 5. Is "GameBridge" active?

`KNOWLEDGE_MASTER_INDEX.md` (Phase 18B) answered "NO — `MU_BRIDGE_ENABLED=false`
by default everywhere". True of `MARKETPLACE_DELIVERY_WORKER`; false of
`GAME_COMMAND_TRANSPORT` for `CREATE_GAME_ACCOUNT`. **Self-correction**, applied
inline; canonical names in `GAMEBRIDGE_DISAMBIGUATION.md`.

### 6. Is `CashShopData` "live-read"?

Phase 18/18C text (`LEGACY_SUPPLIER_INDEX.md`, `CASH_VIP_INTEGRATION_MAP.md`
Parts 2, 5, 6) said the GameServer reads it "directly at interaction time … no
separate sync". No preserved evidence supports that; it was an inference from
"same table". **Self-correction**, applied inline (strikethrough + correction);
the honest status is UNKNOWN (GAP-P20-04).

### 7. Cash/Gold/PcPoint vs WCoinC/WCoinP/GoblinPoint

GAP-P18-11 said Blood Moon's own files used "only the WCoin/GoblinPoint names".
Blood Moon's files use both (`CustomEventAuction.txt`, message ids
980/1033/1140/1145, `/util` operands). **Self-correction**; the gap is resolved
(`CURRENCY_TERMINOLOGY.md`).

### 8. What is Portal GP / HP?

ADR-0009 (`decisions/0009-wcoin-currency-tax-model.md:25-26,63-65`): "GP … and HP
… two native GameServer currencies … earn-only". `phase-y-production-readiness-inventory.md:188`:
HP has "no GameServer analog". `commerce.service.ts:162-169` seeds real-money Pix
packages for **both** GP and HP. The real `Character.HuntPoints` column is per
character and linked to neither. **Unresolved, not adjudicated** — GAP-P20-07.

### Not a conflict

* `context/preservation/**` repeats the ambiguous "GameBridge" wording of the
  originals byte for byte; that is preservation, not a second opinion.
* The Agent's test counts (75/75, 123/123) differ because they were taken at
  different phases; not re-run in Phase 20.
