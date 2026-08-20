using BloodMoon.GameBridgeAgent.Ingestion;
using BloodMoon.GameBridgeAgent.Transport;

namespace BloodMoon.GameBridgeAgent.Tests.Fakes;

// In-memory transport double -- no real HTTP call is made. FailNextSends
// lets a test simulate N consecutive send failures (network/Worker outage)
// before succeeding, to prove retries never duplicate an eventId.
public sealed class FakeGameDataTransport : IGameDataTransport
{
    public List<EventEnvelope> SentEvents { get; } = new();
    public List<HeartbeatPayload> SentHeartbeats { get; } = new();
    public int FailNextSends { get; set; }

    public Task SendEventAsync(EventEnvelope envelope, CancellationToken cancellationToken)
    {
        if (FailNextSends > 0)
        {
            FailNextSends--;
            throw new InvalidOperationException("Simulated transport failure.");
        }
        SentEvents.Add(envelope);
        return Task.CompletedTask;
    }

    public Task SendHeartbeatAsync(HeartbeatPayload heartbeat, CancellationToken cancellationToken)
    {
        SentHeartbeats.Add(heartbeat);
        return Task.CompletedTask;
    }
}
