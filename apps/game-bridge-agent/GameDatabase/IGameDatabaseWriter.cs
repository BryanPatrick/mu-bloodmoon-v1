namespace BloodMoon.GameBridgeAgent.GameDatabase;

public sealed record CreateGameAccountResult(string ResultCode, int? MembGuid);

// GameBridge extension plan (docs/gamebridge/gamebridge-agent-extension-plan.md)
// Part 6 -- one result record per new stored procedure's OUTPUT parameter
// shape, mirroring CreateGameAccountResult exactly.
public sealed record GrantVipResult(string ResultCode, int? PreviousLevel, int? NewLevel);
public sealed record SyncVipTierResult(string ResultCode, int? PreviousLevel, int? NewLevel, bool Changed);
public sealed record AnonymizeGameAccountResult(string ResultCode, string? EntitiesAffectedJson);
public sealed record PurgeGameAccountResult(string ResultCode, string? TablesAffectedJson);

// Deliberately narrow: no raw SQL, table or generic action member exists.
// Each method maps to exactly one stored procedure EXECUTE -- never a
// parameterized table/column name, never dynamic SQL (plan Part 6/16).
public interface IGameDatabaseWriter
{
    Task<CreateGameAccountResult> CreateGameAccountAsync(string legacyLogin, string gameCredential, CancellationToken ct);
    Task<GrantVipResult> GrantVipAsync(string legacyLogin, int targetLevel, CancellationToken ct);
    Task<SyncVipTierResult> SyncVipTierAsync(string legacyLogin, int desiredLevel, CancellationToken ct);
    Task<AnonymizeGameAccountResult> AnonymizeGameAccountAsync(string legacyLogin, CancellationToken ct);
    Task<PurgeGameAccountResult> PurgeGameAccountAsync(string legacyLogin, string betaCycleId, CancellationToken ct);
}
