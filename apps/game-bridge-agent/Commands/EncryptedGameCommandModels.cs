using System.Text.Json.Serialization;

namespace BloodMoon.GameBridgeAgent.Commands;

public sealed record EncryptedCredentialEnvelope(
    [property: JsonPropertyName("ciphertext")] string Ciphertext,
    [property: JsonPropertyName("nonce")] string Nonce,
    [property: JsonPropertyName("tag")] string Tag,
    [property: JsonPropertyName("keyVersion")] string KeyVersion,
    [property: JsonPropertyName("algorithm")] string Algorithm);

public sealed record ClaimedGameCommand(
    string CommandId, string ProvisioningRequestId, string CommandType,
    string Environment, string ServerId, string LegacyLogin, DateTimeOffset ExpiresAt,
    int AttemptCount, DateTimeOffset LeaseUntil, EncryptedCredentialEnvelope Credential);

public sealed record ClaimResponse(IReadOnlyList<ClaimedGameCommand> Commands, DateTimeOffset ServerTime);
public sealed record CommandResultReport(string CommandId, string ProvisioningRequestId, string Status,
    string ResultCode, int? MembGuid);
