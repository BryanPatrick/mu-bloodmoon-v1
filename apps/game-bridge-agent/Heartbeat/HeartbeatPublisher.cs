using BloodMoon.GameBridgeAgent.Transport;

namespace BloodMoon.GameBridgeAgent.Heartbeat;

// Bridge heartbeat is Agent-connectivity health only -- BRIDGE_HEALTHY /
// BRIDGE_STALE / BRIDGE_OFFLINE (derived Worker-side from last-seen age).
// It is never GAME_SERVER_STATUS and must never be wired into the home
// page's server-status badge (see docs/game-data/architecture.md).
public sealed class HeartbeatPublisher
{
    private readonly IGameDataTransport _client;
    private readonly string _agentId;
    private readonly string _serverId;

    public HeartbeatPublisher(IGameDataTransport client, string agentId, string serverId)
    {
        _client = client;
        _agentId = agentId;
        _serverId = serverId;
    }

    public Task PublishAsync(int bufferDepth, bool bufferFull, DateTimeOffset? lastEventAt, CancellationToken cancellationToken) =>
        _client.SendHeartbeatAsync(
            new HeartbeatPayload(_agentId, _serverId, bufferFull ? "FULL" : "NORMAL", bufferDepth, lastEventAt),
            cancellationToken);
}
