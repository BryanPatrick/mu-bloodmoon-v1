using BloodMoon.Launcher.Services.ContentCache;

namespace BloodMoon.Launcher.Tests.Fakes;

public sealed class FakeAssetDownloader : IAssetDownloader
{
    public byte[] Bytes { get; set; } = [];
    public Exception? ThrowOnNextCall { get; set; }
    public int CallCount { get; private set; }
    public string? LastRequestedUrl { get; private set; }

    public Task<byte[]> DownloadAsync(string url, CancellationToken cancellationToken)
    {
        CallCount++;
        LastRequestedUrl = url;
        if (ThrowOnNextCall is { } ex)
        {
            ThrowOnNextCall = null;
            throw ex;
        }
        return Task.FromResult(Bytes);
    }
}
