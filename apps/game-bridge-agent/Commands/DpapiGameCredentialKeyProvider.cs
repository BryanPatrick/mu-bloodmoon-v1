using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BloodMoon.GameBridgeAgent.Commands;

public sealed class DpapiGameCredentialKeyProvider(string path) : IGameCredentialKeyProvider
{
    private sealed record ProtectedFile(
        [property: JsonPropertyName("format")] string Format,
        [property: JsonPropertyName("protectedPayload")] string ProtectedPayload);

    public byte[] GetKey(string version)
    {
        if (!OperatingSystem.IsWindows()) throw new PlatformNotSupportedException("DPAPI_REQUIRED");
        if (!File.Exists(path)) throw new CryptographicException("CREDENTIAL_KEYRING_UNAVAILABLE");
        var document = JsonSerializer.Deserialize<ProtectedFile>(File.ReadAllText(path))
            ?? throw new CryptographicException("CREDENTIAL_KEYRING_INVALID");
        if (document.Format != "BM_GAME_CREDENTIAL_KEYS_V1") throw new CryptographicException("CREDENTIAL_KEYRING_INVALID");
        byte[] protectedBytes;
        try { protectedBytes = Convert.FromBase64String(document.ProtectedPayload); }
        catch (FormatException) { throw new CryptographicException("CREDENTIAL_KEYRING_INVALID"); }
        var payload = ProtectedData.Unprotect(protectedBytes, null, DataProtectionScope.LocalMachine);
        try
        {
            using var json = JsonDocument.Parse(payload);
            if (!json.RootElement.TryGetProperty(version, out var encoded) || encoded.ValueKind != JsonValueKind.String)
                throw new CryptographicException("CREDENTIAL_KEY_VERSION_UNAVAILABLE");
            var key = Convert.FromBase64String(encoded.GetString()!);
            if (key.Length != 32) { CryptographicOperations.ZeroMemory(key); throw new CryptographicException("CREDENTIAL_KEY_INVALID"); }
            return key;
        }
        finally
        {
            CryptographicOperations.ZeroMemory(protectedBytes);
            CryptographicOperations.ZeroMemory(payload);
        }
    }
}
