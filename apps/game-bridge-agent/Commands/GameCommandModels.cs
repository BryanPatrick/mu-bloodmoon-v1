namespace BloodMoon.GameBridgeAgent.Commands;

// Shared identity every command family carries -- lets ProvisioningLedger stay
// generic across command types instead of hardcoding CreateGameAccountCommand.
// GameBridge extension plan (docs/gamebridge/gamebridge-agent-extension-plan.md)
// Part 1/8: the ledger schema itself was already command_type-agnostic; only
// the C# model layer was CREATE_GAME_ACCOUNT-specific until this change.
public interface ICommandIdentity
{
    string CommandId { get; }
    string ProvisioningRequestId { get; }
    string CommandType { get; }
    string LegacyLogin { get; }
}

public sealed record CreateGameAccountCommand(string CommandId, string ProvisioningRequestId, string CommandType, string LegacyLogin, string GameCredential) : ICommandIdentity;
public sealed record GameCommandResult(string CommandId, string ProvisioningRequestId, string Status, string ResultCode, int? MembGuid, bool Replayed);
public sealed record LedgerRecord(string CommandId, string ProvisioningRequestId, string RequestHash, string Status, string? ResultCode, int? MembGuid, string? ResultJson, DateTimeOffset UpdatedAt);
public sealed record LedgerBeginResult(LedgerRecord Record, bool Acquired);

// Plan Part 2/3 -- GRANT_VIP: commercial delivery record, MAX()-idempotent,
// never a downgrade. TargetLevel is always 1-3 (never 0 -- see Part 3).
public sealed record GrantVipCommand(string CommandId, string ProvisioningRequestId, string CommandType, string LegacyLogin, int TargetLevel) : ICommandIdentity;
public sealed record VipLevelResult(string CommandId, string ProvisioningRequestId, string Status, string ResultCode, int? PreviousLevel, int? NewLevel, bool Changed, bool Replayed);

// Plan Part 2/3B -- SYNC_VIP_TIER: desired-state sync, DesiredLevel is 0-3
// (0 is valid and expected -- this is how expiry gets enforced).
public sealed record SyncVipTierCommand(string CommandId, string ProvisioningRequestId, string CommandType, string LegacyLogin, int DesiredLevel) : ICommandIdentity;

// Plan Part 2/4 -- ANONYMIZE_GAME_ACCOUNT: no payload beyond identity.
public sealed record AnonymizeGameAccountCommand(string CommandId, string ProvisioningRequestId, string CommandType, string LegacyLogin) : ICommandIdentity;

// Plan Part 2/5 -- PURGE_GAME_ACCOUNT: BetaCycleId required, never inferred.
public sealed record PurgeGameAccountCommand(string CommandId, string ProvisioningRequestId, string CommandType, string LegacyLogin, string BetaCycleId) : ICommandIdentity;

// Shared result shape for ANONYMIZE/PURGE -- DetailJson carries the
// per-entity/per-table affected-count map (Part 6/10), never the removed
// data itself (Part 11 data-minimization principle).
public sealed record AccountMutationResult(string CommandId, string ProvisioningRequestId, string Status, string ResultCode, string? DetailJson, bool Replayed);
