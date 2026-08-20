using BloodMoon.GameBridgeAgent.Ingestion;
using Microsoft.Data.Sqlite;

namespace BloodMoon.GameBridgeAgent.Storage;

// Single local SQLite file backing three concerns that must move together:
// observed_state (last committed payload per tracked entity, for change
// detection), outbox (PENDING/SENT events -- the resend buffer) and
// agent_sequence (the monotonic, restart-safe sourceSequence counter). Each
// call opens and closes its own SqliteConnection rather than holding one
// open for the store's lifetime -- that is deliberate: it means a freshly
// constructed AgentLocalStore pointed at the same file sees exactly what was
// durably committed, which is what makes the crash-recovery test meaningful
// (see BloodMoon.GameBridgeAgent.Tests/AgentLocalStoreTests.cs).
public sealed class AgentLocalStore
{
    private readonly string _connectionString;
    private readonly int _pendingHardCap;

    public AgentLocalStore(string dbPath, int pendingHardCap)
    {
        var directory = Path.GetDirectoryName(dbPath);
        if (!string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(directory);
        }
        // Pooling=False: each call opens and closes its own connection (see
        // the class comment) -- with pooling on, Microsoft.Data.Sqlite can
        // keep a native handle open past Dispose(), which is both
        // unnecessary at this workload's scale and breaks the crash/restart
        // tests' ability to delete/reopen the file freely.
        _connectionString = $"Data Source={dbPath};Pooling=False";
        _pendingHardCap = pendingHardCap;
    }

