using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;

namespace BloodMoon.Launcher.Tests.Fakes;

public sealed class FakeBootstrapSource : ILauncherBootstrapSource
{
    public LauncherBootstrap? Response { get; set; }
    public Exception? ThrowOnNextCall { get; set; }
    public int CallCount { get; private set; }

    public Task<LauncherBootstrap> GetBootstrapAsync(CancellationToken cancellationToken)
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
