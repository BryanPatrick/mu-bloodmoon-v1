# Resolution engine (Launcher Phase L3)

## The six approved profiles

`ResolutionProfiles.All` (`Services/ResolutionEngine.cs`) -- real pixel
numbers everywhere (window sizing, the Settings > LAUNCHER combo), never
Small/Medium/Large labels:

| Profile | Size | Wide |
|---|---|---|
| Baseline | 1280 × 720 | no |
| Widescreen | 1600 × 900 | no |
| Widescreen | 1920 × 1080 | no |
| Wide | 1600 × 720 | yes |
| Wide | 1920 × 800 | yes |
| Maximized | fills the work area (× 0.96 margin) | yes |

Persisted as `LauncherSettings.LauncherViewportProfileIndex` -- a field
deliberately separate from the pre-existing `LauncherSettings.
ResolutionIndex` (the MU **game client's** own in-game resolution,
written to the game's registry config by `GameConfigurationService` and
untouched by this phase). Two different resolutions, two different
settings fields, on purpose.

## Why a Grid-based shell, not the old PNG-background window

Part A's audit found the pre-existing `MainWindow.xaml` was a single,
fixed 1536×1024 design: one pre-rendered background image
(`Assets/launcher-shell-v2.png`) with transparent "hotspot" buttons
positioned by exact `Canvas.Left/Top` pixel coordinates, uniformly scaled
to fit the screen via a `Viewbox`. That approach cannot support a real
resolution engine at all -- a static image can't redistribute space
between regions, and uniform `Viewbox` scaling is exactly the "scale
everything blindly" anti-pattern Part I rules out. The Shell (`MainWindow.
xaml`) was rewritten as a real `Grid`-based layout (top frame / nav rail +
page host / bottom bar), sized directly to the selected profile's pixel
dimensions -- no `Viewbox`, no scale transform. See `docs/launcher/
wpf-cms-binding.md` and `docs/assets/central-asset-library.md` for what
else that audit found already built and reused as-is.

## Baseline-relative, non-uniform scaling (Part H/I)

`ResolutionEngine.BaselineWidth/Height` = 1280×720. Different UI groups
scale differently, deliberately:

- **Fixed/limited** (nav, utility icons, updater, small typography): not
  scaled at all -- `NavColumn.Width` is a constant pixel value
  (`ResolutionEngine.NavColumnWidth`, 220px normal / 196px in WIDE), and
  small text uses fixed `FontSize` values in XAML. This is the simplest,
  most literal way to satisfy "don't scale everything blindly": these
  regions simply don't participate in scaling.
- **Expandable** (central content, hero, cards/tables): `ContentScale`
  grows linearly with window width, clamped `[1.0, 1.6]`.
- **Typography**: `TypographyScale` grows more conservatively (a 0.4×
  damped version of the same ratio), clamped `[1.0, 1.25]`, so headline
  text doesn't overwhelm the compact launcher proportions at 1920px+.

All bounded (Part H's "sensible min/max constraints"); see
`ResolutionEngineTests.cs` for the exact clamp behavior.

## WIDE (Part J)

`ResolutionEngine.NavColumnWidth(isWide: true)` returns 196, *narrower*
than the 220px baseline -- the nav rail never grows in WIDE, so the extra
horizontal space (1600/1920 vs. 1280) goes entirely to the page host
(hero/content/grids), matching "left nav ≈ stable/limited growth,
hero/content = major expansion."

## MAXIMIZED (Part K)

`MainWindow.ApplyResolutionProfile` sizes the window to
`SystemParameters.WorkArea × 0.96` (respects the taskbar/work area by
construction -- `WorkArea` already excludes it) rather than the full
screen bounds, and never sets `Stretch="Fill"` anywhere; the Grid-based
layout redistributes space the same way it does at any other size.

## Settings (Part L) and live resize (Part M)

CONFIGURAÇÕES > LAUNCHER tab (`Views/SettingsPage.xaml`) lists all six
profiles by their real numbers via a `ComboBox` bound to
`ResolutionProfiles.All`; selecting one calls `ApplyResolutionProfile`
immediately (live preview), APLICAR persists it. The window's
`MinWidth`/`MinHeight` (1024×600) plus the Grid-based body/nav/content
layout mean a user manually dragging the window to resize it can't
collapse into clipping/overlap -- there's no fixed-pixel canvas to clip
inside.

## Known gap

Pixel-fidelity against the "latest approved Launcher screenshots" this
phase's own spec calls authoritative was not verified -- no such images
were attached to the session; see `docs/launcher/page-data-sources.md`'s
own note on this. Structural/functional correctness (layout, navigation,
data binding, resolution behavior) was verified directly: real, rendered
screenshots via `--render-preview=`/`--render-preview-page=` for all 7
pages, at the baseline profile, in offline/fallback mode.
