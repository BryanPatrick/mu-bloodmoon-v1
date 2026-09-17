# Launcher scale, text scale, and DPI (Part 8)

Two new, independent user preferences on top of the pre-existing
[resolution engine](resolution-engine.md) (which decides WHICH physical
window size the shell targets, e.g. 1920×1080 — unchanged this phase):

```
LauncherScale -- a uniform density multiplier for the WHOLE rendered
  shell (window, nav, buttons, icons, typography, padding, margins,
  border thickness, status bar) at whatever resolution profile is
  active. Live preview. Persisted as LauncherSettings.LauncherScaleIndex.
TextScale      -- an independent multiplier for ONLY the Typography.xaml
  FontSize.* tokens. Requires reopening the launcher. Persisted as
  LauncherSettings.TextScaleIndex.
```

Both reuse the existing `SettingsService`/`launcher.settings.json` — no
second settings system was built.

## Why a LayoutTransform, not a Viewbox

The pre-existing shell was rewritten (Launcher Phase L3, Part A) away
from a single window-wide `Viewbox` stretching a static PNG background
specifically because that approach can't redistribute space and
produces blurry text/bad hit targets. Part 8 repeats the same warning
("do not simply wrap the entire Launcher in a Viewbox"). The real
distinction that resolves this: a `Viewbox` around already-rendered
content stretches a bitmap; a `LayoutTransform` (applied here to
`MainWindow.xaml`'s `RootGrid`) causes WPF to **re-run real layout** at
the transformed size — hit-testing coordinates and text metrics are
computed correctly at the new scale, not stretched after the fact. This
is the standard, production-safe WPF pattern for a whole-app UI-density
control, distinct from the anti-pattern that was already rejected.

`RootGrid.Width`/`Height` are set explicitly in code
(`MainWindow.xaml.cs`'s `ApplyDisplayLayout`) to the **active
ResolutionProfile's unscaled pixel size** — this gives the
`ScaleTransform` a fixed, known native size to scale from. The Window's
own `Width`/`Height` are set to `nativeSize × scaleFactor`, so the
physical window genuinely gets smaller/larger (Part 8: "the same
approved Launcher should simply be presented at a different physical
size"), not just its internal density.

## LAUNCHER_SCALE_LEVELS

```
LAUNCHER_SCALE_LEVELS = [
  Compacto     0.70,
  Pequeno      0.80,
  Padrão       1.00,
  Grande       1.20,
  Muito grande 1.30
]
```

No adjustment from the suggested 70/80/100/120/130 was needed —
`ScaleTransform` accepts any positive factor, so nothing in WPF forced
a different number. The one real technical constraint these values run
into is downstream (see MIN_SUPPORTED_RESOLUTION below), not in the
percentages themselves.

## TEXT_SCALE_LEVELS

```
TEXT_SCALE_LEVELS = [Pequeno 0.90, Padrão 1.00, Grande 1.15]
```

Deliberately narrower than LauncherScale's 0.70-1.30 range. Part 8's
own accessibility rule — "do not achieve compact layouts by making
essential text extremely small" — means TextScale exists for
readability, not for fitting more content, so its floor stays close to
1.0. The two axes compose multiplicatively (LauncherScale scales the
whole shell including its text; TextScale then further adjusts type on
top of that), so a narrow TextScale range is what keeps every tested
Font-scale QA combination below safe.

## Why TextScale requires a restart, LauncherScale doesn't

`Typography.xaml`'s five `FontSize.*` tokens are consumed as
`StaticResource` everywhere across all 7 pages — resolved once, at XAML
parse time. Migrating every `FontSize={StaticResource ...}` reference in
the app to `DynamicResource` purely so text scale could preview
instantly is exactly the "fragile runtime transformation... purely for
instant preview" Part 8 says not to build, for a real, wide blast
radius (every page, every control). `App.xaml.cs`'s `OnStartup` instead
loads settings and overrides `Application.Resources["FontSize.*"]`
**before** `MainWindow` (or any page) is constructed — this reaches
every page correctly, but only takes effect on the next launch. The
Settings page shows an explicit "Requer reabrir o launcher" note and,
after Aplicar, a toast confirming the same when TextScale changed.
LauncherScale's `LayoutTransform` + window resize, by contrast, are both
cheap, safe, and already proven live-appliable by the pre-existing
resolution-profile combo (Part L) — extended the same way.

## WINDOW FITTING / AUTO_FIT_TO_WORK_AREA

`ApplyDisplayLayout` computes `nativeSize × requestedScale` and, if
that would exceed `SystemParameters.WorkArea`, calls
`LauncherScaleEngine.FitToWorkArea` to step DOWN to the largest scale
(at or below what was requested) that actually fits — never partially
off-screen, never silently exceeding the desktop (Part 8's explicit
"prefer graceful automatic fitting"). The **saved preference in
`LauncherSettings` is never overwritten by this fallback** — only the
window actually shown this session is adjusted, matching Part 8's
"AUTOMATIC FALLBACK: do not destroy the saved preference unless
necessary." Reopening on a larger monitor later re-applies the real
saved preference from scratch.

```
AUTO_FIT_TO_WORK_AREA = PASS (real function, LauncherScaleEngineTests.cs:
  SAVED_SCALE_TOO_LARGE_FALLS_BACK_SAFELY, FitToWorkArea_never_falls_
  below_Compact_even_on_an_unrealistically_tiny_work_area,
  FitToWorkArea_never_upgrades_past_what_was_actually_requested)
```

**MAXIMIZED is a deliberate scope boundary**: it already fills the work
area at its own fixed 0.96 margin, so LauncherScale does not
additionally resize that window (scaling a work-area-filling window up
would exceed the desktop; scaling it down would just waste desktop
space, not a real accessibility win) — the `LayoutTransform` density
change still applies to the shell's content within that fixed window.

## The window-drag floor now tracks the active scale

The shell's pre-existing `MinWidth="1024"`/`MinHeight="600"` (XAML)
would have silently prevented Compact (896×504 at Baseline) from ever
actually shrinking the window — a real, concrete bug this phase found
and fixed. `MainWindow.MinWidth`/`MinHeight` are now set dynamically in
`ApplyDisplayLayout` via `LauncherScaleEngine.MinWidthForScale`/
`MinHeightForScale`, which track the active scale but never drop below
`LauncherScaleEngine.AbsoluteMinWidth/Height` (896×504 — derived from
Compact × Baseline, the smallest real, intentionally supported
combination, not picked arbitrarily).

## MIN_SUPPORTED_RESOLUTION

```
MIN_SUPPORTED_RESOLUTION = 1280×720 physical screen, using an
  auto-fitted Compact or Small LauncherScale
```

Reasoning (not a live multi-monitor test rig — this environment has one
real display, confirmed 1366×768 during this phase's own verification):
a real 1280×720 screen's usable work area (screen minus the Windows
taskbar, typically ~40-48px) is closer to 1280×672-680 — **less tall
than Baseline's own 720px at Standard scale**, meaning the shell would
not fit at Standard even before this phase's own work. The new
`FitToWorkArea` fallback now handles this automatically: opening on such
a screen steps down to Compact/Small, which does fit. At full Standard
(100%) scale, the practical minimum is closer to **1366×768** (this
phase's own real, live-tested resolution), since its real work area
(~1366×728) comfortably contains the full 1280×720 baseline window with
margin.

## Persistence

```
SCALE_PREFERENCE_PERSISTENCE = PASS (LauncherSettings.LauncherScaleIndex,
  round-trips through the existing SettingsService/settings.json —
  additive field, an older settings.json without the key defaults to
  Standard, real test: SCALE_PREFERENCE_PERSISTED)
TEXT_PREFERENCE_PERSISTENCE = PASS (same mechanism, TextScaleIndex,
  real test: TEXT_PREFERENCE_PERSISTED)
```

## DPI awareness and double-scaling safety

`BloodMoon.Launcher.csproj` sets no explicit `ApplicationHighDpiMode`
and `app.manifest` declares no `<dpiAwareness>` element — this means the
app uses .NET's own default for a modern (net8.0-windows) WPF
application, which has been **PerMonitorV2** since .NET Core 3.0. This
was true before this phase and is unchanged by it; Part 8's DPI
requirements are satisfied by architecture, not new code.

```
DOUBLE_SCALING_HANDLED = YES
```

The two scaling mechanisms are architecturally orthogonal, not the same
multiplier applied twice:

- **Windows DPI** operates *outside* the app's own coordinate system.
  WPF always measures/lays out in device-independent pixels (96 DPI
  logical units); PerMonitorV2 awareness means the OS/WPF re-rasterize
  that same logical layout crisply at whichever monitor's real physical
  density is active (100%/125%/150%) — never a stretched bitmap.
  `SystemParameters.WorkArea` (which `ApplyDisplayLayout` reads) is
  already reported in these same logical units, adjusted for the
  monitor's own DPI.
- **LauncherScale** operates *inside* the app's own logical coordinate
  system — it changes how many DIPs the shell occupies, via
  `LayoutTransform`.

The two **compose** (a real, larger or smaller area of the physical
screen is used as both values change) rather than **cancel or
double-apply** (neither mechanism reads or adjusts the other's value).
`Launcher 80% + Windows 125%` is therefore **not** "visually equal to
100%" in any exact sense — it is a real, independent combination whose
resulting physical footprint depends on both factors together, which is
the correct, expected behavior Part 8 itself warns not to assume
otherwise.

```
WINDOWS_DPI_100 = PASS (live-verified this phase -- see QA below;
  this environment's real display runs at 100%)
WINDOWS_DPI_125 = PARTIAL (reasoned from documented PerMonitorV2
  default behavior + this architecture's DIP-based design, not
  empirically tested -- changing the real system DPI on the only
  available machine to verify this live was judged a system-settings
  change out of scope for this phase to make unilaterally)
WINDOWS_DPI_150 = PARTIAL (same reasoning, same caveat)
```

## QA — real verification performed this phase

Live, on-screen verification (not just the automated `--render-preview=`
screenshot tool — see the tooling note below) via a real desktop
capture of the actual running `BloodMoonLauncher.exe`, at two
configurations:

1. **Standard (100%) launcher scale + Standard text** — INÍCIO page.
   Nav labels, hero cards, PLAY-equivalent button ("ENTRE PARA JOGAR"),
   news section, and the bottom status bar all render correctly, no
   clipping, matching the pre-existing approved layout exactly (this
   phase changes nothing visually at Standard/Standard, by design).
2. **Compact (70%) launcher scale + Large (115%) text** — the most
   demanding combination Part 8 names. INÍCIO page: nav labels remain
   single-line and fully legible despite the enlarged text; "ENTRE PARA
   JOGAR" renders with no clipping; the whole window is visibly, exactly
   896×504 (Baseline × 0.70, confirmed via the PNG's own pixel
   dimensions) and sits correctly within the real 1366×768 desktop.

```
COMPACT_SCALE_QA = PASS (live-verified, INÍCIO + CONFIGURAÇÕES pages)
STANDARD_SCALE_QA = PASS (live-verified, INÍCIO page; unchanged from
  the pre-existing, already-verified Phase L3 baseline for the other
  5 pages)
LARGE_SCALE_QA = NOT_LIVE_TESTED (real code path identical to Compact's
  --  ApplyDisplayLayout has no scale-specific branching -- but the
  Large/Extra-Large physical window sizes were not individually
  screen-captured this phase; low risk given Compact's own successful
  verification exercises the same function)
LARGE_TEXT_QA = PASS (live-verified as part of the Compact+Large
  combination above)
CRITICAL_CONTROLS_REMAIN_VISIBLE = PASS (live-verified: ENTRE PARA
  JOGAR/ENTRAR/CONFIGURAÇÕES nav item all visible and legible at the
  most demanding tested combination)
NO_NAV_LABEL_CLIPPING = PASS (live-verified, both configurations)
NO_PLAY_BUTTON_CLIPPING = PASS (live-verified, both configurations --
  note: the JOGAR button only replaces ENTRE PARA JOGAR once a real
  session is logged in, not exercised this phase; the logged-out
  equivalent button was verified instead, same control, same style)
```

## A real, pre-existing tooling artifact found (not a Part 8 regression)

The automated `--render-preview=` CLI screenshot mechanism
(`MainWindow.RenderPreviewAsync`, used by `scripts/build-launcher.ps1
-Preview` and referenced in `docs/launcher/resolution-engine.md`'s own
QA notes) was found, during this phase's own verification, to clip the
bottom ~15px of the shell's bottom status bar in its PNG output.
**This reproduces identically at Standard (100%) scale, using the
unmodified pre-existing code path — it is not caused by this phase's
LauncherScale/TextScale work.** A real, on-screen desktop capture of
the same build shows the bottom bar rendering completely correctly —
the clipping is specific to the offscreen `RenderTargetBitmap`
capture path (the preview window is positioned at `Left=-10000`,
`ShowActivated=false`), not the real interactive application. Not
fixed this phase (out of scope for Part 8, and the real app is
unaffected) — flagged as OR-025 in `docs/open-risks.md` for whoever
next relies on `--render-preview=` output for pixel-level QA.

## Known gaps

- Windows DPI 125%/150% interaction is reasoned from documented .NET
  WPF defaults, not empirically tested on real varied-DPI hardware
  (this environment has one real display, at 100%).
- Multi-monitor behavior (different work areas/DPI per monitor) was not
  separately tested — `SystemParameters.WorkArea` already reflects
  whichever monitor the window is currently on, so the same
  `FitToWorkArea` logic applies per-monitor by construction, but moving
  the window between monitors of different DPI mid-session was not
  exercised.
- Large/Extra-Large launcher scale physical sizing was verified by code
  inspection and Compact's own successful live test (same function,
  same code path), not independently screen-captured.

## Related systems

`Services/LauncherScaleEngine.cs`, `Models/LauncherSettings.cs`,
`MainWindow.xaml`/`MainWindow.xaml.cs`, `Views/SettingsPage.xaml`/`.cs`,
`App.xaml.cs`, `BloodMoon.Launcher.Tests/Resolution/LauncherScaleEngineTests.cs`,
[`resolution-engine.md`](resolution-engine.md) (the pre-existing,
unchanged window-size profile system this phase builds on top of).
