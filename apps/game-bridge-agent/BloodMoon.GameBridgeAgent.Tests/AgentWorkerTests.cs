using BloodMoon.GameBridgeAgent.Configuration;
using BloodMoon.GameBridgeAgent.GameDatabase;
using BloodMoon.GameBridgeAgent.Heartbeat;
using BloodMoon.GameBridgeAgent.Storage;
using BloodMoon.GameBridgeAgent.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace BloodMoon.GameBridgeAgent.Tests;

public class AgentWorkerTests : IDisposable
{
    private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"agent-worker-test-{Guid.NewGuid():n}.sqlite3");

    public void Dispose()
    {
        if (File.Exists(_dbPath))
        {
            File.Delete(_dbPath);
        }
    }

    private AgentWorker BuildWorker(FakeGameDatabaseReader reader, AgentLocalStore store, FakeGameDataTransport transport, AgentOptions options)
    {
        var heartbeat = new HeartbeatPublisher(transport, options.AgentId, options.ServerId);
        return new AgentWorker(reader, store, transport, heartbeat, Options.Create(options), NullLogger<AgentWorker>.Instance);
    }

    [Fact]
    public async Task Full_loop_detects_a_change_persists_it_and_sends_exactly_one_event()
    {
        var reader = new FakeGameDatabaseReader { ResetSnapshots = [new CharacterResetSnapshot("c1", "Hero", 10, 1, 5)] };
        var store = new AgentLocalStore(_dbPath, pendingHardCap: 10);
        var transport = new FakeGameDataTransport();
        var worker = BuildWorker(reader, store, transport, new AgentOptions { AgentId = "agent-1", ServerId = "server-1" });
        await store.InitializeAsync();

        await worker.RunOnceAsync(CancellationToken.None);

        Assert.Single(transport.SentEvents);
        Assert.Single(transport.SentHeartbeats);
        Assert.Equal(0, transport.SentHeartbeats[0].BufferDepth);
        Assert.Equal("NORMAL", transport.SentHeartbeats[0].BufferState);
    }

    [Fact]
    public async Task Second_poll_with_unchanged_data_sends_no_new_event()
    {
        var reader = new FakeGameDatabaseReader { ResetSnapshots = [new CharacterResetSnapshot("c1", "Hero", 10, 1, 5)] };
        var store = new AgentLocalStore(_dbPath, pendingHardCap: 10);
        var transport = new FakeGameDataTransport();
        var worker = BuildWorker(reader, store, transport, new AgentOptions { AgentId = "agent-1", ServerId = "server-1" });
        await store.InitializeAsync();

        await worker.RunOnceAsync(CancellationToken.None);
        await worker.RunOnceAsync(CancellationToken.None);

        Assert.Single(transport.SentEvents);
    }

    [Fact]
    public async Task Resend_after_repeated_transport_failure_reuses_the_same_eventId_and_never_duplicates()
    {
        var reader = new FakeGameDatabaseReader { ResetSnapshots = [new CharacterResetSnapshot("c1", "Hero", 10, 1, 5)] };
        var store = new AgentLocalStore(_dbPath, pendingHardCap: 10);
        var transport = new FakeGameDataTransport { FailNextSends = 2 };
        var worker = BuildWorker(reader, store, transport, new AgentOptions { AgentId = "agent-1", ServerId = "server-1" });
        await store.InitializeAsync();

        await worker.RunOnceAsync(CancellationToken.None); // detect + persist; send attempt 1 fails
        await worker.RunOnceAsync(CancellationToken.None); // no new change; send attempt 2 fails
        await worker.RunOnceAsync(CancellationToken.None); // send attempt 3 succeeds

        Assert.Single(transport.SentEvents);
        Assert.Empty(await store.GetPendingEventsAsync());
    }

    // Required scenario (Global Portal Audit / Game Data Platform Phase 1,
    // "BUFFER FULL -- OBSERVED STATE MUST NOT ADVANCE"):
    // observed_state = Reset 10 -> buffer FULL -> reader flips to Reset 11 ->
    // poll -> no new event, sequence unchanged, observed_state still
    // Reset 10 -> drain -> poll again (still Reset 11) -> change is now
    // detected, exactly one new event generated/persisted/sent,
    // observed_state becomes Reset 11.
    [Fact]
    public async Task Buffer_full_holds_back_a_new_change_and_never_advances_observed_state_until_drained()
    {
        var reader = new FakeGameDatabaseReader { ResetSnapshots = [new CharacterResetSnapshot("c1", "Hero", 10, 1, 5)] };
        var store = new AgentLocalStore(_dbPath, pendingHardCap: 1);
        var transport = new FakeGameDataTransport { FailNextSends = int.MaxValue };
        var options = new AgentOptions { AgentId = "agent-1", ServerId = "server-1", OutboxPendingHardCap = 1 };
        var worker = BuildWorker(reader, store, transport, options);
        await store.InitializeAsync();

        // 1-2: observed_state = Reset 10, and the single outbox slot stays
        // occupied because every send fails (simulates a Worker outage).
        await worker.RunOnceAsync(CancellationToken.None);
        var observedAfterFirst = await store.GetObservedPayloadsAsync();
        Assert.Contains(observedAfterFirst.Values, v => v.Contains("\"ResetCount\":10"));
        Assert.Equal(1, await store.GetPendingCountAsync());

        // 3-5: reader now returns Reset 11; buffer is FULL (1/1 pending) ->
        // poll must produce no new event and must not advance observed_state.
        reader.ResetSnapshots = [new CharacterResetSnapshot("c1", "Hero", 11, 1, 5)];
        await worker.RunOnceAsync(CancellationToken.None);
        var observedWhileFull = await store.GetObservedPayloadsAsync();
        Assert.Contains(observedWhileFull.Values, v => v.Contains("\"ResetCount\":10"));
        Assert.DoesNotContain(observedWhileFull.Values, v => v.Contains("\"ResetCount\":11"));
        Assert.Equal(1, await store.GetPendingCountAsync());
        Assert.Empty(transport.SentEvents); // the original Reset-10 event still hasn't gone out either

        // 6: free space in the buffer -- let the next send succeed, which
        // drains the original Reset-10 event.
        transport.FailNextSends = 0;
        await worker.RunOnceAsync(CancellationToken.None);
        Assert.Equal(0, await store.GetPendingCountAsync());
        Assert.Single(transport.SentEvents);

        // 7-9: poll again, reader still returns Reset 11 -> now detected,
        // exactly one new event generated, persisted and sent.
        await worker.RunOnceAsync(CancellationToken.None);
        var observedFinal = await store.GetObservedPayloadsAsync();
        Assert.Contains(observedFinal.Values, v => v.Contains("\"ResetCount\":11"));
        Assert.Equal(2, transport.SentEvents.Count);
        Assert.Equal(0, await store.GetPendingCountAsync());
    }
}
