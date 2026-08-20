namespace BloodMoon.GameBridgeAgent.Ingestion;

// receivedAt is deliberately absent -- Cloudflare assigns it, never trusted
// from the Agent. observedAt (not "occurredAt"): this phase infers change
// through polling, not a real event timestamp from the game, and the field
// name says so honestly. sourceSequence is scoped to (source, serverId) --
// see docs/game-data/architecture.md.
public sealed record EventEnvelope(
    string EventId,
    string EventType,
    int SchemaVersion,
    string Source,
    string ServerId,
    long SourceSequence,
    string? AccountId,
    string? CharacterId,
    DateTimeOffset ObservedAt,
    string PayloadJson
);
