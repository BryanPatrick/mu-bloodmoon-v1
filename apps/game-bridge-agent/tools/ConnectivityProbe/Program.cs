using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BloodMoon.GameBridgeAgent.GameDatabase;
using BloodMoon.GameBridgeAgent.Ingestion;
using BloodMoon.GameBridgeAgent.ReadModels;
using Microsoft.Data.SqlClient;

namespace BloodMoon.GameBridgeAgent.Tools.ConnectivityProbe;

// Phase 2C, Part G/H real-connectivity proof. Deliberately NOT the Agent
// itself -- a small, standalone harness that references the Agent's real
// SqlServerGameDatabaseReader/AccountSnapshotReader classes directly (no
// reimplementation), run once via the existing RemoteOps SSH channel, on
// the same VPS SQL Server already listens on (Server=localhost -- no
// tunnel, no new port, no firewall change).
//
// Input is a transient request file (deleted immediately after use, win
// or fail) containing {Database, Username, Password, MembGuid} -- the
// credential is decrypted locally by the RemoteOps driver script from the
// existing DPAPI-protected D:\MU\.secrets\sql-readonly.credential.xml and
// never appears on this process's command line or in any output here.
//
// Output is a single sanitized JSON line to stdout: no memb___id, no
// connection string, no raw exception text, no password/hash/email/IP.
// Character names are masked (first character + length) even though the
// request only requires masking as optional -- this project's standing
// practice is to default to the safer choice.
internal static class Program
{
    private static async Task<int> Main(string[] args)
    {
        if (args.Length != 1)
        {
            Console.Error.WriteLine("Usage: BloodMoonConnectivityProbe <request-file-path>");
            return 2;
        }

        var requestPath = args[0];
        ProbeRequest? request = null;
        try
        {
            var requestJson = await File.ReadAllTextAsync(requestPath);
            request = JsonSerializer.Deserialize<ProbeRequest>(requestJson, JsonOptions);
        }
        finally
        {
            // The request file carries a plaintext SQL credential -- delete
            // it immediately after reading, success or failure, mirroring
            // Invoke-SqlReadOnly.ps1's own Remove-RequestFile pattern.
            TryDelete(requestPath);
        }

        if (request is null || string.IsNullOrWhiteSpace(request.Database) ||
            string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            Console.Error.WriteLine("Invalid or incomplete probe request.");
            return 2;
        }

        var connectionString =
            $"Server=localhost;Database={request.Database};User ID={request.Username};Password={request.Password};" +
            "Encrypt=False;Connect Timeout=8;Application Name=BloodMoonGameBridgeConnectivityProbe";

        var result = new ProbeResult();
        try
        {
            // Step 1 (Part G): minimal scalar probe via the Agent's own
            // Microsoft.Data.SqlClient package -- proves the real ADO.NET
            // client, not bm-sql/System.Data.SqlClient, opens a real
            // connection.
            await using (var connection = new SqlConnection(connectionString))
            {
                await connection.OpenAsync();
                await using var command = connection.CreateCommand();
                command.CommandText = "SELECT 1";
                var scalar = await command.ExecuteScalarAsync();
                result.SqlClientConnection = Convert.ToInt32(scalar) == 1 ? "PASS" : "FAIL";
            }

            // Step 2 (Part H): the real reader/orchestration, unmodified.
            var reader = new SqlServerGameDatabaseReader(connectionString);
            var snapshotReader = new AccountSnapshotReader(reader);
            var snapshot = await snapshotReader.GetAccountSnapshotAsync(request.MembGuid, CancellationToken.None);

            result.SnapshotStatus = snapshot.Status.ToString();
            if (snapshot.Status == AccountSnapshotResult.ResultStatus.Ok && snapshot.Model is { } model)
            {
                result.AccountId = model.AccountId;
                result.Online = model.Online;
                result.ActiveCharacterMasked = Mask(model.ActiveCharacterName);
                result.CashShopPresent = model.CashShop is not null;
                result.WarehouseMoney = model.WarehouseMoney;
                result.Characters = model.Characters.Select(c => new ProbeCharacter
                {
                    Slot = c.Slot,
                    NameMasked = Mask(c.Name),
                    Class = c.Class,
                    Level = c.Level,
                    ResetCount = c.ResetCount,
                    MasterLevel = c.MasterLevel,
                    GuildPresent = c.Guild is not null,
                    HasAnyRanking = c.Rankings.BloodCastle is not null || c.Rankings.DevilSquare is not null ||
                                    c.Rankings.ChaosCastle is not null || c.Rankings.CastleSiege is not null ||
                                    c.Rankings.Duel is not null
                }).ToList();

                // Part J: prove the real snapshot is deterministic without
                // re-exposing unmasked data in this output -- only a hash
                // of the exact same PayloadJson the real
                // AccountSnapshotChangeFactory/ChangeDetector pipeline
                // would compare. Two independent real reads of unchanged
                // DB state must produce the same hash.
                var change = AccountSnapshotChangeFactory.ToDetectedChange(model);
                result.EntityKey = change.EntityKey;
                result.PayloadSha256 = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(change.PayloadJson))).ToLowerInvariant();

                // Phase 2D Parts G-Q: real Cloudflare proof, only attempted
                // when the request actually carries Worker/auth fields
                // (Phase 2C's SQL-only requests omit them entirely).
                if (!string.IsNullOrWhiteSpace(request.WorkerBaseUrl) &&
                    !string.IsNullOrWhiteSpace(request.AgentId) &&
                    !string.IsNullOrWhiteSpace(request.HmacSecret))
                {
                    await CloudflarePhase.RunAsync(request, model, result);
                }
            }
            else if (snapshot.Status == AccountSnapshotResult.ResultStatus.Inconsistent)
            {
                result.InconsistencyReason = snapshot.InconsistencyReason;
            }

