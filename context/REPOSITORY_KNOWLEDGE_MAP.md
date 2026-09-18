---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-17
---

# Repository knowledge map (Phase 10, updated Phase 11)

Read-only reconciliation across every relevant local worktree/branch of
`mu-bloodmoon-v1`, plus the Knowledge Hub. Produced to close the gap
Phase 9 left open (`OQ-CTX-001`): which files `docs/README.md`
references but doesn't have on `main` are real-but-uncommitted, real-
but-elsewhere, historical, or genuinely missing. **No branch was
merged, cherry-picked, or altered to produce this document** — every
claim below is sourced from `git show <ref>:<path>`, `git log --all`,
or a real (untracked) file already sitting in a worktree, never
invented.

## 1. Repository context

```
REPO   = D:\MU\mu-bloodmoon-v1 (github.com/BryanPatrick/mu-bloodmoon-v1)
BRANCH = phase-9/context-pack-v1-foundation
HEAD   = 0f06046c
main   HEAD = f5fd099a (91 commits ahead of origin/main -- confirmed via `git branch -v`, not pushed)
```

## 2. Worktrees audited (read-only; none altered)

| Path | Branch | HEAD | Dirty? |
|---|---|---|---|
| `mu-bloodmoon-v1` | phase-9/context-pack-v1-foundation | 0f06046c | clean |
| `mu-bloodmoon-v1-openbeta` | open-beta/p0-foundation | 2811522d | **DIRTY — 143 untracked + 77 modified (220 total)**, see §3 |
| `mu-bloodmoon-engineering-governance` | governance/engineering-pack | b4fea68c | not inspected for dirt this phase (read via `git show`, not `cd`) |
| `mu-bloodmoon-asaas-sandbox` | payments/asaas-sandbox | 08a1f30a | not inspected for dirt this phase |
| `mu-bloodmoon-v1-asaas-claude` | payments/asaas-local-hardening-claude | 223b111c | not inspected for dirt this phase |
| (no worktree currently checks out `architecture/agent-orchestration-foundation`) | — | 7b8c2799 | n/a — read via `git show`, branch exists, not checked out anywhere |
| 19 other `mu-bloodmoon-*` worktrees (account-lifecycle, blood-coin, ci-dotnet-tests, credential-key-rotation, integration-openbeta, launcher-2d-release, launcher-phase1, launcher-play-gate, legacy-catalog, ops-hardening, payment-risk-release, player-preferences, privacy-feedback-release, progression-reset, reconcile-fix, regression-recovery, survey-schema, vip-gamebridge, wcoin-peg-guard, phase7, phase11) | see `git worktree list` | various | not inspected — out of this phase's named scope (main, phase-9, orchestration-foundation, Asaas x2, governance, open-beta) |

`D:\MU\asaas-phase3-disposable-20260916` is **not a git worktree** — it
is a raw MySQL/MariaDB data directory (`#innodb_redo`, `.dblwr` files),
confirmed via `git -C ... rev-parse` failing. Named in the Claude→Codex
Asaas handoff (§5) as a disposable local test database, currently with
two `mysqld.exe` processes running against it — left untouched, exactly
as that handoff already recommended.

## 3. THE docs/README.md gap — resolved with evidence

Phase 9 found several files `docs/README.md` references (on `main`)
that don't exist on `main`. Searched **every local branch tip**
(`git cat-file -e <branch>:<path>` across all 26 branches) and **all of
git history** (`git log --all --diff-filter=A -- <path>`) for each one.
Result for every single file checked: **zero commits, on any branch,
ever** — but all of them are real files, sitting untracked in
`mu-bloodmoon-v1-openbeta`'s working directory right now.

