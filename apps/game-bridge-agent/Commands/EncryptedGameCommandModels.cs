using System.Text.Json.Serialization;

namespace BloodMoon.GameBridgeAgent.Commands;

public sealed record EncryptedCredentialEnvelope(
    [property: JsonPropertyName("ciphertext")] string Ciphertext,
    [property: JsonPropertyName("nonce")] string Nonce,
    [property: JsonPropertyName("tag")] string Tag,
    [property: JsonPropertyName("keyVersion")] string KeyVersion,
    [property: JsonPropertyName("algorithm")] string Algorithm);

// GameBridge extension plan Part 1/2: Credential is now nullable (only
// CREATE_GAME_ACCOUNT carries one -- GRANT_VIP/SYNC_VIP_TIER/ANONYMIZE/PURGE
// carry no secret at all, per the plan's "never in payload" rule) and
// Payload is the new generic slot for the other four command types'
// type-specific fields (targetLevel/desiredLevel/betaCycleId). Left as a
// raw JsonElement rather than a fixed C# shape here -- GameCommandWorker
// parses it into the right typed Commands.* record per CommandType, the
// same way GameCommandProcessor already validates strictly per type.
public sealed record ClaimedGameCommand(
    string CommandId, string ProvisioningRequestId, string CommandType,
    string Environment, string ServerId, string LegacyLogin, DateTimeOffset ExpiresAt,
    int AttemptCount, DateTimeOffset LeaseUntil, EncryptedCredentialEnvelope? Credential,
    System.Text.Json.JsonElement? Payload = null);

public sealed record ClaimResponse(IReadOnlyList<ClaimedGameCommand> Commands, DateTimeOffset ServerTime);

// DetailJson is the generic result carrier for GRANT_VIP/SYNC_VIP_TIER
// (previousLevel/newLevel/changed) and ANONYMIZE/PURGE (entities/tables
// affected) -- MembGuid stays for CREATE_GAME_ACCOUNT's own specific shape,
// unchanged, so the Worker's existing CREATE_GAME_ACCOUNT-only D1 columns
// and validation (Part 1/7/13's identified real schema-migration work)
// don't need every command type to share one column shape.
public sealed record CommandResultReport(string CommandId, string ProvisioningRequestId, string Status,
    string ResultCode, int? MembGuid, string? DetailJson = null);
