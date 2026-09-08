# Phase manifest: launcher-play-gate

```
PHASE_ID: launcher-play-gate
TITLE: Unify PlayGateEngine + LauncherRuntimePolicy into one canonical
  gate; preserve the gameReady=false / provisioning-granularity fix
OBJECTIVE: Two independently-built, never-reconciled Play-gating engines
  existed in parallel: PlayGateEngine.cs (openbeta's dirty working tree,
  never committed anywhere) and LauncherRuntimePolicy.cs (committed,
  launcher/phase-2d-release). Both implement the same "Phase 2D Part 9"
  spec differently. This phase merges them into one canonical engine
  without carrying forward either engine's own obsolete concerns.
SCOPE: LauncherRuntimePolicy.ResolvePlayButton's signature and body
  (extended with provisioningStatus/accountRestricted, matching
  PlayGateEngine's granularity); PlayState enum (+ProvisioningFailed,
  +AccountRestricted, +ClientNotReady); PlayButtonPresentation record
  (+AllowsGameLaunch, +ReasonText, +State); HomePage.xaml.cs's
  ApplyServerAndCharacter()/PlayButton_Click (pass the new inputs, add
  the AllowsGameLaunch defense-in-depth check on click); MainWindow's
  StartGame() (upgrade its own inline GameReady check to the same
  provisioning granularity); the full LauncherRuntimePolicyTests.cs
  suite (5 pre-existing tests preserved unchanged + 7 tests ported from
  PlayGateEngineTests.cs, adapted to the merged signature, + 2 new tests
  proving the merged precedence and the new ClientNotReady state).
NON_SCOPE: PlayGateEngine.cs itself was never copied into this branch --
  behavior was ported, not the file/structure (per explicit instruction).
  No resolution/scaling change (LauncherScaleEngine untouched). No CMS
  change. No visual/XAML redesign -- PlayReasonText has no rendering
  surface in this branch's XAML yet (openbeta added a TextBlock for it;
  adding one here would be a visual change, out of scope this phase --
  see KNOWN_DEBT). No updater change. No captcha/2FA/login-state change
  -- that flow was already correctly, independently built and committed
  on launcher/phase-2d-release; this phase reads LoginState nowhere and
  leaves MainWindow's LoginButton_Click entirely untouched.
BASE_COMMIT: launcher/phase-2d-release @ fe1d750a
DEPENDENCIES: none
FILES:
  - apps/launcher/Services/LauncherRuntimePolicy.cs (MODIFIED)
  - apps/launcher/Models/LauncherRuntimeState.cs (MODIFIED -- PlayButtonPresentation extended)
  - apps/launcher/Models/PageState.cs (MODIFIED -- PlayState extended)
  - apps/launcher/Views/HomePage.xaml.cs (MODIFIED)
  - apps/launcher/MainWindow.xaml.cs (MODIFIED)
  - apps/launcher/BloodMoon.Launcher.Tests/PageState/LauncherRuntimePolicyTests.cs (MODIFIED)
TESTS: 13 xunit test cases in LauncherRuntimePolicyTests.cs (5 pre-existing
  + 7 ported from PlayGateEngineTests.cs + 2 new). NOT_EXECUTABLE_IN_THIS_ENVIRONMENT
  -- confirmed no .NET SDK is installed on this machine (only the
  runtime: `dotnet test`/`dotnet build` both fail with "No .NET SDKs
  were found"; `C:\Program Files\dotnet` has no `sdk\` directory).
  Verified instead via a full manual trace of every test case's inputs
  against the implementation's control flow (documented case-by-case
  during this phase, all 13 traced to their expected outcome) -- this is
  NOT a substitute for a real test run and must not be reported as
  TESTS PASS. A real `dotnet test` run is required before this phase can
  be considered TESTED, not just IMPLEMENTED.
SECURITY_IMPACT: Preserves and extends the real fix this phase exists
  for -- an account with gameReady=false (or provisioningStatus PENDING/
  PROVISIONING/FAILED) can never reach AllowsGameLaunch=true, checked
  BEFORE the patch/update-state switch in the merged precedence (proven
  by GameReady_gate_wins_even_when_client_is_fully_patched), and
  independently re-checked at the actual process-launch site
  (MainWindow.StartGame()), not just at the button level -- defense in
  depth, matching the original ButtonEnabled/AllowsGameLaunch split's
  intent. accountRestricted remains a modeled-but-unwired forward path
  (no real backend signal produces it yet); never inferred as true.
KNOWN_DEBT:
  - PLAY_REASON_TEXT_NOT_RENDERED: ReasonText is computed and tested but
    has no XAML surface in this branch (no equivalent of openbeta's
    PlayReasonText TextBlock) -- deliberately excluded to avoid mixing a
    visual change into a behavior-only extraction. A future, explicitly
    scoped visual-only phase should add the rendering.
  - TESTS_NOT_ACTUALLY_RUN: see TESTS above -- this environment cannot
    run `dotnet test`. Whoever picks this branch up next (a machine with
    the .NET SDK installed) must run the suite before this phase moves
    past IMPLEMENTED to TESTED.
  - ACCOUNT_RESTRICTED_GATE_UNWIRED: modeled per PlayGateEngine's own
    precedent, no real caller ever sets accountRestricted=true yet
    (matches the pre-existing, honest gap already documented in
    PlayGateEngine.cs's own header comment).
LAST_UPDATED: 2026-09-08
```

