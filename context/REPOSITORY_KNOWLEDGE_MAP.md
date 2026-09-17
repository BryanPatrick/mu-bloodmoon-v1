---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-17
---

# Repository knowledge map (Phase 10)

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
None of this content is lost yet — but it exists in exactly one place,
uncommitted, in a worktree with 220 dirty entries. See
[`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) OQ-CTX-005.

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

## 5. Asaas payments — real current state

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
  contradicted **within 13 hours** by decision `fa8e9ad0`
  (2026-08-09T12:04), which documents a real, implemented password-
  recovery flow (hashed single-use tokens, 30-min TTL, anti-enumeration
  responses). None of the three decisions marks the others as
  `superseded`. This is a genuine Hub-internal inconsistency —
  recorded as a conflict, not fixed by editing any decision (that would
  be exactly the "silently reconcile" this phase forbids). All three
  ADR-style decisions also predate this repository's Phases O-X
  (2026-08-31 onward: real Mercado Pago integration, VIP purchase,
  direct WC transfer, dozens of new payment/progression tests) by
  three-plus weeks — the `SITE_BETA_BLOCKED`/`NO-GO` results are almost
  certainly stale relative to current repo evidence on at least the
  payment-gateway and test-coverage blockers, but this phase does not
  unilaterally mark them `superseded` without Bryan's decision — see
  `OPEN_QUESTIONS.md` OQ-CTX-006.

## 7. What this document is not

Not a duplicate of any of the docs it maps. Not a decision. Not a
merge. Every branch/worktree listed above was read via `git show`/
`git log`/`git cat-file`, never checked out destructively, never
altered.
