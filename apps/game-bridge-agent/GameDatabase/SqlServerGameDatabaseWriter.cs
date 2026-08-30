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

    // GameBridge extension plan Part 3/6. NOT executed against a real SQL
    // Server engine this session -- docs/environment/sql-server-test-environment.md
    // records the exact blocker (no admin rights to install one). Written to
    // the identical ADO.NET/static-procedure-call pattern as
    // CreateGameAccountAsync above, reviewed but unverified end-to-end.
    public async Task<GrantVipResult> GrantVipAsync(string legacyLogin, int targetLevel, CancellationToken ct)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(ct);
        await using var command = new SqlCommand("dbo.bm_GrantVip", connection) { CommandType = CommandType.StoredProcedure, CommandTimeout = 20 };
        command.Parameters.Add(new SqlParameter("@LegacyLogin", SqlDbType.VarChar, 10) { Value = legacyLogin });
        command.Parameters.Add(new SqlParameter("@TargetLevel", SqlDbType.TinyInt) { Value = targetLevel });
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

    public async Task<SyncVipTierResult> SyncVipTierAsync(string legacyLogin, int desiredLevel, CancellationToken ct)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(ct);
        await using var command = new SqlCommand("dbo.bm_SyncVipTier", connection) { CommandType = CommandType.StoredProcedure, CommandTimeout = 20 };
        command.Parameters.Add(new SqlParameter("@LegacyLogin", SqlDbType.VarChar, 10) { Value = legacyLogin });
        command.Parameters.Add(new SqlParameter("@DesiredLevel", SqlDbType.TinyInt) { Value = desiredLevel });
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

    public async Task<AnonymizeGameAccountResult> AnonymizeGameAccountAsync(string legacyLogin, CancellationToken ct)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(ct);
        await using var command = new SqlCommand("dbo.bm_AnonymizeGameAccount", connection) { CommandType = CommandType.StoredProcedure, CommandTimeout = 20 };
        command.Parameters.Add(new SqlParameter("@LegacyLogin", SqlDbType.VarChar, 10) { Value = legacyLogin });
        var resultCode = new SqlParameter("@ResultCode", SqlDbType.VarChar, 32) { Direction = ParameterDirection.Output };
        var entitiesAffectedJson = new SqlParameter("@EntitiesAffectedJson", SqlDbType.NVarChar, -1) { Direction = ParameterDirection.Output };
        command.Parameters.Add(resultCode); command.Parameters.Add(entitiesAffectedJson);
        await command.ExecuteNonQueryAsync(ct);
        return new AnonymizeGameAccountResult(
            Convert.ToString(resultCode.Value) ?? "MU_TRANSACTION_FAILED",
            entitiesAffectedJson.Value is DBNull ? null : Convert.ToString(entitiesAffectedJson.Value));
    }

    public async Task<PurgeGameAccountResult> PurgeGameAccountAsync(string legacyLogin, string betaCycleId, CancellationToken ct)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(ct);
        await using var command = new SqlCommand("dbo.bm_PurgeGameAccount", connection) { CommandType = CommandType.StoredProcedure, CommandTimeout = 20 };
        command.Parameters.Add(new SqlParameter("@LegacyLogin", SqlDbType.VarChar, 10) { Value = legacyLogin });
        command.Parameters.Add(new SqlParameter("@BetaCycleId", SqlDbType.VarChar, 80) { Value = betaCycleId });
        var resultCode = new SqlParameter("@ResultCode", SqlDbType.VarChar, 32) { Direction = ParameterDirection.Output };
        var tablesAffectedJson = new SqlParameter("@TablesAffectedJson", SqlDbType.NVarChar, -1) { Direction = ParameterDirection.Output };
        command.Parameters.Add(resultCode); command.Parameters.Add(tablesAffectedJson);
        await command.ExecuteNonQueryAsync(ct);
        return new PurgeGameAccountResult(
            Convert.ToString(resultCode.Value) ?? "MU_TRANSACTION_FAILED",
            tablesAffectedJson.Value is DBNull ? null : Convert.ToString(tablesAffectedJson.Value));
    }
}
