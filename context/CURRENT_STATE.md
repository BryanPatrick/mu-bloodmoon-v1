---
status: ACTIVE
category: context-pack
audience: internal (bootstrap-time read)
lastVerified: 2026-09-26
---

# Current state

Kept deliberately short — this is a snapshot for bootstrap, not a
history. For history, see `docs/README.md`'s own
running phase log (not yet on `main`; see
[`MAIN_INTEGRATION.md`](MAIN_INTEGRATION.md)), `docs/decisions/`, and `docs/handoff/`.

## Canonical source and Blood Moon AI (2026-09-25, `BLOODMOON-AI-06`) — read first

- **`main` is the definitive canonical source of truth** (Bryan,
  2026-09-25, [`ADR-0034`](../docs/decisions/0034-main-is-the-canonical-source-of-truth.md)).
  `docs/agent-automation-architecture`, `governance/engineering-pack`
  and `preservation/main-snapshot-b5a4321d` (the former local `D:\MU`
  `main`) are historical/preserved sources only. This Context Pack
  reached `main` in `BLOODMOON-AI-06`; see
  [`MAIN_INTEGRATION.md`](MAIN_INTEGRATION.md) for what came across,
  what did not, and how to read older "on `main`" statements below
  (they mean the former local `main`, not GitHub `main`).
- **Blood Moon AI** is a first-class product platform
  (`ADR-0033`); the Blood Moon Knowledge Specialist
  (`.claude/agents/bloodmoon-knowledge-specialist.md` + 4 `bloodmoon-*`
  skills) is its first real capability: a read-only, non-autonomous
  knowledge/retrieval kernel that Claude consults. Claude remains the
  only autonomous agent in V1.
- **Stage status**: `STAGE 0` DONE; **`STAGE 1` COMPLETE** — PR #1
  merged to `main` (`dd11117`), and a fresh session discovered the
  specialist and invoked it by name twice, 8/8 checks PASS
  (`BLOODMOON-AI-05C`, 2026-09-25); **`STAGE 2` (internal question
  answering) ACTIVE**, authorized by the `BLOODMOON-AI-05` brief
  (2026-09-25) and formally recorded as
  [`DEC-BLOODMOON-AI-001`](DECISIONS.md) (2026-09-26,
  `BLOODMOON-AI-07`). Stages 3-8 not authorized. Detail:
  [`domains/bloodmoon-ai.md`](domains/bloodmoon-ai.md),
  `docs/architecture/bloodmoon-ai-product-vision.md` §20/§23.
