# Launcher Studio viewport/resolution profiles

`apps/web/components/admin/launcher-studio/LauncherStudioManager.vue`
(`viewportProfiles`). Real resolution numbers, not size labels, per Part Y.

| Key | Size | Wide |
|---|---|---|
| `1280x720` | 1280×720 | no (baseline) |
| `1600x900` | 1600×900 | no |
| `1920x1080` | 1920×1080 | no |
| `1600x720-wide` | 1600×720 | yes |
| `1920x800-wide` | 1920×800 | yes |
| `maximized` | fills the available preview panel width at a ~16:8.2 ratio | yes |

## Baseline scaling (Part AA)

1280×720 is the baseline the preview's Tailwind classes are authored
against. Larger profiles are rendered as a real, live DOM (not a
rasterized image) inside a container sized to the profile's aspect ratio
via CSS `aspect-ratio`, so content reflows using ordinary responsive
layout rather than a uniform image-style stretch. This is intentionally
**not** pixel-perfect against the compiled WPF Launcher (Part AD says that
isn't required this phase) -- it exists to let an operator judge slot
hierarchy, proportion, and content density at each profile, not to be a
production renderer.

## WIDE profiles (Part AB)

`isWide` (true for both `*-wide` keys and `maximized`) switches the
preview's side-nav column from `220px` to `180px` -- the extra horizontal
space goes to the content column (hero/main area), not a wider menu. This
is the concrete, minimal version of "WIDE mode should mainly benefit the
Home hero, not an oversized side menu."

## MAXIMIZED (Part Z)

Renders at `width: 100%` of the preview panel with `aspect-ratio: 16 / 8.2`
(slightly wider than 16:9, closer to the WIDE profiles' proportions) rather
than stretching to fill an arbitrary aspect. It does not attempt to model
"the user's actual screen bounds" -- that concept doesn't exist in a
browser-embedded preview panel; MAXIMIZED here means "as much of the panel
as the layout allows," which is the closest honest analog.

## What this does not do

The switcher does not attempt window-manager-accurate simulation, does not
snapshot the real compiled Launcher, and is not itself under automated
test (its correctness is visual/structural, not something an API-level
e2e test can usefully assert) -- noted as a known gap for a future visual
regression pass once real reference art exists.
