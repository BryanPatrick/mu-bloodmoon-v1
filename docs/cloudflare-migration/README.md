---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-26
---

# Cloudflare migration program — current canonical set on `main`

Blood Moon is moving infrastructure away from the current hosting
provider (cPanel/LiteSpeed at a Brazilian host) toward infrastructure
Bryan controls, with Cloudflare as the primary application/edge
platform. The long-term goal is `CURRENT_PROVIDER = ZERO`. It is a
shadow-deployment, evidence-based program, never a big-bang cutover.

**This folder reached `main` in `BLOODMOON-AI-07` (2026-09-26).** Before
that, every Cloudflare document lived only on preserved `infra/*`
branches, so an ordinary "what is the current Cloudflare state?" question
could not be answered from `main` (`KNOWLEDGE_GAPS.md` GAP-AI06B-04 on the
open PR #3). The files here are a **selective, reconciled** integration,
not a copy of any one branch: the program's history forked into two
lineages that each carry newer facts the other lacks (see
[`SOURCE_INVENTORY.md`](SOURCE_INVENTORY.md)).

## Read this first

1. This file.
2. [`CURRENT_STATE.md`](CURRENT_STATE.md) — the current truth per domain
   (domain, Web, API, MySQL, R2, backup, CORS/Turnstile, e-mail, provider
   exit), each fact labelled `CURRENT` / `PROVEN_NON_PRODUCTION` /
   `PLANNED` / `HISTORICAL` / `SUPERSEDED` / `UNKNOWN`.
3. [`DECISIONS.md`](DECISIONS.md) — only what Bryan approved, verbatim.
4. [`TARGET_ARCHITECTURE.md`](TARGET_ARCHITECTURE.md) — the approved
   2026-09-24 Web-first transition and the final goal.
5. [`PHASE_STATUS.md`](PHASE_STATUS.md) — every phase, both lineages, with
   its commit.
6. [`RISKS.md`](RISKS.md) — open risks, with the risk-ID collision between
   the two lineages resolved.
7. [`PROVIDER_EXIT_CHECKLIST.md`](PROVIDER_EXIT_CHECKLIST.md) — exit gates.
8. [`WEB_PROVIDER_API_TRANSITION_RUNBOOK.md`](WEB_PROVIDER_API_TRANSITION_RUNBOOK.md)
   — the gate, smoke and rollback for the Web-only move (prepared, **not
   authorized**).
9. [`SOURCE_INVENTORY.md`](SOURCE_INVENTORY.md) — every Cloudflare document
   on every branch, classified, and where to read the deep references.

## What is on `main` and what stays on the preserved branches

| File here | How it got here |
|---|---|
| `DECISIONS.md` | Verbatim from `infra/cloudflare-web-shadow-rc-02` @ `f2584a4` (git blob `72ca4ab`). It is a strict superset of every other branch's copy. |
| `WEB_PROVIDER_API_TRANSITION_RUNBOOK.md` | Verbatim from `infra/cloudflare-web-shadow-rc-02` @ `f2584a4` (git blob `6e75916`). Only copy that exists. Written in Portuguese. |
| `CURRENT_STATE.md`, `TARGET_ARCHITECTURE.md`, `PHASE_STATUS.md`, `RISKS.md`, `PROVIDER_EXIT_CHECKLIST.md` | **Reconciled in `BLOODMOON-AI-07`** from both lineages. Every fact cites its branch and commit. They replace no branch file; the branch originals stay as the evidence record. |
| `README.md`, `SOURCE_INVENTORY.md` | New in `BLOODMOON-AI-07`. |

Deep references (R2 inventory, backup design and proof, e-mail audit,
DNS inventory, API/DB/Web migration analysis, the Container candidate
report) were **not** copied. They are long, phase-specific evidence
documents; the current conclusions they support are summarized here with
citations. Read them with `git show <branch>:<path>`; the exact branch
for each is in `SOURCE_INVENTORY.md`. Their status is
`HISTORICAL_SOURCE` for current-state questions and
`CURRENT_DEEP_REFERENCE` for "show me the evidence" questions.

## Document contract (kept from the branch README)

- A recommendation is never promoted to a decision, an inference is never
  promoted to a fact, and a planned or shadow service is never described
  as deployed to production.
- `DECISIONS.md` holds only what Bryan approved. Everything else is a
  finding, a design, or a plan.
- **"A Worker exists" never means "Cloudflare is in production."** The
  shadow Web Worker, the shadow API Container and the R2 buckets are
  non-production resources. As of the latest evidence (2026-09-24) no
  production hostname routes to Cloudflare.

## Program-wide constraints (Bryan's decisions, `DECISIONS.md`)

- No big-bang migration; every cutover reversible until finalized.
- Cloudflare Hyperdrive is not a database and never replaces MySQL.
- The current provider's MySQL stays bound to `127.0.0.1`; it is never
  exposed remotely, in any phase.
- The financial portal (recharge, VIP, wallet, marketplace escrow) never
  moves to D1. Any future database must be MySQL-compatible.
- No production DNS change, production deploy, or production database
  write happens under this program without its own explicit,
  contemporaneous authorization. An earlier phase's decision is never a
  blanket authorization for a later one.

## Existing Cloudflare footprint that is **not** this program

Two unrelated workloads already run in the same Cloudflare account and
must not be confused with the public-site migration: the **Game Data
Platform** (`bloodmoon-game-data-worker`, D1 `bloodmoon-game-data`, the
`GAME_COMMAND_TRANSPORT` Worker/Queue —
[`docs/game-data/cloudflare-resources.md`](../game-data/cloudflare-resources.md),
[`docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md`](../knowledge/GAMEBRIDGE_DISAMBIGUATION.md))
and the **AI Knowledge Hub** (`ai-knowledge-hub`, its own Worker/D1/R2 —
[`context/INFRASTRUCTURE.md`](../../context/INFRASTRUCTURE.md)).

## Keeping this folder current

The Cloudflare program still runs on its own `infra/*` branches. When a
new Cloudflare phase lands, update `CURRENT_STATE.md`, `PHASE_STATUS.md`
and `RISKS.md` here in the same cycle (or record in `PHASE_STATUS.md`
that a newer branch exists and has not been reconciled yet). A branch
document that is newer than this folder is newer evidence, not current
canonical truth, until it is reconciled here (`ADR-0034`).