            result.Overall = "PASS";
        }
        catch (Exception ex)
        {
            // Deliberately only the exception TYPE and a short, generic
            // message -- never ex.ToString() or the connection string,
            // which some driver paths can echo in full.
            result.Overall = "FAIL";
            result.ErrorType = ex.GetType().Name;
            result.ErrorMessage = SanitizeErrorMessage(ex.Message);
        }

        Console.WriteLine(JsonSerializer.Serialize(result, JsonOptions));
        return result.Overall == "PASS" ? 0 : 1;
    }

    private static string? Mask(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return value;
        }
        return value[0] + new string('*', Math.Max(0, value.Length - 1)) + $" (len={value.Length})";
    }

    private static string SanitizeErrorMessage(string message)
    {
        // Defense in depth: never let a stray "Password=" fragment escape,
        // even though SqlClient/SqlException do not normally include the
        // connection string's credential in their own Message text.
        return message.Contains("Password", StringComparison.OrdinalIgnoreCase)
            ? "[redacted -- message referenced connection credentials]"
            : message;
    }

    private static void TryDelete(string path)
    {
        try
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch
        {
            // Best-effort cleanup only -- never let cleanup failure mask
            // the real probe result.
        }
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };
}

internal sealed class ProbeRequest
{
    public string Database { get; set; } = "";
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public int MembGuid { get; set; }

    // Phase 2D: present only when the real Cloudflare phase should also
    // run. HmacSecret is transient exactly like Password above -- never
    // logged, never appears on this process's command line.
    public string? WorkerBaseUrl { get; set; }
    public string? AgentId { get; set; }
    public string? HmacSecret { get; set; }
    public string? ServerId { get; set; }
}

internal sealed class ProbeResult
{
    public string Overall { get; set; } = "UNKNOWN";
    public string? SqlClientConnection { get; set; }
    public string? SnapshotStatus { get; set; }
    public int? AccountId { get; set; }
    public bool? Online { get; set; }
    public string? ActiveCharacterMasked { get; set; }
    public bool? CashShopPresent { get; set; }
    public int? WarehouseMoney { get; set; }
    public List<ProbeCharacter>? Characters { get; set; }
    public string? EntityKey { get; set; }
    public string? PayloadSha256 { get; set; }
    public string? InconsistencyReason { get; set; }
    public string? ErrorType { get; set; }
    public string? ErrorMessage { get; set; }

    // Phase 2D: real Cloudflare proof results.
    public string? HeartbeatSent { get; set; }
    public string? EventSent { get; set; }
    public string? EventId { get; set; }
    public long? EventSourceSequence { get; set; }
    public string? DedupeTest { get; set; }
    public string? NonceReplayTest { get; set; }
    public string? SequenceGuardEventAccepted { get; set; }
}

internal sealed class ProbeCharacter
{
    public int Slot { get; set; }
    public string? NameMasked { get; set; }
    public int Class { get; set; }
    public int Level { get; set; }
    public int ResetCount { get; set; }
    public int? MasterLevel { get; set; }
    public bool GuildPresent { get; set; }
    public bool HasAnyRanking { get; set; }
}