| File | Classification | Evidence |
|---|---|---|
| `docs/open-questions.md` | **C — referenced, never committed** | `?? docs/open-questions.md` in openbeta; 0 hits in `git log --all` |
| `docs/open-risks.md` | **C** | same |
| `docs/decisions/README.md` | **C** | same; openbeta's `docs/decisions/` dir is *entirely* untracked |
| `docs/knowledge/module-map.md` + the other 5 files `docs/README.md` names (`knowledge-hub-boundary.md`, `commercial-modularity.md`, `settings-architecture-direction.md`, `documentation-book-structure.md`, `current-vs-history-audit.md`, `cleanup-recommendations.md`) | **C** | all untracked in openbeta; `main`'s `docs/knowledge/` has only the 7 files that match `governance/engineering-pack`'s own `docs/knowledge/` — the feature-specific ones never made it across |
| ADRs `0001`-`0018`, `0020`, `0022`, `0027` | **C** | openbeta has the FULL `0001`-`0028` set + `README.md`, all untracked; `main` has only `0019/0021/0023/0024/0025/0026/0028/0029/0030` (0028 is on both, tracked on main, untracked-duplicate in openbeta) |
| `docs/gameserver/` (whole dir) | **C** | untracked in openbeta, zero history anywhere |
| `docs/store/` (whole dir) | **C** | untracked in openbeta, zero history anywhere |

**Phase 11 update — the real scope is 125 files, not ~24.** A full
enumeration of every untracked entry under `docs/` (plus `AGENTS.md`/
`CLAUDE.md`) found 125 real files, not just the handful Phase 10 had
specifically checked — including the entire `docs/manuals/`,
`docs/legacy/provider-web/`, `docs/protocols/`, `docs/sessions/`,
`docs/privacy/`, `docs/progression/` trees, plus scattered files across
`docs/economy/`, `docs/gamebridge/`, `docs/launcher/`, `docs/payments/`,
`docs/product/`, `docs/security/`, `docs/vip/`. All 125 were copied
byte-exact into
[`preservation/openbeta-untracked/`](preservation/openbeta-untracked/)
this phase, hash-verified (125/125 PASS) — see
[`preservation/OPENBETA_UNTRACKED_MANIFEST.md`](preservation/OPENBETA_UNTRACKED_MANIFEST.md)
for the full breakdown. Of the 125: 35 are byte-identical to what
`main` already tracks, 7 are `main`-superset originals (main added a
dated freshness note, never a contradiction), and 83 are genuinely
found nowhere else — the real Category-C set.

**Every single one is Category C — "referenced but never committed,"
never A (exists elsewhere as real commits) and never B (existed, was
deleted)**. `git log --all --diff-filter=A` returning zero hits for a
path means no commit, on any reachable branch, ever added that exact
path — ruling out B (a deletion requires a prior addition) and
confirming these were never actually captured by git anywhere, only
ever produced as working-tree files.

**Root cause, evidenced, not guessed**: `main`'s `docs/README.md`,
`AGENTS.md`, and select ADRs are demonstrably a *superset-by-extension*
of openbeta's uncommitted originals (`diff docs/README.md
<(git show main:docs/README.md)` → 0 lines removed, 14 added; same
pattern for `AGENTS.md`, whose own provenance note already says it
"extends... the agent-bootstrap system originally built in
`mu-bloodmoon-v1-openbeta` (where it existed uncommitted)"). Whoever
carried these forward onto `main`/`governance/engineering-pack` copied
the index and the governance files, and cherry-picked/re-authored a
subset of ADRs (commit `1185586d`, "canonicalize ADR-0024, refresh
ADR-0019/0021 deploy status" — present on 10 branches including `main`)
— but never carried forward `docs/open-questions.md`, `docs/open-risks.md`,
`docs/decisions/README.md`, the rest of `docs/knowledge/`, `docs/gameserver/`,
`docs/store/`, or ADRs `0001`-`0018`/`0020`/`0022`/`0027`. This matches
this project's own already-documented incident class exactly (`AGENTS.md`
invariant 4, "a worktree is not a backlog" — and the 2026-09-08 recovery
finding "openbeta has 143 untracked files at loss risk," confirmed
**still true today**, unchanged since that finding).

**This is a live, real data-loss risk, not a documentation curiosity.**
Phase 11 reduced the *loss* risk (a hash-verified copy now exists
outside that one worktree) but not the *integration* question — see
[`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) OQ-CTX-005.

### README reference reconciliation (Part 10, Phase 11)

