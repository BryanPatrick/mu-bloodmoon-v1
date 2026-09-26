---
status: ACTIVE
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-26
---

# Open risks and unknowns — consolidated

Reconciled in `BLOODMOON-AI-07` from `RISKS.md` on
`infra/cloudflare-web-shadow-rc-02` @ `f2584a4` (lineage **T**) and
`infra/cloudflare-backup-exit` @ `3cab675` (lineage **E**). Each row is a
short summary; the full row text stays on the branch.

## Risk-ID collision (read before citing a CF-R number)

After the fork at `456963d`, both lineages minted **CF-R20 to CF-R24
independently, for different risks**. The IDs are kept as they are on the
branches (renumbering would break every branch citation); on `main` they
are always written with their lineage suffix: `CF-R20(E)` is the
nameserver mismatch, `CF-R20(T)` is the shadow localhost drift, and so on.
CF-R25..CF-R27 exist only in E. The next new risk on either branch should
start at **CF-R28** to end the collision.

## Open — domain and DNS

| ID | Risk | Status |
|---|---|---|
| CF-R2 | Operational control of `registro.br` login, DNS zone editing and nameserver change for `mubloodmoon.com.br` is unconfirmed (registrant identity is confirmed as Bryan via RDAP) | OPEN — blocks DNS cutover; needs Bryan |
| CF-R20(E) | Zone `NS` answer (`srv41.hinetworks`) differs from registry delegation (`srv02.projectgamers`); same IP | OPEN — needs Bryan's knowledge |
| CF-R21(E) | Public RDAP lists a second entity (admin + technical contact since 2017) beside Bryan | OPEN — needs Bryan's knowledge; no contact made |
| CF-R21(T) | `registro.br`/nameserver and current-zone **rollback** control not confirmed | OPEN — must be verified and recorded before any cutover authorization |
| CF-R22(E) | `update.mubloodmoon.com.br` was missing from earlier architecture/DNS docs | Addressed in docs (now in every state); kept open on E as a reminder |
| CF-R22(T) | Root/www routing mechanism (full zone transfer, Worker custom domain, record-level) not chosen | OPEN — choose in the next pre-cutover phase |
| CF-R27 | Shipped launcher hard-codes `api.` and `update.` hostnames — the domain is permanent infrastructure | OPEN, informational |

## Open — Web transition

| ID | Risk | Status |
|---|---|---|
| CF-R20(T) | Active shadow version `44e50317` has the `http://localhost:3333` API fallback in CSP; not a release candidate | OPEN — rebuild with explicit production API base, re-run auth smoke |
| CF-R23(T) | Public pages using `useAsyncData` may send SSR GETs from the Worker, changing source IP / rate-limit observations | OPEN, observation item; never cache authenticated responses |
| CF-R24(T) | `/api/health` and `/api/ready` are in the candidate source but return 404 in production | OPEN, non-blocking for Web-only; use the runbook's CORS/auth smoke |
| CF-R9 | Production API CORS rejects the `workers.dev` shadow origin (intentional) | OPEN by decision — `BLOCKED_PENDING_BRYAN_AUTHORIZATION`; not needed for a same-hostname cutover |
| CF-R8 | Wrangler version skew (`3.114.17` pinned vs `4.x`) | OPEN, low |

## Open — API runtime and database

| ID | Risk | Status |
|---|---|---|
| CF-R4 | Containers scope / production proof | OPEN but de-risked — proof ran (non-production); candidate not merged, not live-redeployed; decision is Bryan's |
| CF-R3 | Prisma on native Workers | OPEN, deprioritized (only the future-optimization path) |
| CF-R6 | In-memory abuse-protection state would need redesign under native Workers | OPEN, only on the future path |
| CF-R11 | `GET_LOCK` flows and `$transaction` files not re-proven against a Containers-connected database path | OPEN |
| CF-R13 | Restore proof covers a local MySQL 8.0 target, not a chosen external vendor | OPEN — repeat method once a vendor is chosen |
| CF-R14 | PlanetScale does not support `GET_LOCK` through VTGate | OPEN — disqualifying unless code changes |
| (new, `BLOODMOON-AI-07`) | Engine wording conflict: Cloudflare docs say production is "MySQL"; `context/INFRASTRUCTURE.md` says CloudLinux MariaDB 10.6.19. The compatibility proofs used MySQL 8 with a local dev dump, never production data | OPEN — verify the production engine/version read-only before any DB-exit design relies on it. Registered as `KNOWLEDGE_GAPS.md` GAP-AI07-03 |

## Open — storage, backup, e-mail

| ID | Risk | Status |
|---|---|---|
| CF-R1 | Production media storage mode (`local` vs `r2`) unknown | OPEN |
| CF-R15 | `R2StorageProvider` has no presigned URLs; private-media design blocked | OPEN, low urgency |
| CF-R7 | `public/dev-references` naming/content hygiene before any R2 publish | OPEN, low |
| CF-R26 | Production backups exist only on the provider; off-host mechanism proven but not wired | OPEN — `PRODUCTION_WIRED = NO`, operational decision for Bryan |
| CF-R23(E) | Human mailboxes on the domain: `MAILBOX_INVENTORY = UNKNOWN` | OPEN — needs Bryan |
| CF-R24(E) | Password-recovery e-mail delivery to an external mailbox never proven in production (pre-existing) | OPEN (`docs/handoff/auth-recovery-provider-blocker.md`) |
| CF-R25 | `apps/api/.env.example` lists no `SMTP_*` variables | OPEN, low |
| (new, `BLOODMOON-AI-07`) | Newer R2 work named by Bryan (parallel readiness, production inventory, pre-copy design/implementation/rehearsal) is not on `origin` | OPEN — single-machine loss risk and invisible to `main`; push or record. `KNOWLEDGE_GAPS.md` GAP-AI07-02 |

## Resolved (kept for traceability)

- CF-R5 — backup-restore P1: **CLOSED** by CF-DB-01 (non-production proof).
- CF-R10 — Node API usage in `apps/web`: low impact since Containers
  (full Node) is the chosen API target.
- Closed items listed on the branches' own "Resolved" sections stay there.