- **Cloudflare / provider transition (2026-09-26, `BLOODMOON-AI-07`)**:
  the current reconciled state is on `main` in
  [`docs/cloudflare-migration/`](../docs/cloudflare-migration/README.md)
  (start at `CURRENT_STATE.md`). As of the latest evidence (2026-09-24)
  production is entirely at the current provider; Cloudflare holds only
  non-production shadows; a Web-first transition (API + database stay at
  the provider; the engine's exact name is disputed, `GAP-AI07-03`) is approved but not authorized to execute.
- **Portal / player knowledge (2026-09-26, `BLOODMOON-AI-07`)**: first
  structured layer in [`docs/knowledge/portal/`](../docs/knowledge/portal/README.md)
  (feature inventory, navigation map, use cases, FAQ, gap lifecycle).
  **Caveat**: `main`'s `apps/` code is 78 commits behind the last
  evidenced production deploy (`1c272db`, 2026-09-14); portal knowledge
  is sourced from that deployed commit, not from `main`'s `apps/`.
- Repository continuity: the 2026-09-18 audit's
  `LOCAL_SINGLE_MACHINE_CRITICAL_RISK` is `NO` (every branch with
  meaningful unique content is on `origin`) —
  `docs/architecture/repository-continuity-audit-2026-09-18.md`.

The sections below are the 2026-09-17 snapshot. Where a line is now
false it is struck through with the correction; the rest has not been
re-verified in this pass.

## Repository / branch (Phase 11, updated)

- Canonical primary worktree: `D:\MU\mu-bloodmoon-v1`.
- ~~Current branch: `phase-9/context-pack-v1-foundation` (see the git log
  for the exact current HEAD — this file doesn't hardcode a commit SHA
  that goes stale the moment another commit lands). Clean tree.
  **Not merged into `main` — deliberately; merge gate is preservation
  PASS + validation PASS + secret scan PASS + a real independent
  content review PASS**, only the last one still outstanding~~
  **(2026-09-25: brought to GitHub `main` by `BLOODMOON-AI-06`, by
  Bryan's authorization; see the section above)** (see
  [`DEFERRED.md`](DEFERRED.md) and
  [`docs/operations/context-pack-independent-review.md`](../docs/operations/context-pack-independent-review.md)).
- ~~`main` itself: HEAD `f5fd099a`, 91 commits ahead of `origin/main`
  (confirmed via `git branch -v`), not pushed.~~ **(2026-09-18/25: the
  local `main` reached `b5a4321d`, 110 commits ahead, and is preserved
  on `origin` as `preservation/main-snapshot-b5a4321d`; GitHub `main` is
  the canonical target — `ADR-0034`.)**
- **Origin relationship**: `origin` = `github.com/BryanPatrick/mu-bloodmoon-v1`.
  Nothing pushed this phase or last.
- **Active feature branches relevant to this pack** (full detail:
  [`REPOSITORY_KNOWLEDGE_MAP.md`](REPOSITORY_KNOWLEDGE_MAP.md)):
  `architecture/agent-orchestration-foundation` (real n8n/AI/notification
  design proposal, unmerged, not checked out anywhere), `payments/asaas-sandbox`
  + `payments/asaas-local-hardening-claude` +
  `payments/asaas-sandbox-phase5-codex` (Asaas local DB-parity continuation),
  `governance/engineering-pack`
  (~~canonical home of `AGENTS.md`/bootstrap protocol~~ former home;
  historical source since `ADR-0034` — `AGENTS.md` and the bootstrap
  protocol are canonical on `main`).
- **`mu-bloodmoon-v1-openbeta`**: 220 dirty entries (143 untracked, 77
  modified), unchanged since a 2026-09-08 finding. **A byte-exact,
  hash-verified copy of all 125 untracked documentation files now
  exists** at `preservation/openbeta-untracked/`
  (Phase 11; on `docs/agent-automation-architecture`, not brought to
  `main` — see [`MAIN_INTEGRATION.md`](MAIN_INTEGRATION.md)) — the originals are untouched, and whether to actually
  commit/integrate this content anywhere real remains open (see
  [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) OQ-CTX-005). Includes the
  only known copies of the real player/admin/super-admin/technical
  manuals (OQ-CTX-008).
- `D:\MU\` also holds ~19 other `mu-bloodmoon-*` worktrees not inspected
  this phase (out of named scope). Confirm branch/worktree before any
  non-trivial action — `AGENTS.md` invariant 2.

## Product state (high level — see `docs/README.md`'s phase log for detail)

- Portal (`apps/web`, Nuxt) + API (`apps/api`, NestJS): accounts, VIP,
  economy, marketplace, community/guilds — live product surfaces.
  **Commercial VIP tiers, current (Phase 14, `DEC-VIP-001`)**:
  Free/Silver/Gold; Bronze commercially disabled, technical enum/schema
  untouched — see [`domains/vip.md`](domains/vip.md).
- GameServer integration: real, read/write-boundary-controlled via
  GameBridge **[= `GAME_COMMAND_TRANSPORT` for writes — `docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md`]** — see [`domains/game-economy.md`](domains/game-economy.md).
  A separate, newer Game Data Platform pipeline
  (`apps/game-bridge-agent` + Cloudflare Worker) is architecture-approved
  and mid-implementation as of the most recent local plan on file
  (see `docs/game-data/`) — ~~not yet deployed against real infrastructure~~ **(annotation 2026-09-19, Phase 20A: the Worker, D1 and Agent run against real infrastructure — Phase 2D end-to-end PASS 2026-08-20, Phase 3D-A production command path 2026-08-24, heartbeat verified live through D1 on 2026-09-19; ~~the VPS-side task/binary was not inspected~~ **[Phase 20B, 2026-09-21: inspected read-only — Agent process running since 2026-08-25, binary `0.1.0+20a0d71c` built 2026-08-24, extension handlers not deployed; references/game-data/sql-discovery/phase-20b-live-agent-verification-20260921/]**; see `docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md` Part 5)**.
- Payments: real Mercado Pago integration remains, but **Asaas is the
  current primary provider direction** (Phase 14, `DEC-PAYMENTS-001`) —
  see [`domains/payments.md`](domains/payments.md).
- Launcher (.NET/WPF desktop): auth + CAPTCHA + Play-gating shipped
  locally, scale/accessibility work shipped.

## Knowledge Hub orchestration state (separate repo, `D:\MU\hub`) — Phase 10, updated

- Production: `ai-knowledge-hub` Worker, `ai-knowledge-hub-db` D1 — real,
  live. All 26 decisions read directly this phase (read-only); 44
  tasks / 418 events is still Phase-6-count-only, not re-verified.
- Staging: `ai-knowledge-hub-staging` Worker, `ai-knowledge-hub-db-staging`
  D1 — real, permanent. **`ORCHESTRATION_ENABLED` set to `false` this
  phase** (idle policy — no genuinely active task existed at the time;
  the only claimed-looking rows had already-expired leases from old
  regression fixtures). Flip back to `true` deliberately before the
  next real pilot/test.
- The first real Claude staging pilot (Phase 9) completed successfully:
  task `58358ff6` → `completed`, real actor `claude-code-real-staging`.
  See [`domains/orchestration.md`](domains/orchestration.md).

## Asaas payments (Phase 12 review, updated after Phase 6)

Codex built a sandbox PIX adapter (`payments/asaas-sandbox`); Claude
hardened it (versioned PII encryption) and merged in the canonical
migration fix (`payments/asaas-local-hardening-claude`). ~~The handoff
awaits Codex's MySQL/MariaDB rerun.~~ Codex completed that local rerun
on `payments/asaas-sandbox-phase5-codex` at
`066ad3be6bf12ffad35e9daf86f6307f2a9cd428`: both engines applied
56/56 migrations and passed 48/48 DB tests each; 114/114 common API
unit tests passed. A pre-Beta purge guard now protects Asaas billing
and pending payment evidence. ~~This is local validation, not real
Asaas Sandbox API validation.~~ **Later on 2026-09-17, Phase 6 at
`ed326e90` used a dedicated Sandbox key and proved real customer
creation/reuse, PIX, provider lookup, automatic webhook delivery,
two exactly-once 10-WC credits, overdue/cancellation and restart
reconciliation.** One actual provider difference (`deleted=true` while
`status=OVERDUE`) was fixed. The temporary webhook/tunnel/local DB
were removed; synthetic Sandbox customer/charge evidence remains.
This branch is still unmerged and production payments remain disabled.
See [`domains/payments.md`](domains/payments.md) and the Phase 6 report
on the Asaas continuation branch.

## What is NOT true yet (explicit, so it isn't assumed)

- No n8n installation exists anywhere in this project (a real design
  proposal exists, unmerged, undecided — see [`domains/n8n.md`](domains/n8n.md)).
- No real Codex staging pilot has run (design only — see
  [`DEFERRED.md`](DEFERRED.md)).
- No ChatGPT conversation transcript has been ingested into this pack or
  the Knowledge Hub.
- No production Knowledge Hub mutation (read-only `SELECT` only, every
  phase) and no production Blood Moon change occurred.
- ~~This Context Pack is **not merged** into `main`.~~ **(2026-09-25:
  it is on `main` via `BLOODMOON-AI-06`.)**
- No Blood Moon AI stage past `STAGE 2` is authorized; nothing
  player-facing is built (`ADR-0033`).
