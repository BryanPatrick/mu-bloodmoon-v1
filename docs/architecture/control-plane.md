# Blood Moon Control Plane — architectural pattern

**Status**: PATTERN DEFINED, NOT YET IMPLEMENTED AS A FRAMEWORK. This
document defines the standard every admin-facing domain should converge
toward. It does not itself change any running code, schema, or
permission. See `docs/architecture/control-plane-domain-audit.md` for
the per-domain classification against this standard.

## 1. The direction

**Blood Moon's Portal (Player/ADM/Super ADM) is the central control
plane of the product and of its operation, wherever this can be done
safely.** Every domain that today configures behavior through a
hardcoded constant, a `.env` value only an operator can change, a
one-off admin screen with its own bespoke rules, or a value that only
exists inside GameServer's own files, is a candidate to converge on one
consistent pattern — not because uniformity is a goal in itself, but
because every one of those escape hatches has already caused a real
incident in this project: an env var silently out of sync with a
rotated credential (`docs/deployment-architecture.md`'s bmapi outage), a
deploy artifact missing files nothing detected until a page 500'd
(`docs/operations/nuxt-deploy-integrity.md`), a `window.prompt()` that
can't be audited or validated (`docs/design/admin-native-dialogs-debt.md`).
A real control plane is how a growing set of admin domains stops
reproducing these failure modes independently.

This is a **pattern to converge on incrementally**, not a rewrite. Most
of the vocabulary below already exists in pieces of this codebase today
(`docs/panel-access-model.md`'s RBAC, `AuditService.record()`,
`docs/payments/payment-risk-and-chargeback-operations.md`'s
view/manage permission pairs, the alerting module's fail-closed,
default-OFF flags from Phase AA). What has not existed until now is a
single named standard that says which of these every domain is expected
to have, and a place (a generic registry) for the simple cases so they
stop each inventing their own tiny bespoke settings table.

## 2. Core vocabulary

Every control-plane-governed piece of configuration is described using
the same six concepts, regardless of which domain it belongs to:

| Concept | Meaning |
|---|---|
| **Current configuration** | What is stored right now as the operator's intent — the row in the Portal's database (or registry entry). |
| **Desired state** | The configuration the Portal wants the target system to have — identical to "current configuration" for portal-only settings; distinct from it for anything that must be pushed to an external system (GameServer, a payment provider, a Cloudflare Worker). |
| **Effective state** | What the target system actually reports it is running, right now — read back from the system itself, not assumed from what was last sent to it. |
| **Configuration source** | Where a given effective value actually came from: `PORTAL` (the control plane wrote it), `ENV` (a `.env`/process env var), `HARDCODED` (a literal in source), `GAMESERVER_FILE` (a `.dat`/`.txt`/ini file GameServer reads directly), `LEGACY_PANEL` (the old vendor CMS), or `UNKNOWN`. |
| **Sync status** | `IN_SYNC` (desired == effective), `PENDING` (desired changed, not yet applied/confirmed), `DRIFTED` (effective no longer matches desired and nothing in the Portal caused that), `UNKNOWN` (no read-back mechanism exists yet). |
| **Drift** | The specific, named difference when sync status is `DRIFTED` — logged as its own fact (field, expected, observed, first-detected-at), never silently overwritten by the next desired-state push. |

A domain that cannot yet report **effective state** and **sync status**
honestly is not yet a real control plane for that value — it is a form
that writes into a black box. Domains are allowed to start there
(`SHOULD_BECOME_CONTROL_PLANE` in the audit below), but should not be
described as "controlled" until they can.

## 3. Permissions: VIEW / MANAGE / APPLY

Extends the existing `admin.<domain>.view` / `admin.<domain>.manage`
pair (already used by Payment Risk/Chargeback, per
`docs/payments/payment-risk-and-chargeback-operations.md`'s RBAC table)
with a third tier:

| Permission | Grants |
|---|---|
| `admin.<domain>.view` | Read current configuration, desired state, effective state, sync status, drift, audit history. No mutation. |
| `admin.<domain>.manage` | Change desired state (a Portal-side database write). Does **not** by itself push anything to an external system. |
| `admin.<domain>.apply` | Push a desired-state change to an external system of record (GameServer, a payment provider, a Cloudflare Worker) — i.e., the step that can actually change live behavior outside the Portal's own database. |

For a domain that lives entirely inside the Portal's own database (most
of the Portal-only domains — VIP pricing rules, store catalog, roadmap
entries), `manage` and `apply` collapse into the same action, and only
`view`/`manage` need to be distinct permissions — introducing a
meaningless third permission where nothing external exists to apply to
is not the goal. `apply` earns its own permission specifically where a
mutation reaches GameServer, a payment provider, or any other system
this Portal does not itself own — the split that already, informally,
exists between `WalletTransferService.transfer()` (Portal-owned ledger,
today's `manage`-equivalent) and anything that would someday write to
GameServer's own database (`apply`-equivalent, and currently nothing in
this codebase does this — see Section 6).

Neither `manage` nor `apply` is ever part of a default role's
permission set (matching the existing convention — see
`docs/panel-access-model.md`); both require explicit `SUPER_ADMIN`
delegation via the existing `AccountPermission` override mechanism.

## 4. Consequential actions

Any action reachable through `manage` or `apply` that changes behavior
observable outside the admin screen itself (as opposed to, say, editing
a draft that hasn't been published yet) is a **consequential action**
and must have:

- **Explicit confirmation** — a real confirm step in the UI, never a
  bare button that fires immediately. (This is the direct fix for
  `docs/design/admin-native-dialogs-debt.md` — a proper confirmation
  dialog with a typed justification field replaces `window.prompt()`,
  it does not remove the confirmation step.)
- **Preview, when the action's shape allows it** — showing what will
  change before it changes (e.g., "3 accounts will lose VIP tier
  Gold," not just a bare "Apply" button). Not every action can be
  previewed honestly (a live provider poll's result isn't knowable
  beforehand) — when it can't, say so, don't fake a preview.
- **Rollback or history, when the action's shape allows it** — either a
  real reverse action (lift a restriction, disable a flag) or, at
  minimum, a visible history of prior states so an operator can see
  what the value was before and manually restore it. Some actions have
  no safe rollback (a real payment capture, a real chargeback) — those
  must say so explicitly rather than implying an undo that doesn't
  exist, matching the existing honesty standard in
  `docs/payments/payment-risk-and-chargeback-operations.md`'s refund/
  chargeback distinction table.

## 5. Audit trail

Every consequential action writes both of the entries this codebase
already produces for Payment Risk/Chargeback (Part 16 of that
document) — an `AuditService.record()` entry AND an
`ObservabilityService.recordOperationalEvent()` entry — carrying, at
minimum:

- **actor** — the authenticated admin account, never a shared/system
  identity for a human-triggered action;
- **time** — when the action was taken, not when a downstream effect
  eventually landed;
- **reason** — a real, operator-entered justification for any
  `manage`/`apply` action with a rollback story less complete than "flip
  it back" (mirrors the Risk/Chargeback justification field, minus the
  native `prompt()` — see Section 4);
- **before/after** — the actual prior and new values of whatever
  changed, not just "changed" as a boolean. For a secret-bearing field,
  before/after are the redacted metadata described in Section 8, never
  the plaintext value.

This is the generalization of a pattern that already exists in one
place (Payment Risk/Chargeback); the control plane standard is that
every domain gets this, not just the one that happened to build it
first.

## 6. GameServer / GameBridge: the narrow, explicit model

GameServer is a licensed third-party engine this project does not own
the source of in full, has no safe generic-write channel into, and has
already caused real incidents when treated casually (see
`docs/game-data/security-boundaries.md` and the read-only architecture
already chosen for the GameBridge Agent in
`docs/game-data/architecture.md`). **The control plane must never expose
a generic "edit GameServer" capability.** The model is always:

```
desired state (Portal DB)
  -> validation (Portal-side: type, range, business-rule checks)
  -> safe apply (one narrow, explicitly-named command/write path — never a raw file edit or arbitrary SQL)
  -> effective state (read back from GameServer/GameBridge, not assumed)
  -> audit (actor/time/reason/before/after, as above)
```

Every "apply" step for a GameServer-bound value is its own named,
reviewed, narrowly-scoped action — e.g. "grant VIP tier" (already
extended into the GameBridge Agent's command set, per
`docs/gamebridge/gamebridge-agent-extension-plan.md`) is a real example
of the right shape: a specific verb, a specific payload contract, signed
and replay-protected (HMAC + nonce, per
`docs/security/game-write-boundary.md`), never a general "run this on
GameServer" backdoor. New GameServer-bound control-plane actions must be
added the same way: one explicit command per capability, not a generic
config pusher.

Where GameServer is the sole source of truth and no safe write path
exists yet (most of it, today — see the audit), the correct classification
is `GAMESERVER_ONLY`, not a broken or fake `apply` button.

## 7. Feature flags and kill switch

Every control-plane domain that can be turned off should have both:

- **A feature flag** — the domain's normal on/off/configuration surface
  (mirrors `alerting.env.ts`'s pattern from Phase AA: every knob
  defaults to the safe/off value, is read from a single typed
  accessor function, and is documented in one place).
- **A kill switch** — a single, fast, unambiguous "stop this now"
  control, separate from the flag that enables normal operation, so an
  incident responder does not have to reason about which of several
  related flags to flip. `MERCADO_PAGO_PROVIDER_POLL_ENABLED` and
  `REAL_MONEY_PAYMENTS_ENABLED` (both already real, already default-OFF
  gates in this codebase) are the model — a kill switch is not a new
  invention, it's naming the existing "flip this one thing off" pattern
  as a first-class, expected part of every domain, not something only
  Payments happened to get.

Feature flags for simple booleans/thresholds belong in the generic
registry (Section 9); a flag that gates a whole subsystem's operation
(like the two above) may stay as a typed env accessor if it predates the
registry, but new domains should register through the same table so an
operator has one place to see every flag in the product, not one env
file per module.

## 8. Secrets and credentials — never plaintext, anywhere in the UI

No control-plane screen, API response, audit log, or database column
governed by this pattern ever surfaces a secret's actual value. A
secret-bearing integration is represented only as:

| Field | Example |
|---|---|
| `configured` | `true`/`false` — is a value present at all |
| `lastRotatedAt` | timestamp of the last rotation, if tracked |
| `testConnection` | an action that calls the real credential against the real provider and returns only success/failure + a safe error class, never the credential or the raw provider response |
| `providerStatus` | the provider's own reported health (e.g., Mercado Pago reachable, GameBridge heartbeat fresh) — see Section 10 |

This generalizes the redaction discipline already required project-wide
(`docs/security/secret-incident-history.md`'s entire reason for
existing, `alert-payload.ts`'s reuse of `redactSensitiveText` at the
alerting boundary) into an explicit, permanent UI contract: a control
plane screen is allowed to prove a secret is *configured and working*
without ever being able to leak it, including to a fully-authorized
Super Admin — because a UI capability, once built, is also a future
incident surface, and this project has already had three.

## 9. Two data shapes — registry vs. dedicated models

**Do not build one generic key/value table for everything.** A single
untyped settings table is how "is this a string, a number, or a JSON
blob," "which domain owns this," and "what does changing this actually
do" all become unanswerable six months later. Use two different shapes,
deliberately:

### 9.1 Generic registry

For genuinely simple, atomic values: boolean flags, named numeric
limits/thresholds, short text/labels — nothing with its own lifecycle,
nothing that needs desired-vs-effective tracking against an external
system, nothing with sub-fields.

```prisma
model ControlPlaneSetting {
  id           String   @id @default(cuid())
  domain       String   // e.g. "alerting", "store-portal", "maintenance"
  key          String   // e.g. "ALERT_MIN_SEVERITY"
  valueType    ControlPlaneValueType // BOOLEAN | NUMBER | STRING | JSON
  value        String   // serialized per valueType; never a secret (see Section 8)
  description  String
  updatedAt    DateTime @updatedAt
  updatedBy    String   // account id
  @@unique([domain, key])
}
```

Every read goes through a typed accessor (mirroring `alerting.env.ts`'s
style) — never raw string lookups scattered through call sites.

### 9.2 Dedicated models for complex domains

VIP, Store (Portal/Game/Launcher), Payments, Progression, Events,
Launcher, Economy, and similar domains get their **own** Prisma models
shaped around what that domain actually needs to track — because each
of these has real sub-structure a key/value row cannot honestly
represent: VIP has tiers and benefit matrices; Store has products,
prices, and availability windows per channel; Payments has the entire
Risk/Chargeback case model already built. These dedicated models are
where desired-state / effective-state / sync-status / drift columns
belong when the domain talks to an external system — the registry
above is not the place for that.

The rule of thumb: **if a setting has sub-fields, a lifecycle, an
external system it must stay in sync with, or its own audit-worthy
state machine, it gets a dedicated model. If it's one flag, one number,
or one short string, it goes in the registry.**

## 10. External integration state: health/status, safe apply, fail-closed

Every control-plane domain that talks to something outside the Portal's
own database (a payment provider, GameBridge, a Cloudflare Worker, an
SMTP relay) reports, at minimum:

- **Health/status** — a simple, honestly-derived state (e.g.
  `HEALTHY`/`STALE`/`OFFLINE`, matching the vocabulary Phase AA's
  GameBridge heartbeat already established in
  `docs/operations/phase-aa-ops-hardening-report.md` — and, per that
  same document's own explicit rule, **never conflated with a different
  concept that sounds similar**, such as the Launcher's own
  `GAME_SERVER_STATUS`).
- **Safe apply** — the actual write/push to the external system is
  always the narrowest possible call for the specific change being
  made, never a bulk "resync everything" unless that specific action is
  itself the documented, reviewed feature.
- **Fail-closed** — when the integration is unconfigured, unreachable,
  or its credential is missing, the control plane's own behavior
  defaults to the safe state (deny, no-op, `UNKNOWN` status) rather than
  guessing or silently proceeding — exactly the pattern
  `InternalOpsEventsGuard` and `game-data.env.ts`'s "gate closed"
  behavior already establish.

## 11. Domains expected to converge on this pattern

This is the list the project owner named as the intended scope. Each
domain's actual current state (not aspirational) is classified in
`docs/architecture/control-plane-domain-audit.md`, using:

`ALREADY_CONTROLLED_BY_PORTAL` · `HARDCODED` · `ENV_ONLY` ·
`GAMESERVER_ONLY` · `SHOULD_BECOME_CONTROL_PLANE` ·
`SHOULD_REMAIN_SECRET_INFRASTRUCTURE`

- Loja do Portal
- Loja do Game
- Loja do Launcher
- Catálogo mestre
- Roadmap
- VIP
- Economia
- Moedas
- Taxas
- Marketplace
- Transferências
- Progressão
- Reset
- GameBridge
- Eventos
- Drops (futuramente)
- Launcher CMS
- Pagamentos
- Providers
- Bug Hunters / moderação
- Guild
- Community
- Operações
- Alertas
- Backups
- Manutenção
- Feature flags

## 12. What this document does not do

It does not create `ControlPlaneSetting`, does not add any permission,
does not migrate any domain, and does not change any running behavior.
It is the reference the next phases build against — per the project
owner's own instruction, only the pattern and the audit are delivered
now; implementation is deliberately deferred, domain by domain, to
future phases.