## Side-by-side audit (A1)

| Gate | PlayGateEngine (openbeta, never committed) | LauncherRuntimePolicy (pre-merge, committed) |
|---|---|---|
| AUTH_GATE | ✅ `isLoggedIn` | ✅ identical substance |
| SERVER_MAINTENANCE_GATE | ✅ `serverMaintenanceActive` | ✅ `serverAvailable`, same substance |
| PATCHER_GATE / CLIENT_STATE_GATE | ❌ absent -- the real gap: an account mid-update or failed-verification read as `ReadyToPlay` purely from login+gameReady | ✅ `LauncherUpdateState` switch, real and unique |
| ACCOUNT_PROVISIONING_GATE | ✅ granular (`PENDING`/`PROVISIONING`/`FAILED` as distinct outcomes) | ❌ only a single collapsed `gameAccountReady` bool |
| GAME_READY_GATE | ✅ (folded into provisioning) | ✅ (coarser) |
| ACCOUNT_RESTRICTED_GATE | ✅ forward-looking, unwired | ❌ absent |
| UI_ONLY (reason text) | ✅ `ReasonText` + `ReasonForLoginState()` | ❌ label only |
| CAPTCHA_GATE / TWO_FACTOR_GATE | inline in `MainWindow.LoginButton_Click`, not in either engine | inline in `MainWindow.LoginButton_Click`, near-byte-identical `LoginState.cs`/`CaptchaChallengeService`/`AuthErrorMapper` to openbeta's own -- both branches independently built the same "Phase 2D" login flow |

**Duplicação real**: sim, em AUTH_GATE/SERVER_MAINTENANCE_GATE/coarse GAME_READY_GATE, e em toda a máquina de captcha/2FA/LoginState (fora de ambos os engines, quase idêntica nos dois branches).

## Decision (A2)

`ONE_CANONICAL_GATE_ENGINE = YES` → **`EXTEND_LAUNCHER_RUNTIME_POLICY`**, not `REPLACE_WITH_PLAYGATE` or `CREATE_NEW_UNIFIED_GATE`:
- **Menor duplicação**: estender é uma mudança; substituir exigiria remover o PATCHER_GATE de algum lugar e reintroduzi-lo dentro do PlayGateEngine, ou manter os dois.
- **Arquitetura atual**: `HomePage.xaml.cs` já bypassa `HomeStateMapper.Map`'s `PlayState` para o botão, chamando o policy diretamente -- estender preserva esse fluxo já estabelecido em vez de reintroduzir o roteamento via `HomeState` que openbeta usa.
- **Compatibilidade**: os 2 chamadores existentes (`MainWindow`, `HomePage`) continuam usando o mesmo nome/classe.
- **Testes**: os 5 testes pré-existentes de `LauncherRuntimePolicyTests` sobrevivem sem alteração (valores default preservam o comportamento exato); os 7 portados de `PlayGateEngineTests` passam a testar o motor real e commitado em vez de um motor nunca commitado.
- **Segurança**: a granularidade real do PlayGate (provisioning distinto, account-restricted) é absorvida sem perder o PATCHER_GATE que já existia.
- **Clareza**: um único motor, um único ponto de verdade -- `PlayGateEngine.cs` nunca foi copiado para este branch.

## A3 — Bug preservation

`GameReady_gate_wins_even_when_client_is_fully_patched` prova que a precedência mesclada checa `provisioningStatus`/`gameReady` **antes** do switch de `updateState` -- uma conta com `gameReady=false` nunca é tratada como pronta, mesmo com o cliente já `UpToDate`/`Ready`. Também endurecido no ponto de lançamento real (`MainWindow.StartGame()`), que antes só checava o bool bruto `GameReady` e agora também distingue `FAILED` de `PENDING`/`PROVISIONING`.
