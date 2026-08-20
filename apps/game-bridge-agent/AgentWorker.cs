using BloodMoon.GameBridgeAgent.Configuration;
using BloodMoon.GameBridgeAgent.GameDatabase;
using BloodMoon.GameBridgeAgent.Heartbeat;
using BloodMoon.GameBridgeAgent.Ingestion;
using BloodMoon.GameBridgeAgent.Storage;
using BloodMoon.GameBridgeAgent.Transport;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BloodMoon.GameBridgeAgent;

// poll -> ChangeDetector -> AgentLocalStore (atomic, buffer-full aware) ->
// drain outbox via GameDataClient -> heartbeat. Every step is wrapped so a
// failure anywhere (schema-blocked reader, network outage, Worker down)
// never crashes the loop -- undelivered events simply remain PENDING for
// the next iteration.
public sealed class AgentWorker : BackgroundService
{
    public const int SchemaVersion = 1;

    private readonly IGameDatabaseReader _reader;
    private readonly AgentLocalStore _store;
    private readonly IGameDataTransport _client;
    private readonly HeartbeatPublisher _heartbeat;
    private readonly AgentOptions _options;
    private readonly ILogger<AgentWorker> _logger;

    public AgentWorker(
        IGameDatabaseReader reader,
        AgentLocalStore store,
        IGameDataTransport client,
        HeartbeatPublisher heartbeat,
        IOptions<AgentOptions> options,
        ILogger<AgentWorker> logger)
    {
        _reader = reader;
        _store = store;
        _client = client;
        _heartbeat = heartbeat;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await _store.InitializeAsync(stoppingToken);
        while (!stoppingToken.IsCancellationRequested)
        {
            await RunOnceAsync(stoppingToken);
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(_options.PollIntervalSeconds), stoppingToken);
            }
            catch (OperationCanceledException)
            {
            }
        }
    }

    public async Task RunOnceAsync(CancellationToken ct)
    {
        try
        {
            await PollAndEnqueueAsync(ct);
        }
        catch (SchemaDiscoveryRequiredException ex)
        {
            _logger.LogWarning(
                "{Operation} is BLOCKED_BY_SCHEMA_DISCOVERY: {Missing}", ex.Operation, string.Join(", ", ex.MissingColumns));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Poll failed; will retry next interval.");
        }

        DateTimeOffset? lastEventAt = null;
        try
        {
            lastEventAt = await DrainOutboxAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Outbox drain failed; events remain buffered for retry.");
        }

        try
        {
            var depth = await _store.GetPendingCountAsync(ct);
            var full = await _store.IsBufferFullAsync(ct);
            await _heartbeat.PublishAsync(depth, full, lastEventAt, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Heartbeat publish failed.");
        }
    }

    private async Task PollAndEnqueueAsync(CancellationToken ct)
    {
        var resets = await _reader.GetCharacterResetSnapshotsAsync(ct);
        var rankings = await _reader.GetRankingSnapshotsAsync(ct);

        var candidates = new List<DetectedChange>();
        foreach (var snapshot in resets)
        {
            candidates.Add(new DetectedChange(
                EntityKey.ForCharacterReset(snapshot.CharacterId),
                "character.reset-state",
                AccountId: null,
                CharacterId: snapshot.CharacterId,
                PayloadJson: System.Text.Json.JsonSerializer.Serialize(snapshot)));
        }
        foreach (var snapshot in rankings)
        {
            candidates.Add(new DetectedChange(
                EntityKey.ForRanking(snapshot.Leaderboard, snapshot.CharacterId),
                "ranking.state",
                AccountId: null,
                CharacterId: snapshot.CharacterId,
                PayloadJson: System.Text.Json.JsonSerializer.Serialize(snapshot)));
        }

        var observed = await _store.GetObservedPayloadsAsync(ct);
        var changes = ChangeDetector.Detect(candidates, observed);
        await _store.TryRecordChangesAsync(changes, _options.AgentId, _options.ServerId, SchemaVersion, ct);
    }

    private async Task<DateTimeOffset?> DrainOutboxAsync(CancellationToken ct)
    {
        DateTimeOffset? last = null;
        var pending = await _store.GetPendingEventsAsync(ct);
        foreach (var envelope in pending)
        {
            try
            {
                await _client.SendEventAsync(envelope, ct);
                await _store.MarkSentAsync(envelope.EventId, ct);
                last = envelope.ObservedAt;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send event {EventId}; remains PENDING for retry.", envelope.EventId);
            }
        }
        await _store.EvictSentOlderThanAsync(TimeSpan.FromHours(72), ct);
        return last;
    }
}
