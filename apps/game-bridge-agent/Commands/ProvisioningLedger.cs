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
          result_code TEXT NULL, memb_guid INTEGER NULL, result_json TEXT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        """; await cmd.ExecuteNonQueryAsync(ct);
        // GameBridge extension plan Part 8: existing ledger files (fresh on
        // this dev machine, but this guards any real deployed file too)
        // predate result_json -- add it if missing rather than assuming a
        // fresh CREATE TABLE always ran. Swallowed if the column already
        // exists (SQLite has no ADD COLUMN IF NOT EXISTS in the bundled
        // provider version used here).
        try { await using var alter = c.CreateCommand(); alter.CommandText = "ALTER TABLE provisioning_ledger ADD COLUMN result_json TEXT NULL"; await alter.ExecuteNonQueryAsync(ct); } catch (SqliteException) { }
    }

    // GameBridge extension plan Part 1/8. Generalized from
    // BeginOrGetAsync(CreateGameAccountCommand, ...) to any ICommandIdentity
    // so GRANT_VIP/SYNC_VIP_TIER/ANONYMIZE_GAME_ACCOUNT/PURGE_GAME_ACCOUNT
    // share the exact same crash-safe idempotency ledger CREATE_GAME_ACCOUNT
    // already proved, rather than each needing its own sibling ledger.
    public async Task<LedgerBeginResult> BeginOrGetAsync(ICommandIdentity command, string hash, CancellationToken ct)
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

    // GameBridge extension plan Part 8 -- the generic completion path for
    // GRANT_VIP/SYNC_VIP_TIER/ANONYMIZE/PURGE, which report a JSON-shaped
    // result rather than a single membGuid int.
    public async Task CompleteWithJsonAsync(string commandId, string code, string? resultJson, CancellationToken ct) { await using var c = Open(); await using var cmd = c.CreateCommand(); cmd.CommandText = "UPDATE provisioning_ledger SET status='SUCCEEDED',result_code=@r,result_json=@j,updated_at=@u WHERE command_id=@c"; cmd.Parameters.AddWithValue("@r", code); cmd.Parameters.AddWithValue("@j", (object?)resultJson ?? DBNull.Value); cmd.Parameters.AddWithValue("@u", DateTimeOffset.UtcNow.ToString("O")); cmd.Parameters.AddWithValue("@c", commandId); await cmd.ExecuteNonQueryAsync(ct); }
    private SqliteConnection Open() { var c = new SqliteConnection(_cs); c.Open(); return c; }

    private static async Task<List<LedgerRecord>> ReadMatchingAsync(SqliteConnection c, SqliteTransaction tx, ICommandIdentity command, CancellationToken ct)
    {
        await using var read = c.CreateCommand(); read.Transaction = tx; read.CommandText = "SELECT command_id,provisioning_request_id,request_hash,status,result_code,memb_guid,result_json,updated_at FROM provisioning_ledger WHERE command_id=@c OR provisioning_request_id=@p"; read.Parameters.AddWithValue("@c", command.CommandId); read.Parameters.AddWithValue("@p", command.ProvisioningRequestId); await using var r = await read.ExecuteReaderAsync(ct); var rows = new List<LedgerRecord>(); while (await r.ReadAsync(ct)) rows.Add(new(r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3), r.IsDBNull(4) ? null : r.GetString(4), r.IsDBNull(5) ? null : r.GetInt32(5), r.IsDBNull(6) ? null : r.GetString(6), DateTimeOffset.Parse(r.GetString(7)))); return rows;
    }
}
