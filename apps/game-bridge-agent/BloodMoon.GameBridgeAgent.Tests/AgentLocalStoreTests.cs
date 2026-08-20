using BloodMoon.GameBridgeAgent.Ingestion;
using BloodMoon.GameBridgeAgent.Storage;
using Xunit;

namespace BloodMoon.GameBridgeAgent.Tests;

public class AgentLocalStoreTests : IDisposable
{
    private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"agent-store-test-{Guid.NewGuid():n}.sqlite3");

    public void Dispose()
    {
        if (File.Exists(_dbPath))
        {
            File.Delete(_dbPath);
        }
    }

    private static DetectedChange Change(string key, string characterId, string json) =>
        new(key, "character.reset-state", null, characterId, json);

    [Fact]
    public async Task Sequence_persists_across_reopen_and_never_resets_to_zero()
    {
        var store1 = new AgentLocalStore(_dbPath, pendingHardCap: 10);
        await store1.InitializeAsync();
        var first = await store1.TryRecordChangesAsync([Change("k1", "c1", "{\"a\":1}")], "agent-1", "server-1", 1);
        Assert.Equal(1, Assert.Single(first).SourceSequence);

        // A brand new instance against the same file -- simulates the Agent
        // process restarting.
        var store2 = new AgentLocalStore(_dbPath, pendingHardCap: 10);
        await store2.InitializeAsync();
        var second = await store2.TryRecordChangesAsync([Change("k2", "c2", "{\"a\":2}")], "agent-1", "server-1", 1);

        Assert.Equal(2, Assert.Single(second).SourceSequence);
    }

    [Fact]
    public async Task Pending_events_are_never_evicted_by_capacity_pressure()
    {
        var store = new AgentLocalStore(_dbPath, pendingHardCap: 2);
        await store.InitializeAsync();
        await store.TryRecordChangesAsync([Change("k1", "c1", "{\"a\":1}")], "agent-1", "server-1", 1);
        await store.TryRecordChangesAsync([Change("k2", "c2", "{\"a\":2}")], "agent-1", "server-1", 1);

        var thirdAttempt = await store.TryRecordChangesAsync([Change("k3", "c3", "{\"a\":3}")], "agent-1", "server-1", 1);

        Assert.Empty(thirdAttempt);
        var pending = await store.GetPendingEventsAsync();
        Assert.Equal(2, pending.Count);
        Assert.DoesNotContain(pending, e => e.CharacterId == "c3");
    }

    [Fact]
    public async Task Buffer_full_leaves_observed_state_and_sequence_completely_untouched()
    {
        var store = new AgentLocalStore(_dbPath, pendingHardCap: 1);
        await store.InitializeAsync();
        await store.TryRecordChangesAsync([Change("k1", "c1", "{\"resetCount\":10}")], "agent-1", "server-1", 1);

        var observedBefore = await store.GetObservedPayloadsAsync();

        var skipped = await store.TryRecordChangesAsync([Change("k2", "c2", "{\"resetCount\":99}")], "agent-1", "server-1", 1);

        Assert.Empty(skipped);
        var observedAfter = await store.GetObservedPayloadsAsync();
        Assert.Equal(observedBefore.Count, observedAfter.Count);
        Assert.DoesNotContain("k2", observedAfter.Keys);
        Assert.Equal(1, await store.GetPendingCountAsync());
    }

    [Fact]
    public async Task Only_sent_rows_past_retention_are_evicted_pending_rows_are_never_touched()
    {
        var store = new AgentLocalStore(_dbPath, pendingHardCap: 10);
        await store.InitializeAsync();
        await store.TryRecordChangesAsync(
            [Change("k1", "c1", "{\"a\":1}"), Change("k2", "c2", "{\"a\":2}")], "agent-1", "server-1", 1);
        var pending = await store.GetPendingEventsAsync();
        await store.MarkSentAsync(pending[0].EventId);

        var evicted = await store.EvictSentOlderThanAsync(TimeSpan.Zero);

        Assert.Equal(1, evicted);
        var stillPending = await store.GetPendingEventsAsync();
        Assert.Single(stillPending);
        Assert.Equal(pending[1].EventId, stillPending[0].EventId);
    }

    [Fact]
    public async Task Pending_event_survives_a_simulated_crash_and_is_recoverable_after_reopen()
    {
        var store1 = new AgentLocalStore(_dbPath, pendingHardCap: 10);
        await store1.InitializeAsync();
        var persisted = await store1.TryRecordChangesAsync([Change("k1", "c1", "{\"a\":1}")], "agent-1", "server-1", 1);
        var eventId = Assert.Single(persisted).EventId;
        // store1 is abandoned here, simulating the process terminating
        // before the HTTP send/ack ever happened. AgentLocalStore never
        // holds a connection open between calls, so a fresh instance
        // against the same file sees exactly what was durably committed.

        var store2 = new AgentLocalStore(_dbPath, pendingHardCap: 10);
        var recoveredPending = await store2.GetPendingEventsAsync();
        var recovered = Assert.Single(recoveredPending);
        Assert.Equal(eventId, recovered.EventId);

        await store2.MarkSentAsync(recovered.EventId);
        Assert.Empty(await store2.GetPendingEventsAsync());
    }
}
