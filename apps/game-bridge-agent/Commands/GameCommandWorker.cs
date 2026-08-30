using System.Security.Cryptography;
using System.Text;
using BloodMoon.GameBridgeAgent.Configuration;
using BloodMoon.GameBridgeAgent.Transport;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BloodMoon.GameBridgeAgent.Commands;

// Outbound HTTPS only. A failed result submission intentionally leaves the
// D1 lease to expire; reclaim + the persistent execution ledger recovers the
// prior result without a duplicate MU write.
public sealed class GameCommandWorker(
    IGameCommandTransport transport,
    GameCommandProcessor processor,
    ProvisioningLedger ledger,
    GameCredentialDecryptor decryptor,
    IOptions<AgentOptions> options,
    ILogger<GameCommandWorker> logger) : BackgroundService
{
    private readonly AgentOptions _options = options.Value;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await ledger.InitializeAsync(stoppingToken);
        var failures = 0;
        while (!stoppingToken.IsCancellationRequested)
        {
            var hadWork = false;
            try
            {
                if (string.IsNullOrWhiteSpace(_options.CommandHmacSecret))
                {
                    await Delay(TimeSpan.FromSeconds(_options.CommandMaxBackoffSeconds), stoppingToken);
                    continue;
                }
                var claim = await transport.ClaimAsync(_options.CommandEnvironment, _options.ServerId, 1, stoppingToken);
                foreach (var command in claim.Commands)
                {
                    hadWork = true;
                    await ExecuteClaimedAsync(command, stoppingToken);
                }
                failures = 0;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                failures++;
                logger.LogWarning("Command transport unavailable ({FailureType}); retrying with backoff.", ex.GetType().Name);
            }
            var normal = hadWork ? 1 : Math.Max(5, _options.CommandPollIntervalSeconds);
            var backoff = failures == 0 ? normal : Math.Min(_options.CommandMaxBackoffSeconds, normal * (1 << Math.Min(failures, 5)));
            var jitter = Random.Shared.NextDouble() * Math.Max(1, backoff * 0.2);
            await Delay(TimeSpan.FromSeconds(backoff + jitter), stoppingToken);
        }
    }

    // GameBridge extension plan Part 1/2/14. Dispatches on CommandType to
    // one of five allowlisted operations -- anything else is
    // FAILED_FINAL COMMAND_TYPE_DENIED, exactly as CREATE_GAME_ACCOUNT
    // alone was before this change. Each of the four new types has its own
    // independent kill switch (Part 14), checked before the writer is ever
    // touched -- a disabled type reports FAILED_FINAL COMMAND_TYPE_DISABLED,
    // distinct from COMMAND_TYPE_DENIED, so an operator can tell "not
    // supported" from "supported but paused."
    public async Task ExecuteClaimedAsync(ClaimedGameCommand command, CancellationToken ct)
    {
        CommandResultReport report;
        if (command.Environment != _options.CommandEnvironment || command.ServerId != _options.ServerId)
            report = Failure(command, "FAILED_FINAL", "AGENT_SCOPE_DENIED");
        else if (command.ExpiresAt <= DateTimeOffset.UtcNow)
            report = Failure(command, "FAILED_FINAL", "COMMAND_EXPIRED");
        else
            report = command.CommandType switch
            {
                "CREATE_GAME_ACCOUNT" => await ExecuteCreateGameAccountAsync(command, ct),
                "GRANT_VIP" => !_options.GrantVipEnabled ? Failure(command, "FAILED_FINAL", "COMMAND_TYPE_DISABLED") : await ExecuteGrantVipAsync(command, ct),
                "SYNC_VIP_TIER" => !_options.SyncVipTierEnabled ? Failure(command, "FAILED_FINAL", "COMMAND_TYPE_DISABLED") : await ExecuteSyncVipTierAsync(command, ct),
                "ANONYMIZE_GAME_ACCOUNT" => !_options.AnonymizeEnabled ? Failure(command, "FAILED_FINAL", "COMMAND_TYPE_DISABLED") : await ExecuteAnonymizeAsync(command, ct),
                "PURGE_GAME_ACCOUNT" => !_options.PurgeEnabled ? Failure(command, "FAILED_FINAL", "COMMAND_TYPE_DISABLED") : await ExecutePurgeAsync(command, ct),
                _ => Failure(command, "FAILED_FINAL", "COMMAND_TYPE_DENIED")
            };

        try
        {
            await transport.ReportAsync(report, ct);
            logger.LogInformation("Game command {CommandId} reported as {Status} ({ResultCode}).", command.CommandId, report.Status, report.ResultCode);
        }
        catch (Exception ex)
        {
            logger.LogWarning("Result delivery for command {CommandId} failed ({FailureType}); lease recovery will retry.", command.CommandId, ex.GetType().Name);
        }
    }

    private async Task<CommandResultReport> ExecuteCreateGameAccountAsync(ClaimedGameCommand command, CancellationToken ct)
    {
        if (command.Credential is null) return Failure(command, "FAILED_FINAL", "INVALID_PAYLOAD");
        byte[]? credentialBytes = null;
        try
        {
            credentialBytes = decryptor.Decrypt(command);
            var credential = Encoding.ASCII.GetString(credentialBytes);
            var result = await processor.ExecuteAsync(new CreateGameAccountCommand(
                command.CommandId, command.ProvisioningRequestId, command.CommandType, command.LegacyLogin, credential), ct);
            return new(command.CommandId, command.ProvisioningRequestId, "SUCCEEDED", result.ResultCode, result.MembGuid);
        }
        catch (CryptographicException ex)
        {
            return Failure(command, "FAILED_FINAL", SafeCryptoCode(ex.Message));
        }
        catch (Exception ex)
        {
            return ClassifyFailure(command, ex);
        }
        finally
        {
            if (credentialBytes is not null) CryptographicOperations.ZeroMemory(credentialBytes);
        }
    }

    private async Task<CommandResultReport> ExecuteGrantVipAsync(ClaimedGameCommand command, CancellationToken ct)
    {
        try
        {
            if (!TryGetPayloadInt(command.Payload, "targetLevel", out var targetLevel)) return Failure(command, "FAILED_FINAL", "INVALID_PAYLOAD");
            var result = await processor.ExecuteAsync(new GrantVipCommand(
                command.CommandId, command.ProvisioningRequestId, command.CommandType, command.LegacyLogin, targetLevel), ct);
            return new(command.CommandId, command.ProvisioningRequestId, "SUCCEEDED", result.ResultCode, null,
                VipDetailJson(result.PreviousLevel, result.NewLevel, result.Changed));
        }
        catch (Exception ex) { return ClassifyFailure(command, ex); }
    }

    private async Task<CommandResultReport> ExecuteSyncVipTierAsync(ClaimedGameCommand command, CancellationToken ct)
    {
        try
        {
            if (!TryGetPayloadInt(command.Payload, "desiredLevel", out var desiredLevel)) return Failure(command, "FAILED_FINAL", "INVALID_PAYLOAD");
            var result = await processor.ExecuteAsync(new SyncVipTierCommand(
                command.CommandId, command.ProvisioningRequestId, command.CommandType, command.LegacyLogin, desiredLevel), ct);
            return new(command.CommandId, command.ProvisioningRequestId, "SUCCEEDED", result.ResultCode, null,
                VipDetailJson(result.PreviousLevel, result.NewLevel, result.Changed));
        }
        catch (Exception ex) { return ClassifyFailure(command, ex); }
    }

    private async Task<CommandResultReport> ExecuteAnonymizeAsync(ClaimedGameCommand command, CancellationToken ct)
    {
        try
        {
            var result = await processor.ExecuteAsync(new AnonymizeGameAccountCommand(
                command.CommandId, command.ProvisioningRequestId, command.CommandType, command.LegacyLogin), ct);
            return new(command.CommandId, command.ProvisioningRequestId, "SUCCEEDED", result.ResultCode, null, result.DetailJson);
        }
        catch (Exception ex) { return ClassifyFailure(command, ex); }
    }

    private async Task<CommandResultReport> ExecutePurgeAsync(ClaimedGameCommand command, CancellationToken ct)
    {
        try
        {
            if (!TryGetPayloadString(command.Payload, "betaCycleId", out var betaCycleId)) return Failure(command, "FAILED_FINAL", "INVALID_PAYLOAD");
            var result = await processor.ExecuteAsync(new PurgeGameAccountCommand(
                command.CommandId, command.ProvisioningRequestId, command.CommandType, command.LegacyLogin, betaCycleId), ct);
            return new(command.CommandId, command.ProvisioningRequestId, "SUCCEEDED", result.ResultCode, null, result.DetailJson);
        }
        catch (Exception ex) { return ClassifyFailure(command, ex); }
    }

    // Shared failure classification for the four new operations -- same
    // taxonomy ExecuteCreateGameAccountAsync already used inline
    // (COMMAND_IN_PROGRESS/IDEMPOTENCY_CONFLICT/etc. are FAILED_FINAL or
    // FAILED_RETRYABLE per the same rules), pulled into one place now that
    // five call sites share it instead of one.
    private static CommandResultReport ClassifyFailure(ClaimedGameCommand command, Exception ex) => ex switch
    {
        InvalidOperationException { Message: "COMMAND_IN_PROGRESS" } => Failure(command, "FAILED_RETRYABLE", "COMMAND_IN_PROGRESS"),
        InvalidOperationException e when e.Message is "IDEMPOTENCY_CONFLICT" or "INVALID_COMMAND_ID" or "INVALID_PAYLOAD" or "COMMAND_TYPE_DENIED"
            or "LEGACY_LOGIN_COLLISION" or "ACCOUNT_NOT_FOUND" or "STAFF_ACCOUNT_REJECTED" => Failure(command, "FAILED_FINAL", e.Message),
        SqlException => Failure(command, "FAILED_RETRYABLE", "SQL_UNAVAILABLE"),
        _ => Failure(command, "FAILED_RETRYABLE", "EXECUTION_UNAVAILABLE")
    };

    private static bool TryGetPayloadInt(System.Text.Json.JsonElement? payload, string property, out int value)
    {
        value = 0;
        if (payload is not { } p || p.ValueKind != System.Text.Json.JsonValueKind.Object) return false;
        if (!p.TryGetProperty(property, out var el) || el.ValueKind != System.Text.Json.JsonValueKind.Number) return false;
        return el.TryGetInt32(out value);
    }

    private static bool TryGetPayloadString(System.Text.Json.JsonElement? payload, string property, out string value)
    {
        value = "";
        if (payload is not { } p || p.ValueKind != System.Text.Json.JsonValueKind.Object) return false;
        if (!p.TryGetProperty(property, out var el) || el.ValueKind != System.Text.Json.JsonValueKind.String) return false;
        value = el.GetString() ?? "";
        return !string.IsNullOrWhiteSpace(value);
    }

    private static string VipDetailJson(int? previousLevel, int? newLevel, bool changed) =>
        $$"""{"previousLevel":{{previousLevel?.ToString() ?? "null"}},"newLevel":{{newLevel?.ToString() ?? "null"}},"changed":{{(changed ? "true" : "false")}}}""";

    private static CommandResultReport Failure(ClaimedGameCommand c, string status, string code) =>
        new(c.CommandId, c.ProvisioningRequestId, status, code, null);

    private static string SafeCryptoCode(string message) => message switch
    {
        "CREDENTIAL_ALGORITHM_UNSUPPORTED" => message,
        "CREDENTIAL_KEY_VERSION_UNAVAILABLE" => message,
        "CREDENTIAL_KEYRING_UNAVAILABLE" => message,
        _ => "CREDENTIAL_DECRYPT_FAILED"
    };

    private static async Task Delay(TimeSpan delay, CancellationToken ct)
    {
        try { await Task.Delay(delay, ct); } catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
    }
}
