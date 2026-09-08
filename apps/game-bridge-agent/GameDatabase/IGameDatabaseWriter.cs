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
//
// PHASE L DECISION CLOSURE, Decision 3 (2026-08-31): commandId/correlationId
// are now required on the four bm_* mutation methods (GrantVip/SyncVipTier/
// AnonymizeGameAccount/PurgeGameAccount) -- these map 1:1 onto the four
// procedures instrumented against dbo.bm_GameBridgeAudit (see
// proposed-bm-gamebridge-audit-table.sql). CreateGameAccountAsync deliberately
// does NOT gain these params -- dbo.DmN_CreateGameAccount is a pre-existing,
// already-production-installed procedure outside the bm_* audit family, and
// Decision 3 scoped the audit table to exactly those four operations.
public interface IGameDatabaseWriter
{
    Task<CreateGameAccountResult> CreateGameAccountAsync(string legacyLogin, string gameCredential, CancellationToken ct);
    Task<GrantVipResult> GrantVipAsync(string legacyLogin, int targetLevel, DateTime expiresAt, Guid commandId, Guid correlationId, CancellationToken ct);
    Task<SyncVipTierResult> SyncVipTierAsync(string legacyLogin, int desiredLevel, DateTime? desiredExpiresAt, Guid commandId, Guid correlationId, CancellationToken ct);
    Task<AnonymizeGameAccountResult> AnonymizeGameAccountAsync(string legacyLogin, Guid commandId, Guid correlationId, CancellationToken ct);
    Task<PurgeGameAccountResult> PurgeGameAccountAsync(string legacyLogin, string betaCycleId, Guid commandId, Guid correlationId, CancellationToken ct);
}
