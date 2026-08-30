using System.Diagnostics;

namespace BloodMoon.Launcher.Services;

public static class BrowserService
{
    public static Uri ValidateExternalUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) ||
            uri.Scheme != Uri.UriSchemeHttps ||
            string.IsNullOrWhiteSpace(uri.Host) ||
            !string.IsNullOrEmpty(uri.UserInfo))
        {
            throw new InvalidOperationException("O endereço configurado não é válido.");
        }
        return uri;
    }

    public static void Open(string url)
    {
        var uri = ValidateExternalUrl(url);

        Process.Start(new ProcessStartInfo(uri.ToString()) { UseShellExecute = true });
    }
}
