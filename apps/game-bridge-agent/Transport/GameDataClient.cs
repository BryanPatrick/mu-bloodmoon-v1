using System.Text;
using System.Text.Json;
using BloodMoon.GameBridgeAgent.Ingestion;

namespace BloodMoon.GameBridgeAgent.Transport;

public sealed record HeartbeatPayload(string AgentId, string ServerId, string BufferState, int BufferDepth, DateTimeOffset? LastEventAt);

// Outbound-only HTTPS client to the Cloudflare Worker, mirroring
// apps/launcher/Services/LauncherApiClient.cs's shape: one long-lived
// HttpClient, HTTPS-only base URL, System.Text.Json with Web defaults, a
// centralized EnsureSuccessAsync. Every request is signed with
// HmacRequestSigner -- the Agent never sends an unsigned request.
public sealed class GameDataClient : IGameDataTransport, IDisposable
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(15) };
    private readonly string _baseUrl;
    private readonly string _agentId;
    private readonly string _secret;

    public GameDataClient(string baseUrl, string agentId, string secret)
    {
        if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
        {
            throw new InvalidOperationException("A URL do Game Data Worker deve usar HTTPS.");
        }
        _baseUrl = baseUrl.TrimEnd('/');
        _agentId = agentId;
        _secret = secret;
    }

    public Task SendEventAsync(EventEnvelope envelope, CancellationToken cancellationToken) =>
        PostSignedAsync("/ingest/events", envelope, cancellationToken);

    public Task SendHeartbeatAsync(HeartbeatPayload heartbeat, CancellationToken cancellationToken) =>
        PostSignedAsync("/ingest/heartbeat", heartbeat, cancellationToken);

    private async Task PostSignedAsync<T>(string path, T payload, CancellationToken cancellationToken)
    {
        var body = JsonSerializer.Serialize(payload, JsonOptions);
        var nonce = Guid.NewGuid().ToString("n");
        var headers = HmacRequestSigner.Sign(_agentId, _secret, "POST", path, string.Empty, body, DateTimeOffset.UtcNow, nonce);

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}{path}")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
        request.Headers.Add("X-Agent-Id", headers.AgentId);
        request.Headers.Add("X-Agent-Timestamp", headers.Timestamp);
        request.Headers.Add("X-Agent-Nonce", headers.Nonce);
        request.Headers.Add("X-Agent-Signature", headers.Signature);

        using var response = await _http.SendAsync(request, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);
    }

    private static async Task EnsureSuccessAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode)
        {
            return;
        }
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        var message = $"Game Data Worker indisponivel ({(int)response.StatusCode}).";
        if (!string.IsNullOrWhiteSpace(body) && body.Length < 240)
        {
            message += $" {body}";
        }
        throw new InvalidOperationException(message);
    }

    public void Dispose() => _http.Dispose();
}
