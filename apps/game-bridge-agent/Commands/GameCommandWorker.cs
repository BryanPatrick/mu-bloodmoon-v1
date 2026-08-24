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

    public async Task ExecuteClaimedAsync(ClaimedGameCommand command, CancellationToken ct)
    {
        CommandResultReport report;
        if (command.Environment != _options.CommandEnvironment || command.ServerId != _options.ServerId)
            report = Failure(command, "FAILED_FINAL", "AGENT_SCOPE_DENIED");
        else if (command.ExpiresAt <= DateTimeOffset.UtcNow)
            report = Failure(command, "FAILED_FINAL", "COMMAND_EXPIRED");
        else if (command.CommandType != "CREATE_GAME_ACCOUNT")
            report = Failure(command, "FAILED_FINAL", "COMMAND_TYPE_DENIED");
        else
            report = await ExecuteWriteAsync(command, ct);

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

    private async Task<CommandResultReport> ExecuteWriteAsync(ClaimedGameCommand command, CancellationToken ct)
    {
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
        catch (InvalidOperationException ex) when (ex.Message == "COMMAND_IN_PROGRESS")
        {
            return Failure(command, "FAILED_RETRYABLE", "COMMAND_IN_PROGRESS");
        }
        catch (InvalidOperationException ex) when (ex.Message is "IDEMPOTENCY_CONFLICT" or "INVALID_COMMAND_ID" or "INVALID_PAYLOAD" or "COMMAND_TYPE_DENIED" or "LEGACY_LOGIN_COLLISION")
        {
            return Failure(command, "FAILED_FINAL", ex.Message);
        }
        catch (SqlException)
        {
            return Failure(command, "FAILED_RETRYABLE", "SQL_UNAVAILABLE");
        }
        catch
        {
            return Failure(command, "FAILED_RETRYABLE", "EXECUTION_UNAVAILABLE");
        }
        finally
        {
            if (credentialBytes is not null) CryptographicOperations.ZeroMemory(credentialBytes);
        }
    }

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
