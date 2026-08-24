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
}
