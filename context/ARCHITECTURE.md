---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-17
---

# Architecture map — CURRENT / PLANNED / EXPERIMENTAL

Each row points at the real doc for depth. This table is the only thing
this pack adds — a single glance across systems that otherwise live in
separate folders.

| System | State | Real doc |
|---|---|---|
| Portal (`apps/web`, Nuxt) | CURRENT | `docs/architecture/`, `docs/project-structure.md` |
| API (`apps/api`, NestJS) | CURRENT | `docs/architecture/`, `docs/project-structure.md` |
| GameServer (SQL Server, `MuOnline`) | CURRENT (read/write-boundary controlled) | `docs/gameserver/database/`, `docs/security/game-write-boundary.md` |
| GameBridge (existing VIP/account write path) | CURRENT | `docs/gamebridge/` |
| Game Data Platform (Agent + Cloudflare Worker, read-only telemetry) | PLANNED / mid-implementation per local plan on file | `docs/game-data/` (once populated) |
| Launcher (.NET/WPF) | CURRENT | `docs/launcher/` |
| Payments (Mercado Pago) | CURRENT, refund/reconciliation adapters SANDBOX_VALIDATION_REQUIRED | `docs/payments/` |
| Knowledge Hub — production (`ai-knowledge-hub` / `ai-knowledge-hub-db`) | CURRENT, live, real agent usage | `D:\MU\hub\docs\operations\orchestration-remote-adoption.md` |
| Knowledge Hub — staging (`ai-knowledge-hub-staging` / `ai-knowledge-hub-db-staging`) | CURRENT, permanent, validated Phase 8 | `D:\MU\hub\docs\operations\orchestration-staging.md` |
| Orchestration (task/resource/approval/review lifecycle) | CURRENT on Knowledge Hub, staging-proven, production-live for reads/some writes | `D:\MU\hub\docs\protocols\orchestration-primitives.md` |
| n8n | EXPERIMENTAL — not installed anywhere, design-only | [`domains/n8n.md`](domains/n8n.md), [`DEFERRED.md`](DEFERRED.md) |
| Blood Moon AI (future player-facing or internal AI features) | EXPERIMENTAL — no implementation exists | [`domains/bloodmoon-ai.md`](domains/bloodmoon-ai.md) |
| Notifications | CURRENT for some flows (payment/VIP), no unified system confirmed | [`domains/notifications.md`](domains/notifications.md) |
| Referral | UNKNOWN — no confirmed implementation found this session | [`domains/referral.md`](domains/referral.md) |
| Marketing | UNKNOWN — no confirmed implementation found this session | [`domains/marketing.md`](domains/marketing.md) |

## A rule this pack will not violate

Per the explicit instruction that created this pack: **do not encode a
temporary tool limitation as eternal architectural law.** Today, Claude
is the main active engineering agent and Codex/n8n are not yet
integrated — that is a *current staffing fact*, not an architectural
constraint. See [`AGENT_OPERATING_MODEL.md`](AGENT_OPERATING_MODEL.md).
