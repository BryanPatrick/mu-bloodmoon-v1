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
}
