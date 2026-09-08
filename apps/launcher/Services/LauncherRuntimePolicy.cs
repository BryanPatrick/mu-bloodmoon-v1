using BloodMoon.Launcher.Models;

namespace BloodMoon.Launcher.Services;

// feature/launcher-play-gate (2026-09-08) -- this is now the single
// canonical Play gate, merging LauncherRuntimePolicy's own already-real
// PATCHER_GATE (LauncherUpdateState) with PlayGateEngine's granular
// provisioning/account-restriction gates (ported from openbeta's
// parallel, never-committed Phase 2D Part 9 work -- see the phase
// manifest for the full side-by-side audit). Neither engine alone
// covered the full picture: PlayGateEngine never gated on patch/update
// state at all (a real gap this merge closes), and the original
// ResolvePlayButton only had a single collapsed gameAccountReady bool
// (no PENDING/PROVISIONING/FAILED distinction, no restriction gate).
public static class LauncherRuntimePolicy
{
    // provisioningStatus uses the real /launcher/me contract values
    // (NONE/PENDING/PROVISIONING/ACTIVE/FAILED). accountRestricted has
    // no real backend trigger today (PaymentRiskAction.ACCOUNT_RESTRICTION
    // exists in the API's enum but isn't wired to any enforcement point
    // yet) -- modeled here, defaulting to false, ready for a real signal.
    public static PlayButtonPresentation ResolvePlayButton(
        LauncherUpdateState updateState,
        bool isLoggedIn,
        bool serverAvailable,
        bool gameReady,
        string provisioningStatus = "ACTIVE",
        bool accountRestricted = false)
    {
        if (!isLoggedIn)
            return new(true, "ENTRE PARA JOGAR", RequestsLogin: true, AllowsGameLaunch: false, State: PlayState.NotLoggedIn);

        if (!serverAvailable)
            return new(false, "SERVIDOR INDISPONÍVEL", AllowsGameLaunch: false, ReasonText: "O servidor está temporariamente indisponível.", State: PlayState.ServerOffline);

        if (accountRestricted)
            return new(false, "ACESSO BLOQUEADO", AllowsGameLaunch: false, ReasonText: "Sua conta possui uma restrição que impede o acesso ao jogo.", State: PlayState.AccountRestricted);

        if (provisioningStatus == "FAILED")
            return new(false, "ERRO NA CONTA", AllowsGameLaunch: false, ReasonText: "Não foi possível preparar sua conta de jogo.", State: PlayState.ProvisioningFailed);

        if (provisioningStatus is "PENDING" or "PROVISIONING" || !gameReady)
            return new(false, "PREPARANDO CONTA...", AllowsGameLaunch: false, ReasonText: "Sua conta de jogo ainda está sendo preparada.", State: PlayState.GameAccountNotReady);

        return updateState switch
        {
            LauncherUpdateState.Checking => new(false, "VERIFICANDO...", State: PlayState.ClientNotReady),
            LauncherUpdateState.UpdateAvailable => new(false, "ATUALIZAÇÃO NECESSÁRIA", State: PlayState.ClientNotReady),
            LauncherUpdateState.Downloading => new(false, "ATUALIZANDO...", State: PlayState.ClientNotReady),
            LauncherUpdateState.Verifying => new(false, "VERIFICANDO ARQUIVOS...", State: PlayState.ClientNotReady),
            LauncherUpdateState.Error => new(false, "VERIFICAÇÃO NECESSÁRIA", State: PlayState.ClientNotReady),
            LauncherUpdateState.UpToDate or LauncherUpdateState.Ready => new(true, "JOGAR", AllowsGameLaunch: true, State: PlayState.ReadyToPlay),
            _ => new(false, "AGUARDE...", State: PlayState.ClientNotReady)
        };
    }
}
