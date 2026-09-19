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

## Repository / branch (Phase 11, updated)

- Canonical primary worktree: `D:\MU\mu-bloodmoon-v1`.
- Current branch: `phase-9/context-pack-v1-foundation` (see the git log
  for the exact current HEAD — this file doesn't hardcode a commit SHA
  that goes stale the moment another commit lands). Clean tree.
  **Not merged into `main` — deliberately; merge gate is preservation
  PASS + validation PASS + secret scan PASS + a real independent
  content review PASS**, only the last one still outstanding (see
  [`DEFERRED.md`](DEFERRED.md) and
  [`docs/operations/context-pack-independent-review.md`](../docs/operations/context-pack-independent-review.md)).
- `main` itself: HEAD `f5fd099a`, 91 commits ahead of `origin/main`
  (confirmed via `git branch -v`), not pushed.
- **Origin relationship**: `origin` = `github.com/BryanPatrick/mu-bloodmoon-v1`.
  Nothing pushed this phase or last.
- **Active feature branches relevant to this pack** (full detail:
  [`REPOSITORY_KNOWLEDGE_MAP.md`](REPOSITORY_KNOWLEDGE_MAP.md)):
  `architecture/agent-orchestration-foundation` (real n8n/AI/notification
  design proposal, unmerged, not checked out anywhere), `payments/asaas-sandbox`
  + `payments/asaas-local-hardening-claude` +
  `payments/asaas-sandbox-phase5-codex` (Asaas local DB-parity continuation),
  `governance/engineering-pack`
  (canonical home of `AGENTS.md`/bootstrap protocol).
- **`mu-bloodmoon-v1-openbeta`**: 220 dirty entries (143 untracked, 77
  modified), unchanged since a 2026-09-08 finding. **A byte-exact,
  hash-verified copy of all 125 untracked documentation files now
  exists** at [`preservation/openbeta-untracked/`](preservation/openbeta-untracked/)
  (Phase 11) — the originals are untouched, and whether to actually
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
  (see `docs/game-data/`) — ~~not yet deployed against real infrastructure~~ **(annotation 2026-09-19, Phase 20A: the Worker, D1 and Agent run against real infrastructure — Phase 2D end-to-end PASS 2026-08-20, Phase 3D-A production command path 2026-08-24, heartbeat verified live through D1 on 2026-09-19; the VPS-side task/binary was not inspected; see `docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md` Part 5)**.
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
- This Context Pack is **not merged** into `main`.
