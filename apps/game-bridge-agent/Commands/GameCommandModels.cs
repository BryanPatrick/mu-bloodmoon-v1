namespace BloodMoon.GameBridgeAgent.Commands;

public sealed record CreateGameAccountCommand(string CommandId, string ProvisioningRequestId, string CommandType, string LegacyLogin, string GameCredential);
public sealed record GameCommandResult(string CommandId, string ProvisioningRequestId, string Status, string ResultCode, int? MembGuid, bool Replayed);
public sealed record LedgerRecord(string CommandId, string ProvisioningRequestId, string RequestHash, string Status, string? ResultCode, int? MembGuid, DateTimeOffset UpdatedAt);
public sealed record LedgerBeginResult(LedgerRecord Record, bool Acquired);
