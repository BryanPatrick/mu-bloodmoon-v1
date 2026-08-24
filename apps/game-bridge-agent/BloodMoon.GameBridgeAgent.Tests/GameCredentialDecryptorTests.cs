using System.Security.Cryptography;
using System.Text;
using BloodMoon.GameBridgeAgent.Commands;
using Xunit;

namespace BloodMoon.GameBridgeAgent.Tests;

public sealed class GameCredentialDecryptorTests
{
    private static readonly byte[] Key = SHA256.HashData(Encoding.UTF8.GetBytes("phase-3d-a-test-key"));

    [Fact]
    public void DecryptsAuthenticatedEnvelope()
    {
        var command = BuildCommand("Secret1234");
        var plaintext = new GameCredentialDecryptor(new Keys(Key)).Decrypt(command);
        try { Assert.Equal("Secret1234", Encoding.ASCII.GetString(plaintext)); }
        finally { CryptographicOperations.ZeroMemory(plaintext); }
    }

    [Fact]
    public void ModifiedCiphertextFailsAuthentication()
    {
        var command = BuildCommand("Secret1234");
        var bytes = Convert.FromBase64String(command.Credential.Ciphertext);
        bytes[0] ^= 1;
        command = command with { Credential = command.Credential with { Ciphertext = Convert.ToBase64String(bytes) } };
        Assert.Throws<AuthenticationTagMismatchException>(() => new GameCredentialDecryptor(new Keys(Key)).Decrypt(command));
    }

    [Fact]
    public void CiphertextSwappedToDifferentCommandFailsAad()
    {
        var command = BuildCommand("Secret1234");
        command = command with { CommandId = Guid.NewGuid().ToString() };
        Assert.Throws<AuthenticationTagMismatchException>(() => new GameCredentialDecryptor(new Keys(Key)).Decrypt(command));
    }

    [Fact]
    public void WrongKeyFailsAuthentication()
    {
        var command = BuildCommand("Secret1234");
        var wrong = SHA256.HashData(Encoding.UTF8.GetBytes("wrong-key"));
        Assert.Throws<AuthenticationTagMismatchException>(() => new GameCredentialDecryptor(new Keys(wrong)).Decrypt(command));
    }

    [Fact]
    public void MissingKeyVersionFailsSafely()
    {
        var command = BuildCommand("Secret1234") with
        { Credential = BuildCommand("Secret1234").Credential with { KeyVersion = "v99" } };
        var error = Assert.Throws<CryptographicException>(() => new GameCredentialDecryptor(new Keys(Key)).Decrypt(command));
        Assert.Equal("CREDENTIAL_KEY_VERSION_UNAVAILABLE", error.Message);
    }

    private static ClaimedGameCommand BuildCommand(string plaintext)
    {
        var commandId = Guid.NewGuid().ToString();
        var provisioningId = Guid.NewGuid().ToString();
        var nonce = RandomNumberGenerator.GetBytes(12);
        var ciphertext = new byte[plaintext.Length];
        var tag = new byte[16];
        var aad = Encoding.UTF8.GetBytes($"{commandId}\n{provisioningId}\nCREATE_GAME_ACCOUNT");
        using (var aes = new AesGcm(Key, 16))
            aes.Encrypt(nonce, Encoding.ASCII.GetBytes(plaintext), ciphertext, tag, aad);
        return new(commandId, provisioningId, "CREATE_GAME_ACCOUNT", "production", "mu-primary", "qa1234",
            DateTimeOffset.UtcNow.AddHours(1), 1, DateTimeOffset.UtcNow.AddMinutes(1),
            new(Convert.ToBase64String(ciphertext), Convert.ToBase64String(nonce), Convert.ToBase64String(tag), "v1", "AES-256-GCM"));
    }

    private sealed class Keys(byte[] key) : IGameCredentialKeyProvider
    {
        public byte[] GetKey(string version) => version == "v1" ? key.ToArray() : throw new CryptographicException("CREDENTIAL_KEY_VERSION_UNAVAILABLE");
    }
}
