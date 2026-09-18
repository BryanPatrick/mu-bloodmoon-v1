---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-17
---

# Open questions

`docs/open-questions.md` is referenced repeatedly by `docs/README.md`
but does not exist on this branch (`git ls-tree` confirmed, see
[`SOURCE_INDEX.md`](SOURCE_INDEX.md)). This file is a genuine, honestly
new addition to fill that real gap for this branch — it does not
duplicate a file that exists elsewhere on `main`, because no such file
exists here. If a future merge brings a real `docs/open-questions.md`
onto `main`, reconcile the two rather than keeping both.

| ID | Question | Why it's open |
|---|---|---|
| OQ-CTX-001 | **RESOLVED, Phase 10, detail completed Phase 11.** All of `docs/README.md`'s referenced-but-absent files are Category C — real content, preserved from `mu-bloodmoon-v1-openbeta`'s untracked working tree (125 files, not the ~24 first estimated — see `preservation/OPENBETA_UNTRACKED_MANIFEST.md`). | Fully resolved with evidence; the follow-up action (whether to commit this content somewhere real) is OQ-CTX-005. |
| OQ-CTX-002 | **SUPERSEDED, Phase 10 DECISÕES #1**: Knowledge Hub decision IDs are permanently canonical — no `DEC-<DOMAIN>-NNN` replacement will ever be minted for them. Non-canonical aliases only, see `KNOWLEDGE_HUB_MAPPING.md`. | No longer open — closed by explicit instruction, not by this pack's own judgment. |
| OQ-CTX-003 | **FULLY RESOLVED, Phase 11.** ADR-0016's real content (read in full): "no official Blood Moon marketplace; RMT between players is allowed, unmediated; traceable-vs-non-traceable evidence split; character sale allowed, account sale allowed-direction pending security design." See [`ADR_INDEX.md`](ADR_INDEX.md). | Fully answered — both existence/location (Phase 10) and content (Phase 11). |
| OQ-CTX-004 | Should `context/` eventually be merged/reconciled with whatever governance content exists on `governance/engineering-pack` or `mu-bloodmoon-v1-openbeta`? | Still open — a real decision for Bryan. |
| OQ-CTX-005 | `mu-bloodmoon-v1-openbeta` has 220 dirty entries (143 untracked, 77 modified) — unchanged since the 2026-09-08 recovery finding. **Phase 11 preserved a byte-exact copy of all 125 untracked documentation files** (`preservation/openbeta-untracked/`, hash-verified) as reference material — this reduces the *loss* risk but does not resolve the underlying question: should this content actually be committed (on its own branch, never `main` directly), reconciled into the real `docs/decisions/`/`docs/knowledge/` trees, and the openbeta worktree itself cleaned up? | Loss risk mitigated by preservation; the integration decision remains open — explicitly Bryan's call, and explicitly not this phase's to make (Part 0 forbids cleanup/deletion). |
| OQ-CTX-006 | Are Knowledge Hub decisions `cf5f14c2`/`53034c0c` (SITE_BETA_BLOCKED / NO-GO, 2026-08-08) still accurate? **Phase 16 update: the fresh audit now exists** — [`docs/handoff/open-beta-readiness-audit-2026-09-17.md`](../docs/handoff/open-beta-readiness-audit-2026-09-17.md) re-tests every cited blocker with reproducible current evidence (CAPTCHA/rate-limiting/404/HTTPS/baseline-tests: RESOLVED; password recovery: PARTIAL, deployed e2e proof still missing; Loja/Marketplace/GameBridge: UNCHANGED, real Plan A/B already written) and finds two new, not-previously-cited CRITICAL/HIGH items (§8 of that doc). | Still not formally resolved — the audit deliberately makes no GO/NO-GO call; it prepares proposed decision text (in the audit doc itself) for Bryan to act on. |
| OQ-CTX-010 | A real production MySQL credential was committed to a tracked file in a now-confirmed-publicly-reachable GitHub repo (`docs/handoff/site-beta-checklist.md`, "Etapa 19.1"). Redacted in the tracked file, but **the credential itself has never been rotated** (`docs/operations/phase-aa-ops-hardening-report.md`: "cPanel primary password rotation — pending owner action," still true as of this phase's live re-check). Rotation tooling exists and is merged to `main` but has never been run against production. | `CRITICAL`, unresolved, requires Bryan's direct action (rotation is explicitly a consequential production action, never self-authorized by an agent). |
| OQ-CTX-011 | The web frontend (`mubloodmoon.com.br`, including the login page) sends zero security headers (no CSP/HSTS/X-Frame-Options), confirmed live and in code (`apps/web/nuxt.config.ts`), while the API has real `helmet()` defaults. Not part of the original 2026-08-08 NO-GO decision. | Found Phase 16; real, current, unresolved — fix is small (a Nuxt security-headers module) but not scoped or implemented by this audit. |
| OQ-CTX-007 | ~~Three real decision domains had no matching stub among the original 12.~~ Phase 12 added `community`, `security`, and `testing` as evidence-bounded STUB/PARTIAL files. The underlying six Hub product decisions and wider accounts/product-direction gaps still need individual review. | PARTIALLY RESOLVED — navigation gap closed; substantive verification remains open. |
| OQ-CTX-008 | `docs/README.md` (tracked on `main`) names four player/admin/super-admin/technical manuals in its very first table as if they exist. They don't — only as preserved, untracked originals (`docs/manuals/{player,admin,super-admin,technical}/*.md`, all real, `status: LIVING_DOCUMENT`). Should these be committed to `main`? This is arguably the single most player-facing-consequential item in the entire preservation set — a real player manual that's supposed to exist and doesn't, anywhere reachable. | Found this phase (`preservation/OPENBETA_UNTRACKED_MANIFEST.md` Group 7); not resolved — same constraint as OQ-CTX-005 (no commits/merges this phase). |
| OQ-CTX-009 | `docs/knowledge/knowledge-hub-boundary.md` (preserved, 2026-08-31) independently designed nearly the same repo-vs-Hub authority split this pack's own `GOVERNANCE.md` arrived at in Phase 9 — real convergent evidence, cited there now. But it also guessed the Hub is reachable via `mcp__ccd_session_mgmt__*`, which Phases 5-10's real work disproved (the actual mechanism is a direct HTTP API + CLI). Should the *preserved* document be corrected in place if it's ever promoted out of the archive, or does its historical-record status mean it's left exactly as originally written (per this project's own "never silently overwrite history" convention)? | Found this phase; the preservation copy is left untouched (Part 4's own instruction: copy exactly, don't rewrite) — this question is about what happens if/when it's ever promoted beyond the archive, not about editing the archive copy. |

Real, pre-existing open questions from the wider project (payments,
progression, etc.) are **not** re-listed here — they live in the domain
docs `docs/README.md` names for each phase (e.g. OQ-002, OQ-018 through
OQ-032 mentioned inline in `docs/README.md`'s phase log). This file adds
only what's genuinely new to Phase 9's own work, per `GOVERNANCE.md`'s
"never duplicate" rule.
