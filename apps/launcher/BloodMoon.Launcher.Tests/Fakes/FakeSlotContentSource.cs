using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;

namespace BloodMoon.Launcher.Tests.Fakes;

public sealed class FakeSlotContentSource : ISlotContentSource
{
    public LauncherContentPayload? Response { get; set; }
    public Exception? ThrowOnNextCall { get; set; }
    public int CallCount { get; private set; }

    public Task<LauncherContentPayload> GetContentAsync(string? page, CancellationToken cancellationToken)
    {
        CallCount++;
        if (ThrowOnNextCall is { } ex)
        {
            ThrowOnNextCall = null;
            throw ex;
        }
        return Task.FromResult(Response ?? throw new InvalidOperationException("No fake response configured."));
    }
}
