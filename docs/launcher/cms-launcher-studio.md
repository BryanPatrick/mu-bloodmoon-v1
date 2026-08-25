# Launcher CMS Studio

`apps/api/src/modules/launcher-studio/` (backend) +
`apps/web/components/admin/launcher-studio/` and
`apps/web/pages/painel/admin/launcher-studio.vue` (Portal admin UI).

## What this is

A visual content editor in the Portal Admin that lets an operator manage
the compiled Launcher's remote content -- navigate a structurally faithful
web preview of the Launcher's pages, click an editable slot, change its
content, pick/upload an asset, adjust its allowed visual tokens, preview
the change, and publish a new content version. See
`docs/launcher/launcher-slot-registry.md` for the exact slot catalog,
`docs/launcher/content-publishing.md` for draft/publish/versioning/
rollback, `docs/launcher/resolution-profiles.md` for the viewport
switcher, and `docs/assets/central-asset-library.md` for the asset
library/storage abstraction.

## STRUCTURE = fixed, CONTENT = remote

The same principle `docs/launcher/remote-content.md` already established
for the existing bootstrap fields applies here, formalized further: the
CMS can only ever write a value for a slot the static
`slot-registry.ts` catalog declares, of the declared type, inside the
declared constraints (`slot-validator.ts`). There is no code path that
accepts x/y, width/height, CSS, XAML, HTML, JavaScript, or any other
executable/positional content -- not "discouraged," structurally absent.

## What was reused vs. built new (Part A audit)

| Existing system | Reused for |
|---|---|
| `admin-content` module's guard/permission/upload conventions | Copied exactly for `launcher-studio.controller.ts`'s route shape and the base64 `dataUrl` asset-upload pattern |
| `ShopProduct` / `StoreCategory` / `ShopProductVariant` (already WCOIN/GOBLIN_POINT/HUNT_POINT, already has a full draft->review->approve->publish->archive workflow) | Store editorial content (Part U) -- **not** rebuilt. Launcher Studio's Store preview reads these directly, read-only; editing still happens through the existing `commerce`/Store admin UI |
| `KnowledgeEntry` (kind `NEWS`/`EVENT`, already feeds the existing bootstrap's news list) | News/Events (Part S/T) -- extended with additive, nullable fields rather than a second model |
| `AuditService` | Every Launcher Studio write (Part AH) -- no second audit log |
| The existing local-storage upload pattern (`storage/uploads`, a narrow streaming controller) | Mirrored for the new asset library's LOCAL provider |
| RBAC (`permissions.ts`, `RolesGuard`/`PermissionsGuard`, the delegated-permission pattern every other `admin.*` key already uses) | Four new delegable permissions, same mechanism, no new guard code |

What's genuinely new: the slot registry + validator (nothing like it
existed), `LauncherSlotContent`/`LauncherContentPublish`/
`LauncherSlotContentRevision` (draft/publish/versioning/rollback --
`SiteSetting`'s one-row-per-key shape can't represent an unpublished
draft), `LauncherAsset` (a general asset library; `ReferenceAsset` is
purpose-built for the wiki pipeline, a different domain), and
`StorePurchaseTerms` (nothing like it existed).

## Purchase Terms (Part V/W) -- what's real vs. not applicable

`StorePurchaseTerms` and the backend enforcement in
`commerce.service.ts`'s `createPurchaseIntent` are real and tested
(`launcher-studio.e2e-spec.ts`): once an operator creates a terms version
via `POST /admin/launcher-studio/terms`, every new purchase must supply
the matching `termsVersion` or is rejected with 400, and the accepted
version + timestamp are recorded on the `PurchaseIntent` row
(`termsVersion`, `termsAcceptedAt`). Before any terms version exists,
behavior is unchanged from before this phase (backward compatible).

The frontend checkbox itself ("Li e concordo com os Termos de Compra",
disabling FINALIZAR COMPRA until checked) was **not** built this phase --
grep confirms no call site anywhere in `apps/web` actually invokes
`useCommerceApi().createPurchaseIntent` yet; there is no player-facing
Store checkout page/component to attach a checkbox to (`pages/painel/
loja.vue` redirects to `/marketplace`, which is a different, unrelated
flow). Building that checkout UI from scratch was not asked for in this
phase's scope and is a materially different piece of work (a full
product-browse-and-buy flow) than "build the CMS that administers Store
content." The backend gate is real and will apply the moment such a UI
(web or the WPF Launcher) starts calling this endpoint -- there is nothing
further to wire up on the backend side.

## RBAC (Part AI)

`admin.launcher.content.read` / `.edit` / `.publish`, `admin.launcher.
assets.manage` -- delegable permissions, same mechanism as every other
`admin.*` key in this codebase (`ADMIN`'s baseline role array does not
auto-include them; a `SUPER_ADMIN` grants them per-account via
`AccountPermission`, same as `admin.game-provisioning.*` etc.). `GM` does
not inherit any of them. Verified in `launcher-studio.e2e-spec.ts`'s RBAC
suite (unauthenticated/PLAYER/GM all denied, ADMIN needs explicit
delegation, SUPER_ADMIN wildcard passes).

## Public read path for the real Launcher client (Part AJ/AL)

`GET /launcher/content?page=HOME` -- resolved, published-only DTOs
(`ResolvedSlot[]`), never a raw Prisma row, never a draft value. Additive
to the existing `GET /launcher/bootstrap`, which is unchanged. See
`docs/launcher/content-publishing.md`.

## Known simplifications (reported honestly, not silently decided)

- The slot registry was built from the CMS spec's own example slot names
  plus the Launcher's already-shipped bootstrap contract -- the approved
  annotated reference images (PINK X / RED X markings) were not available
  as file input this session, so no reference-image-driven removal (Part
  AO) was performed. Revisit once those images are available.
- Asset upload does not probe image width/height (left `null`) -- no
  image-decoding dependency was added this phase.
- The preview is structurally faithful, not pixel-perfect against the
  compiled WPF Launcher (explicitly not required this phase, Part AD).
- `REFERENCE` slots pointing at a `KnowledgeEntry` (activeEvent/nextEvent)
  are edited as a plain entry id in this phase's inspector, not a full
  searchable picker -- a reasonable follow-up, not built here to keep this
  phase's frontend scope bounded to what the spec actually asked for.
