using System.Security.Cryptography;
using System.Text;

namespace BloodMoon.GameBridgeAgent.Commands;

public interface IGameCredentialKeyProvider
{
    byte[] GetKey(string version);
}

public sealed class GameCredentialDecryptor(IGameCredentialKeyProvider keys)
{
    public byte[] Decrypt(ClaimedGameCommand command)
    {
        // Credential became nullable when the GameBridge extension plan
        // (Part 1/2) generalized ClaimedGameCommand for the four new
        // command types, none of which carry one. GameCommandWorker
        // already guards this before calling Decrypt, but this method
        // stays defensive on its own -- it's the one place that ever
        // touches decrypted key material, so it shouldn't trust a caller
        // guard alone.
        if (command.Credential is not { } credential) throw new CryptographicException("CREDENTIAL_ENVELOPE_INVALID");
        if (credential.Algorithm != "AES-256-GCM") throw new CryptographicException("CREDENTIAL_ALGORITHM_UNSUPPORTED");
        var key = keys.GetKey(credential.KeyVersion);
        if (key.Length != 32) throw new CryptographicException("CREDENTIAL_KEY_INVALID");
        byte[] nonce, tag, ciphertext;
        try
        {
            nonce = Convert.FromBase64String(credential.Nonce);
            tag = Convert.FromBase64String(credential.Tag);
            ciphertext = Convert.FromBase64String(credential.Ciphertext);
        }
        catch (FormatException) { throw new CryptographicException("CREDENTIAL_ENVELOPE_INVALID"); }
        if (nonce.Length != 12 || tag.Length != 16) throw new CryptographicException("CREDENTIAL_ENVELOPE_INVALID");
        var plaintext = new byte[ciphertext.Length];
        var aad = Encoding.UTF8.GetBytes($"{command.CommandId}\n{command.ProvisioningRequestId}\n{command.CommandType}");
        try
        {
            using var aes = new AesGcm(key, tag.Length);
            aes.Decrypt(nonce, ciphertext, tag, plaintext, aad);
            return plaintext;
        }
        catch { CryptographicOperations.ZeroMemory(plaintext); throw; }
        finally
        {
            CryptographicOperations.ZeroMemory(key);
            CryptographicOperations.ZeroMemory(ciphertext);
            CryptographicOperations.ZeroMemory(aad);
        }
    }
}
