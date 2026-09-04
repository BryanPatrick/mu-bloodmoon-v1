# Launcher scale, text scale, and DPI

Isolated from the uncommitted `open-beta/p0-foundation` worktree into this
release line (`launcher/phase-2d-release`) on top of the Phase 3 visual
fidelity commit. Two new, independent user preferences, both persisted
through the pre-existing `SettingsService`/`launcher.settings.json` — no
second settings system was built:

```
LauncherScale -- a uniform density multiplier for the WHOLE rendered
  shell (window, nav, buttons, icons, typography, padding, margins,
  border thickness, status bar). Live preview. Persisted as
  LauncherSettings.LauncherScaleIndex.
TextScale      -- an independent multiplier for ONLY the Typography.xaml
  FontSize.* tokens. Requires reopening the launcher. Persisted as
  LauncherSettings.TextScaleIndex.
```

## The native size this feature scales from

This release's approved shell has a single fixed frame: **1180×700**
(`MainWindow.xaml`'s Phase 1 compact desktop frame). Unlike the original
implementation of this feature (which layered on a since-removed
multi-profile "resolution engine" targeting several different native
window sizes — Baseline 1280×720, Widescreen, Wide, Maximized), this
isolation deliberately scopes down to that one real, currently-approved
size. `ResolutionProfiles`/`ResolutionEngine` (a separate, pre-existing,
unrelated viewport-profile picker still shown in Settings for
compatibility) is untouched and does not switch between different native
sizes — it never did, even before this feature, per the pre-existing
`ApplyResolutionProfile` comment this isolation preserves.

`LauncherScaleEngine.AbsoluteMinWidth`/`AbsoluteMinHeight` are therefore
**826×490** (Compact × this shell's own 1180×700 native size), not the
896×504 the original implementation derived from the old 1280×720
baseline it no longer applies to.

## Why a LayoutTransform, not a Viewbox

A `Viewbox` around already-rendered content stretches a bitmap; a
`LayoutTransform` (applied to `MainWindow.xaml`'s `RootGrid` via the named
`RootScaleTransform`) causes WPF to **re-run real layout** at the
transformed size — hit-testing coordinates and text metrics are computed
correctly at the new scale, not stretched after the fact.
`RootGrid.Width`/`Height` are set explicitly in code
(`MainWindow.xaml.cs`'s `ApplyDisplayLayout`) to the native 1180×700 size
— this gives the `ScaleTransform` a fixed, known native size to scale
from. The Window's own `Width`/`Height` are set to
`nativeSize × scaleFactor`, so the physical window genuinely gets
smaller/larger, not just its internal density.

## Deliberately not free-form

`MainWindow.xaml`'s `ResizeMode` stays `NoResize` — there is no resize
border/grip, and the user cannot drag-resize the window to an arbitrary
size. The window's physical size only ever changes through one of the
five discrete `LauncherScale` presets (or `FitToWorkArea`'s own automatic
step-down among those same five presets). This was an explicit owner
decision for this isolation: the original implementation's window was
freely resizable (`CanResizeWithGrip`); this release intentionally does
not restore that, only the discrete-preset resizing the feature itself
needs.

## LAUNCHER_SCALE_LEVELS / TEXT_SCALE_LEVELS

```
LAUNCHER_SCALE_LEVELS = [Compacto 0.70, Pequeno 0.80, Padrão 1.00, Grande 1.20, Muito grande 1.30]
TEXT_SCALE_LEVELS     = [Pequeno 0.90, Padrão 1.00, Grande 1.15]
```

Unchanged from the original design. TextScale is deliberately narrower —
it exists for readability, not for shrinking to fit more content.

## Why TextScale requires a restart, LauncherScale doesn't

`Typography.xaml`'s five `FontSize.*` tokens are consumed as
`StaticResource` everywhere — resolved once, at XAML parse time.
`App.xaml.cs`'s `OnStartup` loads settings and overrides
`Application.Resources["FontSize.*"]` **before** `MainWindow` (or any
page) is constructed — this reaches every page correctly, but only takes
effect on the next launch. The Settings page shows an explicit
"Requer reabrir o launcher" toast after Aplicar when TextScale changed.

## A real bug found and fixed during this isolation

`ViewportCombo`/`LauncherScaleCombo`/`TextScaleCombo` all bind
`ItemsSource` to a list of records and previously set `DisplayMemberPath`
in code-behind. Under this page's custom `BmComboBox` control template,
the closed (non-expanded) box displayed the item's raw `ToString()`
(e.g. `LauncherScaleOption { Level = Compact, ... }`) instead of the
`Label` — a real violation of "no internal enum names," caught via a live
screenshot during this isolation's own QA, not present in the dropdown
list itself (only the closed-box display). Fixed by giving each combo an
explicit `ItemTemplate` (`{Binding Label}`) in XAML instead of
`DisplayMemberPath` — WPF forbids setting both simultaneously
(`InvalidOperationException` at construction, which briefly crashed the
app on startup once a non-Standard `LauncherScaleIndex` was persisted,
during this same QA pass, before the fix). Verified fixed via a
subsequent live screenshot showing real Portuguese labels
("1280 × 720", "Compacto", "Padrão").

## WINDOW FITTING / AUTO_FIT_TO_WORK_AREA

`ApplyDisplayLayout` computes `nativeSize × requestedScale` and, if that
would exceed `SystemParameters.WorkArea`, calls
`LauncherScaleEngine.FitToWorkArea` to step DOWN to the largest scale (at
or below what was requested) that actually fits. The saved preference in
`LauncherSettings` is never overwritten by this fallback — only the
window actually shown this session is adjusted; reopening on a larger
monitor later re-applies the real saved preference from scratch.

```
AUTO_FIT_TO_WORK_AREA = PASS -- both a real unit test (see
  LauncherScaleEngineTests.cs) AND a real, live reproduction: this
  environment's actual display (1366x728 work area) genuinely cannot fit
  Grande(1.20) or Muito grande(1.30) against the 1180x700 native size
  (1416x840 / 1534x910 both exceed it), so selecting either live
  correctly fell back to Padrão (100%) -- observed directly, not just
  reasoned about.
```

## Persistence

```
SCALE_PREFERENCE_PERSISTENCE = PASS -- real test (LauncherScaleEngineTests.cs)
  AND real live verification: selected Compacto via the Settings combo,
  closed the app (which wrote launcherScaleIndex: 0 to the real
  launcher.settings.json on disk), relaunched, and the window opened
  already at 826x490 -- the persisted preference, not the default.
TEXT_PREFERENCE_PERSISTENCE = PASS (same mechanism, TextScaleIndex)
```

## DPI awareness and double-scaling safety

Unchanged from the original design -- `BloodMoon.Launcher.csproj` sets no
explicit DPI mode, so the app uses .NET's PerMonitorV2 default. Windows
DPI operates outside the app's own logical-pixel coordinate system;
LauncherScale operates inside it via LayoutTransform. The two compose
rather than double-apply.

```
WINDOWS_DPI_100 = PASS (this environment's real display runs at 100%)
WINDOWS_DPI_125 = NOT_EMPIRICALLY_TESTED
WINDOWS_DPI_150 = NOT_EMPIRICALLY_TESTED
```

Reasoned from the architecture (unchanged from the original design's own
honest disclosure of the same gap), not inferred as PASS.

## QA -- real verification performed during this isolation

Live, on-screen desktop capture of the actual running `.exe` (not the
`--render-preview=` tool), against the local API, at multiple
configurations:

```
LAUNCHER_SCALE_70  = PASS (826x490 exact match, live; screenshots on
  Settings, Home, Conta, Notícias, Eventos, Ranking, Loja -- all 7 pages)
LAUNCHER_SCALE_80  = PASS (944x560 exact match, live)
LAUNCHER_SCALE_100 = PASS (1180x700, pixel-identical to the pre-scale
  Phase 3 Home screenshot -- Standard changes nothing visually, by design)
LAUNCHER_SCALE_120 = PARTIAL (FitToWorkArea correctly and safely falls
  back to Padrão on this real 1366x728-work-area display; the requested
  1416x840 was not directly observed on this hardware)
LAUNCHER_SCALE_130 = PARTIAL (same reasoning, falls back to Padrão)
TEXT_SCALE_100 = PASS (default, seen throughout every screenshot)
TEXT_SCALE_115 = PASS (live, Compact+Grande-text combination, all 7 pages)
TEXT_SCALE_90  = NOT_INDEPENDENTLY_SCREENSHOTTED_THIS_PASS

CRITICAL_CONTROLS_REMAIN_VISIBLE = PASS (JOGAR-equivalent, ENTRAR, nav,
  all live-verified at the most demanding tested combination)
NO_NAV_LABEL_CLIPPING = PASS (all 7 pages, live)
NO_PLAY_BUTTON_CLIPPING = PASS (live)
NO_BOTTOM_STATUS_BAR_CLIPPING = PASS (live, on-screen capture -- see
  OR-025 below for why this differs from the offscreen preview tool)

AUTH_UI_SCALE_REGRESSION = PASS (login overlay + CAPTCHA WebView2
  container render correctly, no clipping, at Compact+Grande-text)
PLAY_GATING_REGRESSION = PASS (unmodified LauncherRuntimePolicy; JOGAR-
  equivalent button correctly gated in every screenshot)
CMS_REGRESSION = PASS (Home/News content renders correctly at every
  tested scale; no CMS logic touched)
```

## OR-025 -- a real, pre-existing tooling artifact, not a Part 8/scale regression

The automated `--render-preview=` CLI screenshot mechanism
(`MainWindow.RenderPreviewAsync`) clips the bottom ~15px of the status bar
in its PNG output. This reproduces identically at Standard scale using
the unmodified pre-existing code path -- confirmed, again, not caused by
this feature. A real on-screen desktop capture (used throughout this
isolation's own QA) shows the bottom bar rendering completely correctly
at every tested scale. Still not fixed (out of scope; the real app is
unaffected) -- remains flagged as OR-025.

## Known gaps

- Windows DPI 125%/150% interaction is reasoned from documented .NET WPF
  defaults, not empirically tested (this environment has one real
  display, at 100%).
- `TEXT_SCALE_90` (Pequeno) was not independently screenshotted this
  pass (only Padrão and Grande were).
- Multi-monitor behavior was not tested.

## Related systems

`Services/LauncherScaleEngine.cs`, `Models/LauncherSettings.cs`,
`MainWindow.xaml`/`MainWindow.xaml.cs`, `Views/SettingsPage.xaml`/`.cs`,
`App.xaml.cs`, `BloodMoon.Launcher.Tests/Resolution/LauncherScaleEngineTests.cs`.
`Services/ResolutionEngine.cs` (the separate, pre-existing, unmodified
viewport-profile picker) is a sibling system, not a dependency of this
feature in this release line.
