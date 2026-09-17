---
status: ARCHITECTURAL_DIRECTION — not implemented as a unified system
category: knowledge
audience: internal (engineering + product)
lastVerified: 2026-08-31
confidence: HYPOTHESIS (this document's own design proposal); CONFIRMED for the existing precedent patterns it's built from
---

# Settings / Feature Management architecture direction

Formalizes the architecture direction discussed with Bryan for reusable
configuration controls across SUPER ADMIN, ADMIN, GM, and PLAYER roles.
**Not implemented as a unified system.** What exists today is several
independent, ad-hoc settings mechanisms that already demonstrate real
pieces of this pattern — this document names the target shape and points
at the existing precedent, it does not build anything new.

## Existing precedent (real, already in the codebase)

Before inventing anything, it's worth naming what already works, since a
future unified settings system should generalize these, not replace them
with something incompatible:

- **`MarketplaceEconomyConfig`** (see ADR-0009) — a real admin-editable
  config row (`wcoinTaxPercent`, `goblinPointTaxPercent`,
  `huntPointTaxPercent`), PATCH-restricted to `SUPER_ADMIN`. A working
  example of a role-restricted numeric setting.
- **`VipBenefitConfig`** — per the project's own established convention,
  "all bonus values default to 0/disabled per explicit instruction," with
  a master `enabled` switch separate from individual bonus numbers. A
  working example of a boolean/toggle + numeric-limit combination with a
  deliberate safe-by-default posture.
- **`PlayerPreferenceDefinition`/`PlayerPreference`** (schema only,
  currently unwired — see `module-map.md`'s PRIVACY entry) — already
  modeled with an ESSENTIAL/OPTIONAL split at the schema level. This is
  the closest existing precedent to the player-preference direction
  below, and should be the starting point for building it out, not a
  parallel system.
- **`open-beta-window.config.ts`** (ADR-0004) — a real example of a
  schedule/date-range-shaped setting (`DEFAULT_OPEN_BETA_START_AT`/
  `_END_AT`), currently env-var-overridable but not admin-UI-editable.
- **`MERCADO_PAGO_REFUND_ENABLED`/`_PROVIDER_POLL_ENABLED`** (Phase P) and
  **`XSHOP_RUNTIME_SYNC_ENABLED`/`CASHSHOP_RUNTIME_SYNC_ENABLED`** (Phase
  T, ADR-0024) — a plain `process.env.FLAG !== 'true'` kill-switch
  pattern, not admin-UI-editable at all (env-var only, default off).
  This is the established, working shape for "this capability must stay
  off until someone deliberately flips it," reused rather than
  reinvented each phase it's needed — a future unified settings system's
  `BOOLEAN`/`TOGGLE` control type should be able to represent this
  pattern, not replace it with something incompatible.

## Target control types

A unified settings system should support these control shapes (naming
the type, not yet building a component library for it):

`BOOLEAN`/`TOGGLE`, `SELECT`, `MULTISELECT`, `NUMBER`, `TEXT`,
`SCHEDULE`, `DATE_RANGE`, `TIME_WINDOW`, `LIMIT` (a numeric ceiling/floor,
distinct from a plain number — e.g. the 20 WC transfer minimum in
ADR-0011 is a LIMIT, not just a NUMBER), `ROLE_RESTRICTED_SETTING`
(visible/editable only to specific roles), `PLAYER_PREFERENCE` (player-
owned, not admin-owned).

## Example future settings (illustrative, not committed)

GameServer event enable/disable, event schedule, global announcements,
Launcher feature visibility, CMS feature visibility, VIP products,
payment providers, surveys, notifications, community features, player
social preferences, player global-announcement preference.

None of these are built. They illustrate the range of things a real
settings system would eventually need to represent — a toggle (event
on/off), a schedule (event timing), a role-restricted numeric limit
(commercial config), and a player-owned preference (notification opt-out)
all need to fit the same underlying model without becoming five
different, incompatible ad-hoc mechanisms like today's precedent list
above.

## Player preferences: essential vs. optional

Formalizes an earlier requirement: **players should be able to disable
certain non-essential global announcements/notifications so they don't
experience them as spam.**

- **ESSENTIAL** — security notices, service-critical messages
  (maintenance windows, account-security alerts, legal/compliance
  notices). **Cannot be disabled by a player**, ever.
- **OPTIONAL** — marketing-adjacent announcements, non-critical event
  hype, social/community notifications. Player-toggleable.

The `PlayerPreferenceDefinition` schema already models this split at the
data level (see precedent above) — the missing piece is the actual
UI/service layer to let a player see and toggle their optional
preferences, and the actual classification of every current/future
notification type as ESSENTIAL or OPTIONAL (not yet done — every
notification type added from now on should be classified at creation
time, not left ambiguous).

## RBAC + settings

Settings must respect permissions — **role does not imply access to
every setting a "higher" role can see.** Sketch of the intended
delegation shape, consistent with this project's existing least-
privilege discipline (see ADR-0002's GameBridge design for the same
philosophy applied to database access):

| Role | Scope |
|---|---|
| **PLAYER** | Personal preferences only (their own `PlayerPreference` rows) |
| **GM** | Operational game/event settings explicitly delegated — not full admin configuration by default |
| **ADMIN** | Content/operational configuration |
| **SUPER_ADMIN** | Full configuration, including sensitive commercial/destructive controls (matches the existing real precedent: `MarketplaceEconomyConfig`'s PATCH is already `SUPER_ADMIN`-only, and `PRE_BETA_PURGE`'s permission is deliberately not delegable to ADMIN by default per ADR-0006/Phase 15) |

**Do not assume role implies every permission** — this project already
has a real, concrete example of getting this wrong and fixing it: the
Phase 15 addendum (ADR-0006) found that `admin.accounts.status.manage`
implicitly granted `PRE_BETA_PURGE` access as a side effect, and split
it into a separate `admin.accounts.purge.manage` permission specifically
to close that gap. Any future settings-permission design should use
explicit, individually-grantable permission keys per setting or setting
category, never a broad role check alone, following that same corrective
pattern rather than repeating the mistake it fixed.

## Settings ownership — avoid duplicated competing sources of truth

For each future setting, ownership must be determined explicitly among:
**PORTAL, GAMESERVER, LAUNCHER, CMS, CLOUDFLARE, PLAYER PROFILE.**

This project already has a hard-won, directly-applicable precedent for
what happens when ownership isn't clear: ADR-0001 (VIP source of truth)
exists specifically because GameServer `AccountLevel` and Portal
`VipEntitlement` briefly had competing claims to being authoritative,
which caused a real, reproduced data-loss bug. The general rule that
incident teaches: **every setting needs exactly one owner**, with every
other system treated as a synced projection, never a second source of
truth.

Where a setting affects multiple systems (e.g., a GameServer event
schedule that the Launcher also needs to display), the synchronization
strategy must be decided explicitly per setting — following the same
one-way-sync shape ADR-0001 established for VIP (owner → sync command →
projection), not invented fresh each time. A future settings system
should record, per setting, which of the six locations above owns it and
how (if at all) other systems are kept in sync.

## What this document does not do

It does not implement a settings service, a settings UI component
library, or a settings-storage schema. It does not commit to any of the
illustrative example settings actually being built. It exists so that
when settings work does start, it starts from a named target shape and a
real inventory of existing precedent, rather than inventing a sixth
incompatible ad-hoc mechanism.

## Related

`docs/knowledge/module-map.md`, `docs/decisions/0001-vip-source-of-truth.md`,
`docs/decisions/0006-account-deletion-two-mode-architecture.md`,
`docs/decisions/0009-wcoin-currency-tax-model.md`,
`docs/decisions/0011-direct-wcoin-transfer-minimum.md`.
