using BloodMoon.GameBridgeAgent.Commands;

namespace BloodMoon.GameBridgeAgent.Transport;

public interface IGameCommandTransport
{
    Task<ClaimResponse> ClaimAsync(string environment, string serverId, int maxCommands, CancellationToken ct);
    Task ReportAsync(CommandResultReport result, CancellationToken ct);
}
