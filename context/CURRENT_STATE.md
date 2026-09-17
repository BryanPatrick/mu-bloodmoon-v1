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

## Repository / branch

- Canonical primary worktree for Blood Moon engineering work: this one,
  `D:\MU\mu-bloodmoon-v1`.
- Branch at last verification: `main`, HEAD `f5fd099a` ("docs(db): enforce
  applied migration immutability"), clean working tree.
- **Real caveat, not resolved by this pack**: `D:\MU\` holds dozens of
  other `mu-bloodmoon-*` worktrees (feature/phase-specific). `docs/README.md`
  itself documents that several domain docs it describes live only on
  other branches, not on `main`. See [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md)
  OQ-CTX-001. Confirm branch/worktree before any non-trivial action —
  `AGENTS.md` invariant 2.

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

## Knowledge Hub orchestration state (separate repo, `D:\MU\hub`)

- Production: `ai-knowledge-hub` Worker, `ai-knowledge-hub-db` D1 — real,
  live, already used by real agent work (44 tasks / 418 events / 26
  decisions per the Phase 6 read-only audit — **not re-verified this
  session**, cite as prior-phase evidence only).
- Staging: `ai-knowledge-hub-staging` Worker,
  `ai-knowledge-hub-db-staging` D1 — real, permanent, created and fully
  validated in Phase 8 (backup/restore proof, concurrency proof, a real
  bug found and fixed). See [`domains/knowledge-hub.md`](domains/knowledge-hub.md)
  and [`domains/orchestration.md`](domains/orchestration.md).
- This Context Pack (Phase 9) is itself the subject of the first real
  Claude staging pilot — see [`domains/orchestration.md`](domains/orchestration.md)
  for the pilot's real task/actor/report IDs once run.

## What is NOT true yet (explicit, so it isn't assumed)

- No n8n installation exists anywhere in this project.
- No real Codex staging pilot has run (design only — see
  [`DEFERRED.md`](DEFERRED.md)).
- No ChatGPT conversation transcript has been ingested into this pack or
  the Knowledge Hub.
- No production Knowledge Hub mutation and no production Blood Moon
  change occurred as part of building this Context Pack.
