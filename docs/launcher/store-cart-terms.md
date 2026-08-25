# Store cart and Purchase Terms flow (Launcher Phase L3)

`Views/StorePage.xaml`/`.xaml.cs`. WC/GP/HP only -- no BRL/USD/Pix/payment
provider anywhere in this flow (Part AF).

## Product data (Part AG) -- no duplicate domain

Reuses the existing, already-real `ShopProduct`/`StoreCategory`/
`ShopProductVariant` commerce domain as-is: `GET /shop/products` (public,
unauthenticated, already existed before this phase) via the new
`LauncherApiClient.GetStoreProductsAsync`, deserialized into
`Models/StoreModels.cs`'s `ShopProductDto` (mirrors `commerce.service.ts`'s
`mapProduct()` shape exactly -- name/short/category/description/price/
currency/status/stock/images/featured/deliveryTarget/variants, never the
raw Prisma row's internal fields).

## Cart (Part AJ)

In-memory only (`StorePage`'s private `_cart` list, never persisted) --
add/remove/quantity, a running total, and one deliberate safety rule:
**a cart already holding one currency refuses to add an item priced in a
different currency**, with an explicit toast explaining why, rather than
silently summing WC + GP into one meaningless total. This is the literal
reading of Part AJ's "do not implement cross-currency invalid totals
silently" -- the safest version of that rule is never producing a
mixed-currency cart in the first place.

Checkout iterates the cart, calling the existing, already-real `POST
/shop/purchases` once per line (that endpoint's contract is one product +
variant + quantity per call; there is no batched multi-item endpoint to
call instead) via the new `LauncherApiClient.CreatePurchaseAsync`, and
reports a summary toast (`N compra(s) concluída(s), M falharam` when
anything fails, so a partial failure is never silently swallowed).

## Purchase Terms (Part AK/AL)

`GET /launcher/store/terms/active` (new, public, added this phase --
`apps/api/.../launcher-studio/launcher-content.controller.ts`) returns the
currently active `StorePurchaseTerms` row, or nothing (empty body) if an
operator hasn't configured one yet.

- The checkbox ("Li e concordo com os **Termos de Compra**", the bold part
  a clickable `Hyperlink` that expands/collapses the terms content inline)
  starts unchecked.
- **FINALIZAR COMPRA stays disabled** until every condition holds:
  logged in, cart non-empty, and -- only when an active terms version
  actually exists to accept -- the checkbox checked
  (`StorePage.UpdateCheckoutEnabled`).
- On checkout, `CreatePurchasePayload.TermsVersion` is always set to the
  loaded `StorePurchaseTermsDto.Version` when one exists. The backend
  (`commerce.service.ts`'s `createPurchaseIntent`, extended in an earlier
  phase of this same engagement) independently re-validates this --
  rejects the request if it doesn't match the currently active version --
  and records `termsVersion`/`termsAcceptedAt` on the created
  `PurchaseIntent` row. The frontend checkbox is UX only; the backend is
  the actual source of truth, and this flow never attempts to bypass it.
- Before any terms version exists, checkout behaves exactly as it did
  before this phase (backward compatible, matching the backend's own
  no-op-until-configured design).

## What's explicitly not built here

A cross-currency multi-total cart, a saved/persisted cart across
sessions, and any real-money payment path (Part AF/AM are explicit: WC/GP/
HP only, and the real, already-existing `/shop/purchases` endpoint was
used directly rather than inventing a mock -- there was no need for a
local-only stand-in).
