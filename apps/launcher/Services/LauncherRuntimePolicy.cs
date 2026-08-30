using BloodMoon.Launcher.Models;

namespace BloodMoon.Launcher.Services;

public static class LauncherRuntimePolicy
{
    public static PlayButtonPresentation ResolvePlayButton(
        LauncherUpdateState updateState,
        bool isLoggedIn,
        bool serverAvailable,
        bool gameAccountReady)
    {
        if (!isLoggedIn) return new(true, "ENTRE PARA JOGAR", RequestsLogin: true);
        if (!serverAvailable) return new(false, "SERVIDOR INDISPONÍVEL");
        if (!gameAccountReady) return new(false, "PREPARANDO CONTA...");

        return updateState switch
        {
            LauncherUpdateState.Checking => new(false, "VERIFICANDO..."),
            LauncherUpdateState.UpdateAvailable => new(false, "ATUALIZAÇÃO NECESSÁRIA"),
            LauncherUpdateState.Downloading => new(false, "ATUALIZANDO..."),
            LauncherUpdateState.Verifying => new(false, "VERIFICANDO ARQUIVOS..."),
            LauncherUpdateState.Error => new(false, "VERIFICAÇÃO NECESSÁRIA"),
            LauncherUpdateState.UpToDate or LauncherUpdateState.Ready => new(true, "JOGAR"),
            _ => new(false, "AGUARDE...")
        };
    }
}
