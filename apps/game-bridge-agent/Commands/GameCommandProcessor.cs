using System.Security.Cryptography;
using System.Text;
using BloodMoon.GameBridgeAgent.GameDatabase;

namespace BloodMoon.GameBridgeAgent.Commands;

public sealed class GameCommandProcessor(IGameDatabaseWriter writer, ProvisioningLedger ledger)
{
    public async Task<GameCommandResult> ExecuteAsync(CreateGameAccountCommand command, CancellationToken ct)
    {
        if (command.CommandType != "CREATE_GAME_ACCOUNT") throw new InvalidOperationException("COMMAND_TYPE_DENIED");
        if (!Guid.TryParse(command.CommandId, out _) || !Guid.TryParse(command.ProvisioningRequestId, out _)) throw new InvalidOperationException("INVALID_COMMAND_ID");
        if (string.IsNullOrWhiteSpace(command.LegacyLogin) || string.IsNullOrWhiteSpace(command.GameCredential) || command.LegacyLogin.Length is < 4 or > 10 || command.LegacyLogin.Any(c => !char.IsAsciiLetterOrDigit(c)) || command.GameCredential.Length is < 8 or > 10 || command.GameCredential.Any(c => !char.IsAsciiLetterOrDigit(c))) throw new InvalidOperationException("INVALID_PAYLOAD");
        var credentialHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(command.GameCredential)));
        var requestHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{command.CommandType}\n{command.ProvisioningRequestId}\n{command.LegacyLogin}\n{credentialHash}")));
        var begin = await ledger.BeginOrGetAsync(command, requestHash, ct);
        var existing = begin.Record;
        if (existing.Status == "SUCCEEDED") return new(command.CommandId, command.ProvisioningRequestId, "SUCCEEDED", existing.ResultCode!, existing.MembGuid, true);
        if (!begin.Acquired) throw new InvalidOperationException("COMMAND_IN_PROGRESS");
        var result = await writer.CreateGameAccountAsync(command.LegacyLogin, command.GameCredential, ct);
        if (result.ResultCode is not ("SUCCEEDED" or "SUCCEEDED_REPLAY") || result.MembGuid is null) throw new InvalidOperationException(result.ResultCode);
        await ledger.CompleteAsync(command.CommandId, result.ResultCode, result.MembGuid.Value, ct);
        return new(command.CommandId, command.ProvisioningRequestId, "SUCCEEDED", result.ResultCode, result.MembGuid, result.ResultCode == "SUCCEEDED_REPLAY");
    }

    // GameBridge extension plan Part 2/3. TargetLevel must be 1-3 -- GRANT_VIP
    // never lowers anyone to Free (that's SYNC_VIP_TIER's job, below). Not
    // executed against a real SQL Server this session (see
    // docs/environment/sql-server-test-environment.md); tested here against
    // the same fake-writer pattern CreateGameAccountAsync's tests already use.
    public async Task<VipLevelResult> ExecuteAsync(GrantVipCommand command, CancellationToken ct)
    {
        if (command.CommandType != "GRANT_VIP") throw new InvalidOperationException("COMMAND_TYPE_DENIED");
        if (!Guid.TryParse(command.CommandId, out _) || !Guid.TryParse(command.ProvisioningRequestId, out _)) throw new InvalidOperationException("INVALID_COMMAND_ID");
        if (!IsValidLegacyLogin(command.LegacyLogin) || command.TargetLevel is < 1 or > 3) throw new InvalidOperationException("INVALID_PAYLOAD");
        var requestHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{command.CommandType}\n{command.ProvisioningRequestId}\n{command.LegacyLogin}\n{command.TargetLevel}")));
        var begin = await ledger.BeginOrGetAsync(command, requestHash, ct);
        var existing = begin.Record;
        if (existing.Status == "SUCCEEDED") return VipResultFromLedger(command, existing, replayed: true);
        if (!begin.Acquired) throw new InvalidOperationException("COMMAND_IN_PROGRESS");
        var result = await writer.GrantVipAsync(command.LegacyLogin, command.TargetLevel, ct);
        if (result.ResultCode != "SUCCEEDED") throw new InvalidOperationException(result.ResultCode);
        var changed = result.PreviousLevel != result.NewLevel;
        await ledger.CompleteWithJsonAsync(command.CommandId, result.ResultCode, SerializeVipDetail(result.PreviousLevel, result.NewLevel, changed), ct);
        return new(command.CommandId, command.ProvisioningRequestId, "SUCCEEDED", result.ResultCode, result.PreviousLevel, result.NewLevel, changed, false);
    }

    // GameBridge extension plan Part 2/3B. DesiredLevel is 0-3 -- 0 is valid
    // and expected (this is how VIP expiry gets enforced by the reconciler).
    public async Task<VipLevelResult> ExecuteAsync(SyncVipTierCommand command, CancellationToken ct)
    {
        if (command.CommandType != "SYNC_VIP_TIER") throw new InvalidOperationException("COMMAND_TYPE_DENIED");
        if (!Guid.TryParse(command.CommandId, out _) || !Guid.TryParse(command.ProvisioningRequestId, out _)) throw new InvalidOperationException("INVALID_COMMAND_ID");
        if (!IsValidLegacyLogin(command.LegacyLogin) || command.DesiredLevel is < 0 or > 3) throw new InvalidOperationException("INVALID_PAYLOAD");
        var requestHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{command.CommandType}\n{command.ProvisioningRequestId}\n{command.LegacyLogin}\n{command.DesiredLevel}")));
        var begin = await ledger.BeginOrGetAsync(command, requestHash, ct);
        var existing = begin.Record;
        if (existing.Status == "SUCCEEDED") return VipResultFromLedger(command, existing, replayed: true);
        if (!begin.Acquired) throw new InvalidOperationException("COMMAND_IN_PROGRESS");
        var result = await writer.SyncVipTierAsync(command.LegacyLogin, command.DesiredLevel, ct);
        if (result.ResultCode != "SUCCEEDED") throw new InvalidOperationException(result.ResultCode);
        await ledger.CompleteWithJsonAsync(command.CommandId, result.ResultCode, SerializeVipDetail(result.PreviousLevel, result.NewLevel, result.Changed), ct);
        return new(command.CommandId, command.ProvisioningRequestId, "SUCCEEDED", result.ResultCode, result.PreviousLevel, result.NewLevel, result.Changed, false);
    }

    // GameBridge extension plan Part 2/4. No payload beyond identity.
    // ALREADY_ANONYMIZED is a success-shaped idempotent terminal state, not
    // an error -- the deterministic-tombstone design (Part 4) means a
    // second call finds the account already tombstoned.
    public async Task<AccountMutationResult> ExecuteAsync(AnonymizeGameAccountCommand command, CancellationToken ct)
    {
        if (command.CommandType != "ANONYMIZE_GAME_ACCOUNT") throw new InvalidOperationException("COMMAND_TYPE_DENIED");
        if (!Guid.TryParse(command.CommandId, out _) || !Guid.TryParse(command.ProvisioningRequestId, out _)) throw new InvalidOperationException("INVALID_COMMAND_ID");
        if (!IsValidLegacyLogin(command.LegacyLogin)) throw new InvalidOperationException("INVALID_PAYLOAD");
        var requestHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{command.CommandType}\n{command.ProvisioningRequestId}\n{command.LegacyLogin}")));
        var begin = await ledger.BeginOrGetAsync(command, requestHash, ct);
        var existing = begin.Record;
        if (existing.Status == "SUCCEEDED") return new(command.CommandId, command.ProvisioningRequestId, "SUCCEEDED", existing.ResultCode!, existing.ResultJson, true);
        if (!begin.Acquired) throw new InvalidOperationException("COMMAND_IN_PROGRESS");
        var result = await writer.AnonymizeGameAccountAsync(command.LegacyLogin, ct);
        if (result.ResultCode is not ("SUCCEEDED" or "ALREADY_ANONYMIZED")) throw new InvalidOperationException(result.ResultCode);
        await ledger.CompleteWithJsonAsync(command.CommandId, result.ResultCode, result.EntitiesAffectedJson, ct);
        return new(command.CommandId, command.ProvisioningRequestId, "SUCCEEDED", result.ResultCode, result.EntitiesAffectedJson, false);
    }

    // GameBridge extension plan Part 2/5. BetaCycleId required, never
    // inferred. ALREADY_PURGED mirrors ANONYMIZE's idempotent-success shape
    // -- a genuine DELETE is not naturally re-runnable, so the procedure
    // (Part 5) must recognize row-absence as success, not an error.
    public async Task<AccountMutationResult> ExecuteAsync(PurgeGameAccountCommand command, CancellationToken ct)
    {
        if (command.CommandType != "PURGE_GAME_ACCOUNT") throw new InvalidOperationException("COMMAND_TYPE_DENIED");
        if (!Guid.TryParse(command.CommandId, out _) || !Guid.TryParse(command.ProvisioningRequestId, out _)) throw new InvalidOperationException("INVALID_COMMAND_ID");
        if (!IsValidLegacyLogin(command.LegacyLogin) || string.IsNullOrWhiteSpace(command.BetaCycleId) || command.BetaCycleId.Length > 80) throw new InvalidOperationException("INVALID_PAYLOAD");
        var requestHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{command.CommandType}\n{command.ProvisioningRequestId}\n{command.LegacyLogin}\n{command.BetaCycleId}")));
        var begin = await ledger.BeginOrGetAsync(command, requestHash, ct);
        var existing = begin.Record;
        if (existing.Status == "SUCCEEDED") return new(command.CommandId, command.ProvisioningRequestId, "SUCCEEDED", existing.ResultCode!, existing.ResultJson, true);
        if (!begin.Acquired) throw new InvalidOperationException("COMMAND_IN_PROGRESS");
        var result = await writer.PurgeGameAccountAsync(command.LegacyLogin, command.BetaCycleId, ct);
        if (result.ResultCode is not ("SUCCEEDED" or "ALREADY_PURGED")) throw new InvalidOperationException(result.ResultCode);
        await ledger.CompleteWithJsonAsync(command.CommandId, result.ResultCode, result.TablesAffectedJson, ct);
        return new(command.CommandId, command.ProvisioningRequestId, "SUCCEEDED", result.ResultCode, result.TablesAffectedJson, false);
    }

    // Shared with CreateGameAccountAsync's own charset/length rule -- kept
    // identical, not redefined, so a legacyLogin valid for one operation is
    // valid (as far as C#-side validation goes) for all of them.
    private static bool IsValidLegacyLogin(string legacyLogin) =>
        !string.IsNullOrWhiteSpace(legacyLogin) && legacyLogin.Length is >= 4 and <= 10 && legacyLogin.All(char.IsAsciiLetterOrDigit);

    private static string SerializeVipDetail(int? previousLevel, int? newLevel, bool changed) =>
        $$"""{"previousLevel":{{previousLevel?.ToString() ?? "null"}},"newLevel":{{newLevel?.ToString() ?? "null"}},"changed":{{(changed ? "true" : "false")}}}""";

    private static VipLevelResult VipResultFromLedger(ICommandIdentity command, LedgerRecord existing, bool replayed)
    {
        // ResultJson round-trip is intentionally minimal (no JSON library
        // dependency for three known-shape numeric/bool fields) -- if this
        // parsing ever needs to be more robust, System.Text.Json is already
        // a transitive dependency via the Worker transport layer.
        int? previousLevel = null, newLevel = null; var changed = false;
        if (existing.ResultJson is { } json)
        {
            var doc = System.Text.Json.JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("previousLevel", out var p) && p.ValueKind == System.Text.Json.JsonValueKind.Number) previousLevel = p.GetInt32();
            if (doc.RootElement.TryGetProperty("newLevel", out var n) && n.ValueKind == System.Text.Json.JsonValueKind.Number) newLevel = n.GetInt32();
            if (doc.RootElement.TryGetProperty("changed", out var c)) changed = c.ValueKind == System.Text.Json.JsonValueKind.True;
        }
        return new(command.CommandId, command.ProvisioningRequestId, "SUCCEEDED", existing.ResultCode!, previousLevel, newLevel, changed, replayed);
    }
}