Every path `docs/README.md` (tracked on `main`) names that isn't
present on `main`, classified:

| Path/group | Classification | Note |
|---|---|---|
| `docs/open-questions.md`, `docs/open-risks.md` | `PRESERVED_UNTRACKED` | Read in full Phase 11 — see manifest Group 3 |
| `docs/decisions/README.md`, ADRs 0001-0018/0020/0022/0027 | `PRESERVED_UNTRACKED` | Read in full Phase 11 — see `ADR_INDEX.md` |
| `docs/knowledge/module-map.md` + 5 siblings | `PRESERVED_UNTRACKED` | See manifest Group 4 |
| `docs/gameserver/` (13 files) | `PRESERVED_UNTRACKED` | See manifest Group 5 |
| `docs/store/` (2 files) | `PRESERVED_UNTRACKED` | Both `DRAFT_FOR_REVIEW` — see manifest Group 6 |
| `docs/manuals/{player,admin,super-admin,technical}/*.md` | `PRESERVED_UNTRACKED` | **Not previously flagged by Phase 10** — found this phase, see `OPEN_QUESTIONS.md` OQ-CTX-008 |
| ADR-0025/0026/0028 (referenced as "partially superseded by 0029") | `CANONICAL_REPLACEMENT_EXISTS` | ADR-0029 (tracked on `main`) is the real, current replacement for the parts it names |
| ADR-0013 (X-Shop item review pending) | `CANONICAL_REPLACEMENT_EXISTS` | ADR-0023 (tracked on `main`) closes the item-level review |
| ADR-0011 (transfer minimum, not implemented) | `CANONICAL_REPLACEMENT_EXISTS` | ADR-0022 + the real `/painel/transferencias` feature (tracked on `main`'s own phase narrative) |
| No path found genuinely `OBSOLETE_REFERENCE` or `UNRESOLVED` | — | Every path checked this phase and last resolved to either `PRESERVED_UNTRACKED` or `CANONICAL_REPLACEMENT_EXISTS` — none were found to be a pure dead reference with nothing behind it anywhere |

`main`'s own `docs/README.md` was **not modified** — this table is a
recommendation for a future correction, per Part 10's own instruction,
never applied here.

## 8. Preservation summary (Phase 11)

```
UNTRACKED_KNOWLEDGE_FILES_FOUND     = 125
UNTRACKED_KNOWLEDGE_FILES_PRESERVED = 125
PRESERVATION_ROOT                    = context/preservation/openbeta-untracked/
PRESERVATION_MANIFEST                = context/preservation/OPENBETA_UNTRACKED_MANIFEST.md
HASH_INTEGRITY                       = PASS (125/125)
ORIGINALS_DELETED                    = NO (never touched)
```
Full per-file classification, provenance, and authority: the manifest
above. `ADR_INDEX.md` covers the 21 preserved ADRs specifically, in
more depth than the manifest's own Group 2 summary.

## 4. Worktree knowledge map

| Document/area | Current location | Source branch | Authoritative? | Merged to main? | Superseded? |
|---|---|---|---|---|---|
| `AGENTS.md` (24 invariants) | `main` (and every branch built on it since) | authored on/after `governance/engineering-pack`'s lineage, extending openbeta's uncommitted original | YES — extends the original by pure addition | YES (it's on `main`) | Openbeta's own uncommitted copy is the historical origin, not superseded content — see §3 |
| `docs/protocols/agent-bootstrap.md` | `main` | same lineage | YES | YES | No |
| `docs/decisions/0001-0018,0020,0022,0027` + `README.md` | **only** `mu-bloodmoon-v1-openbeta` (uncommitted) | never committed | Would-be authoritative (real ADR content) but currently unmerged and at risk | NO | No — just never integrated |
| `docs/decisions/0019,0021,0023-0026,0028-0030` | `main` | commit `1185586d` + later phase commits, present on 10 branches | YES | YES | 0025/0026/0028 partially superseded by 0029 (per `docs/architecture/engineering-governance.md`) |
| `docs/architecture/engineering-agent-orchestration.md`, `bloodmoon-ai-assistant.md`, `notification-intelligence.md` | `architecture/agent-orchestration-foundation` (not checked out in any worktree) | one commit `7b8c2799` on top of `main`'s `f5fd099a` | Real design/proposal — YES as *evidence of a real proposal*, NO as *decided architecture* | NO | No |
| Asaas: sandbox PIX adapter + validation | `payments/asaas-sandbox` (worktree `mu-bloodmoon-asaas-sandbox`) | commits `16753dc7`/`08a1f30a` (Codex) | YES for what it implements | NO | No |
| Asaas: billing PII encryption hardening + migration-checksum fix + Codex handoff | `payments/asaas-local-hardening-claude` (worktree `mu-bloodmoon-v1-asaas-claude`) | built on `asaas-sandbox`'s tip, `main` merged in (`de941f30`), + `1e6b0768`/`223b111c` | YES for what it implements; explicitly **not yet MySQL/MariaDB-re-verified** on this exact HEAD | NO | No |
| `docs/knowledge/*` (7 files: source-authority, raw-capture, conflict-resolution, wiki-preparation, vps-ingestion, youtube-ingestion, knowledge-sweep) | `main` and `governance/engineering-pack` (identical set on both) | shared ancestor | YES | YES | No |
| `docs/open-questions.md`, `docs/open-risks.md`, `docs/knowledge/module-map.md` + 5 siblings, `docs/gameserver/`, `docs/store/` | `mu-bloodmoon-v1-openbeta` only, uncommitted | never committed | Real content, currently unintegrated | NO | No |

Authority above was decided from **content + git history + existing
governance** (the source-of-truth precedence `docs/architecture/engineering-governance.md`
already defines), never from raw file timestamp — per this phase's own
explicit instruction.

## 5. Asaas payments — Phase 11 snapshot, superseded in part by Phase 12

```
Codex original implementation  = payments/asaas-sandbox (16753dc7, 08a1f30a)
                                  local Asaas sandbox PIX adapter +
                                  validation against a disposable DB
Claude hardening                = payments/asaas-local-hardening-claude
                                  (1e6b0768): versioned billing PII
                                  encryption, field-bound AAD (closes a
                                  real AAD-substitution gap between
                                  legalNameCiphertext/cpfCnpjCiphertext)
Canonical migration fix         = merged in via de941f30 (main's
                                  CAST(0 AS JSON) -> '0' fix) -- confirmed
                                  present on this branch, checksum
                                  verified b87b4f0e...ac37726
Remaining sandbox work          = Codex's own 120-test MySQL suite and a
                                  real MariaDB 11 replay have NOT been
                                  re-run against this branch's HEAD
                                  (1e6b0768) -- no Docker available
                                  locally this round, not re-verified
                                  this phase either
Production                      = NOT enabled anywhere; no real Asaas
                                  credentials or network calls exist in
                                  any branch inspected
```
Full handoff, read this phase: `docs/payments/asaas-sandbox-phase4-claude-handoff.md`
on `payments/asaas-local-hardening-claude` (commit `223b111c`). Next
step per that handoff: Codex re-runs the MySQL suite, then a real
MariaDB 11 replay, before merging into `asaas-sandbox` — not this
phase's job to do.

**Phase 12 correction:** the "remaining sandbox work" block above is
historical. Codex completed the local MySQL/MariaDB parity rerun on
`payments/asaas-sandbox-phase5-codex` at `066ad3be`: 56/56 migrations
and 48/48 DB tests on each engine, plus 114/114 API unit tests. The
real Asaas Sandbox API has **not** been called or validated by that
commit. The Phase 6 authorization is a new task, not proof of a call.

**Later Phase 6 evidence (2026-09-17):** commit `ed326e90` on the
same isolated Asaas branch documents actual Sandbox API/customer/PIX,
automatic webhook delivery, two exactly-once 10-WC credits, and a
provider contract correction for `deleted=true` with retained
`OVERDUE` status. This is not merged or production-enabled; see that
branch's `docs/payments/asaas-sandbox-phase6.md`.
No merge or production enablement followed from this review.

## 6. Knowledge Hub production decisions — read in full (READ-ONLY)

26/26 read directly from `ai-knowledge-hub-db` (production) via a
read-only `SELECT` — zero writes, zero mutation. See
[`KNOWLEDGE_HUB_MAPPING.md`](KNOWLEDGE_HUB_MAPPING.md) for the
per-decision table (all 26, with domain mapping and a staleness flag
where repo evidence contradicts the Hub's own `status`). Headline
findings:

- All 26 rows: `status = 'active'`, `supersedes_decision_id = NULL` —
  the Hub itself records **no supersession chain at all**. That does
  not mean all 26 are still true; see the conflict below.
- 17/26 belong to project `ai-knowledge-hub` (decisions about the Hub
  tool itself — data model, security baseline, artifact handling,
  rate limiting). 9/26 belong to project `bloodmoon` (real product
  decisions: E2E test methodology, community media storage, feed
  pagination, privacy-visibility enforcement gaps, two Community
  BETA_READY results, a `SITE_BETA_BLOCKED` result, a formal `NO-GO`
  for public launch, and a password-recovery implementation).
- **A real, explicit conflict, not silently reconciled**: decision
  `cf5f14c2` (2026-08-08T22:55, `SITE_BETA_BLOCKED`, 6 blockers
  including "recuperação de senha inexistente") and `53034c0c`
  (2026-08-08T23:01, formal `NO-GO`, same blocker restated) are
  partly contradicted **within 13 hours** by decision `fa8e9ad0`
  (2026-08-09T12:04), which documents implemented password-recovery
  tokens/endpoints (hashed single-use tokens, 30-min TTL,
  anti-enumeration responses), but **its own context says mail delivery
  remained blocked** at that date. None of the three decisions marks the others as
  `superseded`. This is a genuine Hub-internal inconsistency —
  recorded as a conflict, not fixed by editing any decision (that would
  be exactly the "silently reconcile" this phase forbids).

  **Phase 11 update**: the preserved `open-questions.md`/`open-risks.md`
  (real, read in full, `mu-bloodmoon-v1-openbeta`) were checked for
  independent corroboration of the *other* blockers `cf5f14c2`/
  `53034c0c` cite (CAPTCHA without rate limiting, store payment
  gateway, marketplace/escrow/GameBridge homologation, a 404-page
  crash, zero test coverage outside Community, HTTPS/TLS absence).
  **Result: neither document mentions any of these specific blockers
  at all** — they're silent on this, not confirming or denying. The
  ~~The password-recovery blocker was disproven by `fa8e9ad0`.~~
  **Phase 12 independent recheck:** only the literal claim that no
  password-recovery code exists is disproven. The later
  `docs/handoff/auth-recovery-provider-blocker.md` documents SMTP
  authentication and local mailbox delivery, but still leaves the
  release blocker open until deployed end-to-end recovery is proven.
  The preserved open-questions/open-risks files do not themselves
  confirm resolution of password recovery. The rest of the blocker list remains
  genuinely `UNKNOWN`, still not `SUPERSEDED` by anything this or the
  prior phase found. See `OPEN_QUESTIONS.md` OQ-CTX-006 (refined, not
  closed).

  **Phase 16 update**: a fresh, evidence-based current-state audit now
  exists — [`docs/handoff/open-beta-readiness-audit-2026-09-17.md`](../docs/handoff/open-beta-readiness-audit-2026-09-17.md).
  It re-tests every 2026-08-08 blocker with reproducible current
  evidence (live production checks + real code inspection) and finds
  two real, previously-uncited items: an unrotated, publicly-exposed
  production database credential (`CRITICAL`) and a web-frontend
  security-headers gap (`HIGH`). It deliberately makes no GO/NO-GO call
  and does not mutate the Hub's `cf5f14c2`/`53034c0c` decision — see
  that document's own "Proposed new decision content" section for
  exact, unwritten text Bryan could use to record a real, dated
  decision.

## 7. What this document is not

Not a duplicate of any of the docs it maps. Not a decision. Not a
merge. Every branch/worktree listed above was read via `git show`/
`git log`/`git cat-file`, never checked out destructively, never
altered.