    public async Task InitializeAsync(CancellationToken ct = default)
    {
        using var connection = OpenConnection();
        using var cmd = connection.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS observed_state (
                entity_key TEXT PRIMARY KEY,
                payload_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS outbox (
                event_id TEXT PRIMARY KEY,
                entity_key TEXT NOT NULL,
                event_type TEXT NOT NULL,
                schema_version INTEGER NOT NULL,
                source TEXT NOT NULL,
                server_id TEXT NOT NULL,
                source_sequence INTEGER NOT NULL,
                account_id TEXT NULL,
                character_id TEXT NULL,
                observed_at TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                sent_at TEXT NULL
            );
            CREATE TABLE IF NOT EXISTS agent_sequence (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                next_value INTEGER NOT NULL
            );
            INSERT OR IGNORE INTO agent_sequence (id, next_value) VALUES (1, 1);
            """;
        await cmd.ExecuteNonQueryAsync(ct);
    }

    public async Task<int> GetPendingCountAsync(CancellationToken ct = default)
    {
        using var connection = OpenConnection();
        using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM outbox WHERE status = 'PENDING'";
        return Convert.ToInt32(await cmd.ExecuteScalarAsync(ct));
    }

    public async Task<bool> IsBufferFullAsync(CancellationToken ct = default) =>
        await GetPendingCountAsync(ct) >= _pendingHardCap;

    public async Task<IReadOnlyDictionary<string, string>> GetObservedPayloadsAsync(CancellationToken ct = default)
    {
        using var connection = OpenConnection();
        using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT entity_key, payload_json FROM observed_state";
        using var reader = await cmd.ExecuteReaderAsync(ct);
        var result = new Dictionary<string, string>();
        while (await reader.ReadAsync(ct))
        {
            result[reader.GetString(0)] = reader.GetString(1);
        }
        return result;
    }

    // Buffer-full check and change persistence happen together, atomically,
    // per change: if the outbox is already at its hard cap, this rolls back
    // and skips that change entirely -- no sequence allocated, no outbox
    // row, no observed_state write. The change therefore stays detectable
    // on every subsequent poll (ChangeDetector will see the same diff again
    // against the untouched observed_state) until there is room to record
    // it for real. This is what guarantees BUFFER_FULL can delay a change
    // but never silently lose it.
    public async Task<IReadOnlyList<EventEnvelope>> TryRecordChangesAsync(
        IReadOnlyList<DetectedChange> changes,
        string source,
        string serverId,
        int schemaVersion,
        CancellationToken ct = default)
    {
        if (changes.Count == 0)
        {
            return Array.Empty<EventEnvelope>();
        }

        var persisted = new List<EventEnvelope>();
        using var connection = OpenConnection();
        foreach (var change in changes)
        {
            using var transaction = connection.BeginTransaction();
            try
            {
                var pendingCount = await ScalarLongAsync(connection, transaction, "SELECT COUNT(*) FROM outbox WHERE status = 'PENDING'", ct);
                if (pendingCount >= _pendingHardCap)
                {
                    transaction.Rollback();
                    continue;
                }

                var nextSequence = await ScalarLongAsync(connection, transaction, "SELECT next_value FROM agent_sequence WHERE id = 1", ct);

                using (var updateSeq = connection.CreateCommand())
                {
                    updateSeq.Transaction = transaction;
                    updateSeq.CommandText = "UPDATE agent_sequence SET next_value = @next WHERE id = 1";
                    updateSeq.Parameters.AddWithValue("@next", nextSequence + 1);
                    await updateSeq.ExecuteNonQueryAsync(ct);
                }

                var eventId = Guid.NewGuid().ToString("n");
                var observedAt = DateTimeOffset.UtcNow;
                var envelope = new EventEnvelope(
                    eventId, change.EventType, schemaVersion, source, serverId, nextSequence,
                    change.AccountId, change.CharacterId, observedAt, change.PayloadJson);

                using (var insertOutbox = connection.CreateCommand())
                {
                    insertOutbox.Transaction = transaction;
                    insertOutbox.CommandText = """
                        INSERT INTO outbox (event_id, entity_key, event_type, schema_version, source, server_id,
                            source_sequence, account_id, character_id, observed_at, payload_json, status, created_at, sent_at)
                        VALUES (@eventId, @entityKey, @eventType, @schemaVersion, @source, @serverId,
                            @sourceSequence, @accountId, @characterId, @observedAt, @payloadJson, 'PENDING', @createdAt, NULL)
                        """;
                    insertOutbox.Parameters.AddWithValue("@eventId", eventId);
                    insertOutbox.Parameters.AddWithValue("@entityKey", change.EntityKey);
                    insertOutbox.Parameters.AddWithValue("@eventType", change.EventType);
                    insertOutbox.Parameters.AddWithValue("@schemaVersion", schemaVersion);
                    insertOutbox.Parameters.AddWithValue("@source", source);
                    insertOutbox.Parameters.AddWithValue("@serverId", serverId);
                    insertOutbox.Parameters.AddWithValue("@sourceSequence", nextSequence);
                    insertOutbox.Parameters.AddWithValue("@accountId", (object?)change.AccountId ?? DBNull.Value);
                    insertOutbox.Parameters.AddWithValue("@characterId", (object?)change.CharacterId ?? DBNull.Value);
                    insertOutbox.Parameters.AddWithValue("@observedAt", observedAt.ToString("O"));
                    insertOutbox.Parameters.AddWithValue("@payloadJson", change.PayloadJson);
                    insertOutbox.Parameters.AddWithValue("@createdAt", DateTimeOffset.UtcNow.ToString("O"));
                    await insertOutbox.ExecuteNonQueryAsync(ct);
                }

                using (var upsertObserved = connection.CreateCommand())
                {
                    upsertObserved.Transaction = transaction;
                    upsertObserved.CommandText = """
                        INSERT INTO observed_state (entity_key, payload_json, updated_at)
                        VALUES (@entityKey, @payloadJson, @updatedAt)
                        ON CONFLICT(entity_key) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at
                        """;
                    upsertObserved.Parameters.AddWithValue("@entityKey", change.EntityKey);
                    upsertObserved.Parameters.AddWithValue("@payloadJson", change.PayloadJson);
                    upsertObserved.Parameters.AddWithValue("@updatedAt", DateTimeOffset.UtcNow.ToString("O"));
                    await upsertObserved.ExecuteNonQueryAsync(ct);
                }

                transaction.Commit();
                persisted.Add(envelope);
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        return persisted;
    }

    public async Task<IReadOnlyList<EventEnvelope>> GetPendingEventsAsync(CancellationToken ct = default)
    {
        using var connection = OpenConnection();
        using var cmd = connection.CreateCommand();
        cmd.CommandText = """
            SELECT event_id, event_type, schema_version, source, server_id, source_sequence,
                   account_id, character_id, observed_at, payload_json
            FROM outbox WHERE status = 'PENDING' ORDER BY source_sequence ASC
            """;
        using var reader = await cmd.ExecuteReaderAsync(ct);
        var result = new List<EventEnvelope>();
        while (await reader.ReadAsync(ct))
        {
            result.Add(new EventEnvelope(
                reader.GetString(0), reader.GetString(1), reader.GetInt32(2), reader.GetString(3), reader.GetString(4),
                reader.GetInt64(5), reader.IsDBNull(6) ? null : reader.GetString(6), reader.IsDBNull(7) ? null : reader.GetString(7),
                DateTimeOffset.Parse(reader.GetString(8)), reader.GetString(9)));
        }
        return result;
    }

    public async Task MarkSentAsync(string eventId, CancellationToken ct = default)
    {
        using var connection = OpenConnection();
        using var cmd = connection.CreateCommand();
        cmd.CommandText = "UPDATE outbox SET status = 'SENT', sent_at = @sentAt WHERE event_id = @eventId";
        cmd.Parameters.AddWithValue("@sentAt", DateTimeOffset.UtcNow.ToString("O"));
        cmd.Parameters.AddWithValue("@eventId", eventId);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    // Only SENT (terminal) rows are ever removed, and only past a retention
    // window. PENDING rows are never touched here, regardless of how full
    // the buffer is -- capacity pressure is handled entirely in
    // TryRecordChangesAsync, by refusing new work, never by discarding
    // undelivered work.
    public async Task<int> EvictSentOlderThanAsync(TimeSpan retention, CancellationToken ct = default)
    {
        var cutoff = DateTimeOffset.UtcNow - retention;
        using var connection = OpenConnection();
        using var cmd = connection.CreateCommand();
        cmd.CommandText = "DELETE FROM outbox WHERE status = 'SENT' AND sent_at < @cutoff";
        cmd.Parameters.AddWithValue("@cutoff", cutoff.ToString("O"));
        return await cmd.ExecuteNonQueryAsync(ct);
    }

    private SqliteConnection OpenConnection()
    {
        var connection = new SqliteConnection(_connectionString);
        connection.Open();
        return connection;
    }

    private static async Task<long> ScalarLongAsync(SqliteConnection connection, SqliteTransaction transaction, string sql, CancellationToken ct)
    {
        using var cmd = connection.CreateCommand();
        cmd.Transaction = transaction;
        cmd.CommandText = sql;
        return Convert.ToInt64(await cmd.ExecuteScalarAsync(ct));
    }
}
