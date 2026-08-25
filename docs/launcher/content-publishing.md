# Draft, publish, versioning, rollback

`LauncherSlotContent` / `LauncherContentPublish` / `LauncherSlotContentRevision`
(`apps/api/prisma/schema.prisma`, migration `20260825190000_launcher_cms_studio`).

## Why a new model instead of reusing SiteSetting

`launcher.service.ts`'s existing bootstrap already stores CMS content in
`SiteSetting` (one row per key, a single `status`). That's fine for a value
that's always live, but it cannot represent "an operator is mid-edit and
the live Launcher must keep showing the old value" -- there is only one
row, one status, one value. Part AE requires exactly that separation
(edit -> preview -> save draft -> publish, never an immediate live change),
so Launcher Studio's slot content uses its own model instead of writing
straight into `SiteSetting`. The existing `SiteSetting`-backed
campaign/socials/utilities fields on `GET /launcher/bootstrap` are
untouched by this phase.

## Shape

- `LauncherSlotContent` -- current state per slot. `draftValue` is always
  the latest saved edit; `publishedValue` is what the public read path
  serves. `status` is `DRAFT` when they differ, `PUBLISHED` when they
  match (recomputed on every write, not a separate flag an operator sets
  by hand).
- `LauncherContentPublish` -- one row per publish **or** rollback.
  `version` is a real auto-incrementing integer (Part AF's "contentVersion
  the Launcher can key cache/update off").
- `LauncherSlotContentRevision` -- one snapshot per slot per publish
  version, `@@unique([slotId, version])`. This is what makes rollback
  possible without ever deleting history.

## Publish

`LauncherStudioService.publish()`: finds every `LauncherSlotContent` row
with `status = DRAFT`, and in one transaction -- creates a new
`LauncherContentPublish` row (`kind: 'PUBLISH'`), copies each pending
slot's `draftValue` into `publishedValue`, stamps `publishedInVersion`, and
writes one `LauncherSlotContentRevision` per changed slot at that version.
Rejects with 400 if nothing is pending (nothing to publish).

## Rollback (Part AG)

`LauncherStudioService.rollback({ version })`: for every slot, finds its
latest `LauncherSlotContentRevision` at or before the target version, and
restores that value as the new `draftValue`/`publishedValue` -- **via a
new `LauncherContentPublish` row** (`kind: 'ROLLBACK'`), strictly after
every version that came before it. Rollback is always a forward-moving
publish, never a rewrite of a prior version's row -- `publish-history`
still shows every version that ever happened, including the ones a
rollback superseded.

## Public read path

`GET /launcher/content?page=HOME` (`launcher-content.controller.ts`)
resolves every slot in the registry (optionally filtered to one page) to
its **published** value only -- a draft edit never appears here before a
publish. Response shape is `ResolvedSlot[]` (`id`, `page`, `value`,
`tokens`, `status`), never a raw `LauncherSlotContent` row. `contentVersion`
in the response is the latest `LauncherContentPublish.version` -- 0 if
nothing has ever been published.

This is additive to, not a replacement for, `GET /launcher/bootstrap` --
that route and its `SiteSetting`/`KnowledgeEntry`-backed fields are
unchanged. A future pass can decide whether/how to fold the two together;
this phase keeps them separate to avoid any risk to the already-working
bootstrap contract.

## Audit log (Part AH)

Every slot update, publish, and rollback goes through the existing
`AuditService.record()` (`admin.launcher-studio.slot.updated` /
`.content.published` / `.content.rolledBack`) -- actor, action, target,
and metadata (slotId/page/version/slotIds), reusing the audit table this
codebase already has rather than a second logging system.
