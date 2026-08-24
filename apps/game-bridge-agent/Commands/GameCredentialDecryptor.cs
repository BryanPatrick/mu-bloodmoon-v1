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
        if (command.Credential.Algorithm != "AES-256-GCM") throw new CryptographicException("CREDENTIAL_ALGORITHM_UNSUPPORTED");
        var key = keys.GetKey(command.Credential.KeyVersion);
        if (key.Length != 32) throw new CryptographicException("CREDENTIAL_KEY_INVALID");
        byte[] nonce, tag, ciphertext;
        try
        {
            nonce = Convert.FromBase64String(command.Credential.Nonce);
            tag = Convert.FromBase64String(command.Credential.Tag);
            ciphertext = Convert.FromBase64String(command.Credential.Ciphertext);
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
