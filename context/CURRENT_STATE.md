---
status: ACTIVE
category: context-pack
audience: internal (bootstrap-time read)
lastVerified: 2026-09-17
---

# Current state

Kept deliberately short — this is a snapshot for bootstrap, not a
history. For history, see [`docs/README.md`](../docs/README.md)'s own
running phase log, `docs/decisions/`, and `docs/handoff/`.

## Repository / branch (Phase 10, updated)

- Canonical primary worktree: `D:\MU\mu-bloodmoon-v1`.
- Current branch: `phase-9/context-pack-v1-foundation`, HEAD `0f06046c`,
  clean. **Not merged into `main` — deliberately, per Phase 10 DECISÕES
  #4; merge gate is repository reconciliation PASS + validation PASS +
  a real independent content review PASS**, none of the last one done
  yet (see [`DEFERRED.md`](DEFERRED.md)).
- `main` itself: HEAD `f5fd099a`, 91 commits ahead of `origin/main`
  (confirmed via `git branch -v`), not pushed.
- **Origin relationship**: `origin` = `github.com/BryanPatrick/mu-bloodmoon-v1`.
  Nothing pushed this phase or last.
- **Active feature branches relevant to this pack** (full detail:
  [`REPOSITORY_KNOWLEDGE_MAP.md`](REPOSITORY_KNOWLEDGE_MAP.md)):
  `architecture/agent-orchestration-foundation` (real n8n/AI/notification
  design proposal, unmerged, not checked out anywhere), `payments/asaas-sandbox`
  + `payments/asaas-local-hardening-claude` (real Asaas sandbox work,
  Codex→Claude handoff pending Codex's return), `governance/engineering-pack`
  (canonical home of `AGENTS.md`/bootstrap protocol).
- **`mu-bloodmoon-v1-openbeta`**: 220 dirty entries (143 untracked, 77
  modified), unchanged since a 2026-09-08 finding — holds real,
  otherwise-uncaptured content (full ADR set, `open-questions.md`,
  `open-risks.md`, most of `docs/knowledge/*`, `docs/gameserver/`,
  `docs/store/`). Real data-loss risk, not fixed this phase (read-only
  scope) — see [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) OQ-CTX-005.
- `D:\MU\` also holds ~19 other `mu-bloodmoon-*` worktrees not inspected
  this phase (out of named scope). Confirm branch/worktree before any
  non-trivial action — `AGENTS.md` invariant 2.

## Product state (high level — see `docs/README.md`'s phase log for detail)

- Portal (`apps/web`, Nuxt) + API (`apps/api`, NestJS): accounts, VIP,
  economy, marketplace, community/guilds — live product surfaces.
- GameServer integration: real, read/write-boundary-controlled via
  GameBridge — see [`domains/game-economy.md`](domains/game-economy.md).
  A separate, newer Game Data Platform pipeline
  (`apps/game-bridge-agent` + Cloudflare Worker) is architecture-approved
  and mid-implementation as of the most recent local plan on file
  (see `docs/game-data/`) — not yet deployed against real infrastructure.
- Payments: real Mercado Pago integration, risk/chargeback control plane,
  sandbox-validation-pending on refund/reconciliation adapters — see
  [`domains/payments.md`](domains/payments.md).
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

## Asaas payments (Phase 10, new)

Codex built a sandbox PIX adapter (`payments/asaas-sandbox`); Claude
hardened it (versioned PII encryption) and merged in the canonical
migration fix (`payments/asaas-local-hardening-claude`); a real handoff
doc awaits Codex's return to re-run the MySQL/MariaDB suite before any
merge. Production Asaas: not enabled, no real credentials anywhere.
See [`domains/payments.md`](domains/payments.md).

## What is NOT true yet (explicit, so it isn't assumed)

- No n8n installation exists anywhere in this project (a real design
  proposal exists, unmerged, undecided — see [`domains/n8n.md`](domains/n8n.md)).
- No real Codex staging pilot has run (design only — see
  [`DEFERRED.md`](DEFERRED.md)).
- No ChatGPT conversation transcript has been ingested into this pack or
  the Knowledge Hub.
- No production Knowledge Hub mutation (read-only `SELECT` only, Phase
  10) and no production Blood Moon change occurred.
- This Context Pack is **not merged** into `main` (Phase 10 DECISÕES #4).
