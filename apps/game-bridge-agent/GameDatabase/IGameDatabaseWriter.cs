namespace BloodMoon.GameBridgeAgent.GameDatabase;

public sealed record CreateGameAccountResult(string ResultCode, int? MembGuid);

// Deliberately narrow: no raw SQL, table or generic action member exists.
public interface IGameDatabaseWriter
{
    Task<CreateGameAccountResult> CreateGameAccountAsync(string legacyLogin, string gameCredential, CancellationToken ct);
}
