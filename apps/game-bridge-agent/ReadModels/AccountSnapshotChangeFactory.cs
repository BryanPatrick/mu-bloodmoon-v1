using BloodMoon.GameBridgeAgent.Ingestion;

namespace BloodMoon.GameBridgeAgent.ReadModels;

// Proves the real account snapshot reader can feed the existing Phase 1
// change-detection pipeline (ChangeDetector/AgentLocalStore), unchanged --
// see AgentWorkerTests / the Phase 2B integration test. Not wired into
// AgentWorker's continuous poll loop this phase (there is no "which
// accounts to track" concept yet, and creating one is explicitly out of
// scope) -- this is the provable building block for that, not the wiring
// itself.
//
// AccountId in the resulting DetectedChange is the real memb_guid --
// mediation of memb___id happened entirely inside AccountSnapshotReader and
// never reaches this point (Part K).
//
// Same GameAccountReadModel in -> same JSON out: records serialize their
// properties in declaration order, Characters preserves real slot order
// (never re-sorted), and nothing in the model is a Dictionary<> -- so two
// polls of unchanged data produce byte-identical payloads and therefore no
// false change event.
public static class AccountSnapshotChangeFactory
{
    public const string EventType = "account.snapshot";

    public static DetectedChange ToDetectedChange(GameAccountReadModel model)
    {
        var payloadJson = System.Text.Json.JsonSerializer.Serialize(model);
        return new DetectedChange(
            EntityKey.ForAccountSnapshot(model.AccountId),
            EventType,
            AccountId: model.AccountId.ToString(),
            CharacterId: null,
            PayloadJson: payloadJson);
    }
}
