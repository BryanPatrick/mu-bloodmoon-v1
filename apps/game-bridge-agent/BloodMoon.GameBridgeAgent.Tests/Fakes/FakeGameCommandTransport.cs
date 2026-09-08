using BloodMoon.GameBridgeAgent.Commands;
using BloodMoon.GameBridgeAgent.Transport;

namespace BloodMoon.GameBridgeAgent.Tests.Fakes;

// GameBridge extension plan Part 12/17. In-memory double for
// IGameCommandTransport -- no real HTTP call is made. ClaimAsync is not
// exercised by GameCommandWorkerTests (those call ExecuteClaimedAsync
// directly against a pre-built ClaimedGameCommand); only ReportAsync is
// used, to capture what the worker actually reported for each dispatch
// scenario.
public sealed class FakeGameCommandTransport : IGameCommandTransport
{
    public List<CommandResultReport> Reports { get; } = new();
    public ClaimResponse NextClaimResponse { get; set; } = new([], DateTimeOffset.UtcNow);

    public Task<ClaimResponse> ClaimAsync(string environment, string serverId, int maxCommands, CancellationToken ct) =>
        Task.FromResult(NextClaimResponse);

    public Task ReportAsync(CommandResultReport result, CancellationToken ct)
    {
        Reports.Add(result);
        return Task.CompletedTask;
    }
}
