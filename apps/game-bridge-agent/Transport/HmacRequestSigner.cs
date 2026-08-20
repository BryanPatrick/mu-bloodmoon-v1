using System.Security.Cryptography;
using System.Text;

namespace BloodMoon.GameBridgeAgent.Transport;

public sealed record SignedRequestHeaders(string AgentId, string Timestamp, string Nonce, string Signature);

// Canonical-request HMAC: the signature is bound to the exact agent, method,
// path, query and body it authenticates -- not just the body. A signature
// captured for one route must never verify against another route. The
// Worker-side verifier (apps/game-data-worker/src/auth/hmac.ts) must
// reconstruct this exact same canonical string from the real incoming
// request before comparing.
public static class HmacRequestSigner
{
    public static SignedRequestHeaders Sign(
        string agentId,
        string secret,
        string method,
        string canonicalPath,
        string canonicalQuery,
        string body,
        DateTimeOffset timestamp,
        string nonce)
    {
        var timestampMs = timestamp.ToUnixTimeMilliseconds().ToString();
        var signature = ComputeSignature(agentId, secret, method, canonicalPath, canonicalQuery, body, timestampMs, nonce);
        return new SignedRequestHeaders(agentId, timestampMs, nonce, signature);
    }

    public static string ComputeSignature(
        string agentId,
        string secret,
        string method,
        string canonicalPath,
        string canonicalQuery,
        string body,
        string timestampMs,
        string nonce)
    {
        var bodyHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(body))).ToLowerInvariant();
        var canonicalRequest = string.Join(
            '\n', agentId, method.ToUpperInvariant(), canonicalPath, canonicalQuery, timestampMs, nonce, bodyHash);
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(canonicalRequest));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
