using BloodMoon.GameBridgeAgent.Ingestion;

namespace BloodMoon.GameBridgeAgent.Transport;

// Lets AgentWorker/HeartbeatPublisher be tested against an in-memory fake
// (BloodMoon.GameBridgeAgent.Tests/Fakes/FakeGameDataTransport.cs) without
// exercising real HTTP/HMAC plumbing -- that plumbing is covered separately
// and directly by HmacRequestSignerTests and GameDataClient's own HTTPS-only
// enforcement.
public interface IGameDataTransport
{
    Task SendEventAsync(EventEnvelope envelope, CancellationToken cancellationToken);

    Task SendHeartbeatAsync(HeartbeatPayload heartbeat, CancellationToken cancellationToken);
}
