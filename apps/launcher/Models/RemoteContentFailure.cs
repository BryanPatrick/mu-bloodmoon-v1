namespace BloodMoon.Launcher.Models;

// Part X's failure-state catalogue.
public enum RemoteContentFailureKind
{
    ApiOffline,
    Timeout,
    InvalidPayload,
    AssetDownloadFailed,
    AssetHashMismatch,
    AuthExpired,
    ServerUnavailable,
    NoEvents,
    NoNews,
    NoCharacters,
    NotLoggedIn
}

// Every failure kind maps to a stable, pre-written Portuguese message --
// never the raw exception text (Part X), matching the existing translated
// error-message convention in LauncherApiClient.EnsureSuccessAsync.
public static class RemoteContentFailureMessages
{
    public static string For(RemoteContentFailureKind kind) => kind switch
    {
        RemoteContentFailureKind.ApiOffline =>
            "Não foi possível conectar ao servidor. Mostrando o último conteúdo salvo.",
        RemoteContentFailureKind.Timeout =>
            "O servidor demorou para responder. Tentando novamente em breve.",
        RemoteContentFailureKind.InvalidPayload =>
            "O servidor enviou uma resposta inesperada. Mostrando o último conteúdo salvo.",
        RemoteContentFailureKind.AssetDownloadFailed =>
            "Não foi possível baixar uma imagem remota.",
        RemoteContentFailureKind.AssetHashMismatch =>
            "Uma imagem remota falhou na verificação de integridade e foi descartada.",
        RemoteContentFailureKind.AuthExpired =>
            "Sua sessão expirou. Entre novamente para continuar.",
        RemoteContentFailureKind.ServerUnavailable =>
            "O servidor do jogo está indisponível no momento.",
        RemoteContentFailureKind.NoEvents => "Nenhum evento no momento.",
        RemoteContentFailureKind.NoNews => "Nenhuma notícia publicada ainda.",
        RemoteContentFailureKind.NoCharacters => "Nenhum personagem encontrado nesta conta.",
        RemoteContentFailureKind.NotLoggedIn => "Entre na sua conta para ver este conteúdo.",
        _ => "Ocorreu um problema inesperado."
    };
}
