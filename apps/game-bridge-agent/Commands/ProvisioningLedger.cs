using Microsoft.Data.Sqlite;

namespace BloodMoon.GameBridgeAgent.Commands;

public sealed class ProvisioningLedger(string path)
{
    private readonly string _cs = $"Data Source={path};Pooling=False";
    private static readonly TimeSpan ExecutionLease = TimeSpan.FromSeconds(30);

    public async Task InitializeAsync(CancellationToken ct)
    {
        var dir = Path.GetDirectoryName(path); if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
        await using var c = Open(); await using var cmd = c.CreateCommand(); cmd.CommandText = """
        CREATE TABLE IF NOT EXISTS provisioning_ledger(
          command_id TEXT PRIMARY KEY, provisioning_request_id TEXT NOT NULL UNIQUE,
          command_type TEXT NOT NULL, request_hash TEXT NOT NULL, status TEXT NOT NULL,
          result_code TEXT NULL, memb_guid INTEGER NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        """; await cmd.ExecuteNonQueryAsync(ct);
    }
    public async Task<LedgerBeginResult> BeginOrGetAsync(CreateGameAccountCommand command, string hash, CancellationToken ct)
    {
        await using var c = Open(); await using var tx = await c.BeginTransactionAsync(ct);
        var now = DateTimeOffset.UtcNow;
        int inserted;
        await using (var insert = c.CreateCommand()) { insert.Transaction = (SqliteTransaction)tx; insert.CommandText = "INSERT OR IGNORE INTO provisioning_ledger(command_id,provisioning_request_id,command_type,request_hash,status,created_at,updated_at) VALUES(@c,@p,@t,@h,'EXECUTING',@n,@n)"; insert.Parameters.AddWithValue("@c", command.CommandId); insert.Parameters.AddWithValue("@p", command.ProvisioningRequestId); insert.Parameters.AddWithValue("@t", command.CommandType); insert.Parameters.AddWithValue("@h", hash); insert.Parameters.AddWithValue("@n", now.ToString("O")); inserted = await insert.ExecuteNonQueryAsync(ct); }
        var rows = await ReadMatchingAsync(c, (SqliteTransaction)tx, command, ct);
        if (rows.Count != 1 || rows[0].CommandId != command.CommandId || rows[0].ProvisioningRequestId != command.ProvisioningRequestId || rows[0].RequestHash != hash) throw new InvalidOperationException("IDEMPOTENCY_CONFLICT");
        var acquired = inserted == 1;
        if (!acquired && rows[0].Status == "EXECUTING" && rows[0].UpdatedAt <= now - ExecutionLease)
        {
            await using var reclaim = c.CreateCommand(); reclaim.Transaction = (SqliteTransaction)tx; reclaim.CommandText = "UPDATE provisioning_ledger SET updated_at=@n WHERE command_id=@c AND status='EXECUTING' AND updated_at=@old"; reclaim.Parameters.AddWithValue("@n", now.ToString("O")); reclaim.Parameters.AddWithValue("@c", command.CommandId); reclaim.Parameters.AddWithValue("@old", rows[0].UpdatedAt.ToString("O")); acquired = await reclaim.ExecuteNonQueryAsync(ct) == 1;
            if (acquired) rows[0] = rows[0] with { UpdatedAt = now };
        }
        await tx.CommitAsync(ct);
        return new(rows[0], acquired);
    }
    public async Task CompleteAsync(string commandId, string code, int membGuid, CancellationToken ct) { await using var c = Open(); await using var cmd = c.CreateCommand(); cmd.CommandText = "UPDATE provisioning_ledger SET status='SUCCEEDED',result_code=@r,memb_guid=@m,updated_at=@u WHERE command_id=@c"; cmd.Parameters.AddWithValue("@r", code); cmd.Parameters.AddWithValue("@m", membGuid); cmd.Parameters.AddWithValue("@u", DateTimeOffset.UtcNow.ToString("O")); cmd.Parameters.AddWithValue("@c", commandId); await cmd.ExecuteNonQueryAsync(ct); }
    private SqliteConnection Open() { var c = new SqliteConnection(_cs); c.Open(); return c; }

    private static async Task<List<LedgerRecord>> ReadMatchingAsync(SqliteConnection c, SqliteTransaction tx, CreateGameAccountCommand command, CancellationToken ct)
    {
        await using var read = c.CreateCommand(); read.Transaction = tx; read.CommandText = "SELECT command_id,provisioning_request_id,request_hash,status,result_code,memb_guid,updated_at FROM provisioning_ledger WHERE command_id=@c OR provisioning_request_id=@p"; read.Parameters.AddWithValue("@c", command.CommandId); read.Parameters.AddWithValue("@p", command.ProvisioningRequestId); await using var r = await read.ExecuteReaderAsync(ct); var rows = new List<LedgerRecord>(); while (await r.ReadAsync(ct)) rows.Add(new(r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3), r.IsDBNull(4) ? null : r.GetString(4), r.IsDBNull(5) ? null : r.GetInt32(5), DateTimeOffset.Parse(r.GetString(6)))); return rows;
    }
}
