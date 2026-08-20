namespace BloodMoon.GameBridgeAgent.Ingestion;

public sealed record DetectedChange(string EntityKey, string EventType, string? AccountId, string? CharacterId, string PayloadJson);

// Pure comparison: fresh snapshot payloads vs the last payloads actually
// committed to AgentLocalStore's observed_state. No I/O, no side effects --
// this is what makes it independently testable and safe to call every poll
// even when the outbox is full (see AgentLocalStore.TryRecordChangesAsync,
// which is the only place allowed to advance observed_state).
public static class ChangeDetector
{
    public static IReadOnlyList<DetectedChange> Detect(
        IReadOnlyList<DetectedChange> freshCandidates,
        IReadOnlyDictionary<string, string> observedPayloadsByEntityKey)
    {
        var changes = new List<DetectedChange>();
        foreach (var candidate in freshCandidates)
        {
            var isUnchanged = observedPayloadsByEntityKey.TryGetValue(candidate.EntityKey, out var priorJson)
                && priorJson == candidate.PayloadJson;
            if (!isUnchanged)
            {
                changes.Add(candidate);
            }
        }
        return changes;
    }
}
