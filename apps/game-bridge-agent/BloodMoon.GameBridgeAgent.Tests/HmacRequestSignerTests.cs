using BloodMoon.GameBridgeAgent.Transport;
using Xunit;

namespace BloodMoon.GameBridgeAgent.Tests;

public class HmacRequestSignerTests
{
    [Fact]
    public void Signature_is_deterministic_for_identical_inputs()
    {
        var sig1 = HmacRequestSigner.ComputeSignature("agent-1", "secret", "POST", "/ingest/events", "", "{}", "0", "nonce-1");
        var sig2 = HmacRequestSigner.ComputeSignature("agent-1", "secret", "POST", "/ingest/events", "", "{}", "0", "nonce-1");

        Assert.Equal(sig1, sig2);
    }

    [Fact]
    public void Signature_is_bound_to_the_route_path()
    {
        var events = HmacRequestSigner.ComputeSignature("agent-1", "secret", "POST", "/ingest/events", "", "{}", "0", "nonce-1");
        var heartbeat = HmacRequestSigner.ComputeSignature("agent-1", "secret", "POST", "/ingest/heartbeat", "", "{}", "0", "nonce-1");

        Assert.NotEqual(events, heartbeat);
    }

    [Fact]
    public void Signature_is_bound_to_the_http_method()
    {
        var post = HmacRequestSigner.ComputeSignature("agent-1", "secret", "POST", "/ingest/events", "", "{}", "0", "nonce-1");
        var get = HmacRequestSigner.ComputeSignature("agent-1", "secret", "GET", "/ingest/events", "", "{}", "0", "nonce-1");

        Assert.NotEqual(post, get);
    }

    [Fact]
    public void Signature_is_bound_to_the_body()
    {
        var body1 = HmacRequestSigner.ComputeSignature("agent-1", "secret", "POST", "/ingest/events", "", "{\"a\":1}", "0", "nonce-1");
        var body2 = HmacRequestSigner.ComputeSignature("agent-1", "secret", "POST", "/ingest/events", "", "{\"a\":2}", "0", "nonce-1");

        Assert.NotEqual(body1, body2);
    }

    [Fact]
    public void Signature_is_bound_to_the_agent_id()
    {
        var agent1 = HmacRequestSigner.ComputeSignature("agent-1", "secret", "POST", "/ingest/events", "", "{}", "0", "nonce-1");
        var agent2 = HmacRequestSigner.ComputeSignature("agent-2", "secret", "POST", "/ingest/events", "", "{}", "0", "nonce-1");

        Assert.NotEqual(agent1, agent2);
    }

    [Fact]
    public void Sign_returns_a_millisecond_unix_timestamp_and_a_64_char_hex_signature()
    {
        var headers = HmacRequestSigner.Sign("agent-1", "secret", "POST", "/ingest/events", "", "{}", DateTimeOffset.UnixEpoch.AddSeconds(1), "nonce-1");

        Assert.Equal("1000", headers.Timestamp);
        Assert.Matches("^[0-9a-f]{64}$", headers.Signature);
        Assert.Equal("agent-1", headers.AgentId);
        Assert.Equal("nonce-1", headers.Nonce);
    }
}
