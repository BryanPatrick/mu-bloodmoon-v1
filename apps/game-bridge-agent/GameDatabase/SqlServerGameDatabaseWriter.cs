using System.Data;
using Microsoft.Data.SqlClient;

namespace BloodMoon.GameBridgeAgent.GameDatabase;

public sealed class SqlServerGameDatabaseWriter(string connectionString) : IGameDatabaseWriter
{
    public async Task<CreateGameAccountResult> CreateGameAccountAsync(string legacyLogin, string gameCredential, CancellationToken ct)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(ct);
        await using var command = new SqlCommand("dbo.DmN_CreateGameAccount", connection) { CommandType = CommandType.StoredProcedure, CommandTimeout = 20 };
        command.Parameters.Add(new SqlParameter("@LegacyLogin", SqlDbType.VarChar, 10) { Value = legacyLogin });
        command.Parameters.Add(new SqlParameter("@GameCredential", SqlDbType.VarChar, 10) { Value = gameCredential });
        var resultCode = new SqlParameter("@ResultCode", SqlDbType.VarChar, 32) { Direction = ParameterDirection.Output };
        var membGuid = new SqlParameter("@NewMembGuid", SqlDbType.Int) { Direction = ParameterDirection.Output };
        command.Parameters.Add(resultCode); command.Parameters.Add(membGuid);
        await command.ExecuteNonQueryAsync(ct);
        return new CreateGameAccountResult(Convert.ToString(resultCode.Value) ?? "MU_TRANSACTION_FAILED", membGuid.Value is DBNull ? null : Convert.ToInt32(membGuid.Value));
    }

    // GameBridge extension plan Part 3/6. Written to the identical ADO.NET/
    // static-procedure-call pattern as CreateGameAccountAsync above. Real
    // end-to-end integration coverage against a real local SQL Server 2022
    // instance: BloodMoon.GameBridgeAgent.Tests/SqlServerLocalIntegrationTests.cs
    // (docs/environment/sql-server-test-environment.md records the install).
    public async Task<GrantVipResult> GrantVipAsync(string legacyLogin, int targetLevel, DateTime expiresAt, Guid commandId, Guid correlationId, CancellationToken ct)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(ct);
        await using var command = new SqlCommand("dbo.bm_GrantVip", connection) { CommandType = CommandType.StoredProcedure, CommandTimeout = 20 };
        command.Parameters.Add(new SqlParameter("@LegacyLogin", SqlDbType.VarChar, 10) { Value = legacyLogin });
        command.Parameters.Add(new SqlParameter("@TargetLevel", SqlDbType.TinyInt) { Value = targetLevel });
        command.Parameters.Add(new SqlParameter("@ExpiresAt", SqlDbType.DateTime) { Value = expiresAt });
        command.Parameters.Add(new SqlParameter("@CommandId", SqlDbType.UniqueIdentifier) { Value = commandId });
        command.Parameters.Add(new SqlParameter("@CorrelationId", SqlDbType.UniqueIdentifier) { Value = correlationId });
        var resultCode = new SqlParameter("@ResultCode", SqlDbType.VarChar, 32) { Direction = ParameterDirection.Output };
        var previousLevel = new SqlParameter("@PreviousLevel", SqlDbType.TinyInt) { Direction = ParameterDirection.Output };
        var newLevel = new SqlParameter("@NewLevel", SqlDbType.TinyInt) { Direction = ParameterDirection.Output };
        command.Parameters.Add(resultCode); command.Parameters.Add(previousLevel); command.Parameters.Add(newLevel);
        await command.ExecuteNonQueryAsync(ct);
        return new GrantVipResult(
            Convert.ToString(resultCode.Value) ?? "MU_TRANSACTION_FAILED",
            previousLevel.Value is DBNull ? null : Convert.ToInt32(previousLevel.Value),
            newLevel.Value is DBNull ? null : Convert.ToInt32(newLevel.Value));
    }

    public async Task<SyncVipTierResult> SyncVipTierAsync(string legacyLogin, int desiredLevel, DateTime? desiredExpiresAt, Guid commandId, Guid correlationId, CancellationToken ct)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(ct);
        await using var command = new SqlCommand("dbo.bm_SyncVipTier", connection) { CommandType = CommandType.StoredProcedure, CommandTimeout = 20 };
        command.Parameters.Add(new SqlParameter("@LegacyLogin", SqlDbType.VarChar, 10) { Value = legacyLogin });
        command.Parameters.Add(new SqlParameter("@DesiredLevel", SqlDbType.TinyInt) { Value = desiredLevel });
        command.Parameters.Add(new SqlParameter("@DesiredExpiresAt", SqlDbType.DateTime) { Value = (object?)desiredExpiresAt ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@CommandId", SqlDbType.UniqueIdentifier) { Value = commandId });
        command.Parameters.Add(new SqlParameter("@CorrelationId", SqlDbType.UniqueIdentifier) { Value = correlationId });
        var resultCode = new SqlParameter("@ResultCode", SqlDbType.VarChar, 32) { Direction = ParameterDirection.Output };
        var previousLevel = new SqlParameter("@PreviousLevel", SqlDbType.TinyInt) { Direction = ParameterDirection.Output };
        var newLevel = new SqlParameter("@NewLevel", SqlDbType.TinyInt) { Direction = ParameterDirection.Output };
        var changed = new SqlParameter("@Changed", SqlDbType.Bit) { Direction = ParameterDirection.Output };
        command.Parameters.Add(resultCode); command.Parameters.Add(previousLevel); command.Parameters.Add(newLevel); command.Parameters.Add(changed);
        await command.ExecuteNonQueryAsync(ct);
        return new SyncVipTierResult(
            Convert.ToString(resultCode.Value) ?? "MU_TRANSACTION_FAILED",
            previousLevel.Value is DBNull ? null : Convert.ToInt32(previousLevel.Value),
            newLevel.Value is DBNull ? null : Convert.ToInt32(newLevel.Value),
            changed.Value is not DBNull && Convert.ToBoolean(changed.Value));
    }

    public async Task<AnonymizeGameAccountResult> AnonymizeGameAccountAsync(string legacyLogin, Guid commandId, Guid correlationId, CancellationToken ct)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(ct);
        await using var command = new SqlCommand("dbo.bm_AnonymizeGameAccount", connection) { CommandType = CommandType.StoredProcedure, CommandTimeout = 20 };
        command.Parameters.Add(new SqlParameter("@LegacyLogin", SqlDbType.VarChar, 10) { Value = legacyLogin });
        command.Parameters.Add(new SqlParameter("@CommandId", SqlDbType.UniqueIdentifier) { Value = commandId });
        command.Parameters.Add(new SqlParameter("@CorrelationId", SqlDbType.UniqueIdentifier) { Value = correlationId });
        var resultCode = new SqlParameter("@ResultCode", SqlDbType.VarChar, 32) { Direction = ParameterDirection.Output };
        var entitiesAffectedJson = new SqlParameter("@EntitiesAffectedJson", SqlDbType.NVarChar, -1) { Direction = ParameterDirection.Output };
        command.Parameters.Add(resultCode); command.Parameters.Add(entitiesAffectedJson);
        await command.ExecuteNonQueryAsync(ct);
        return new AnonymizeGameAccountResult(
            Convert.ToString(resultCode.Value) ?? "MU_TRANSACTION_FAILED",
            entitiesAffectedJson.Value is DBNull ? null : Convert.ToString(entitiesAffectedJson.Value));
    }

    public async Task<PurgeGameAccountResult> PurgeGameAccountAsync(string legacyLogin, string betaCycleId, Guid commandId, Guid correlationId, CancellationToken ct)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(ct);
        await using var command = new SqlCommand("dbo.bm_PurgeGameAccount", connection) { CommandType = CommandType.StoredProcedure, CommandTimeout = 20 };
        command.Parameters.Add(new SqlParameter("@LegacyLogin", SqlDbType.VarChar, 10) { Value = legacyLogin });
        command.Parameters.Add(new SqlParameter("@BetaCycleId", SqlDbType.VarChar, 80) { Value = betaCycleId });
        command.Parameters.Add(new SqlParameter("@CommandId", SqlDbType.UniqueIdentifier) { Value = commandId });
        command.Parameters.Add(new SqlParameter("@CorrelationId", SqlDbType.UniqueIdentifier) { Value = correlationId });
        var resultCode = new SqlParameter("@ResultCode", SqlDbType.VarChar, 32) { Direction = ParameterDirection.Output };
        var tablesAffectedJson = new SqlParameter("@TablesAffectedJson", SqlDbType.NVarChar, -1) { Direction = ParameterDirection.Output };
        command.Parameters.Add(resultCode); command.Parameters.Add(tablesAffectedJson);
        await command.ExecuteNonQueryAsync(ct);
        return new PurgeGameAccountResult(
            Convert.ToString(resultCode.Value) ?? "MU_TRANSACTION_FAILED",
            tablesAffectedJson.Value is DBNull ? null : Convert.ToString(tablesAffectedJson.Value));
    }
}
