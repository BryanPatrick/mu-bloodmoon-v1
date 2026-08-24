using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using BloodMoon.GameBridgeAgent.Commands;

namespace BloodMoon.GameBridgeAgent.Transport;

public sealed class GameCommandClient : IGameCommandTransport
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private readonly HttpClient _http;
    private readonly string _agentId;
    private readonly string _secret;

    public GameCommandClient(string baseUrl, string agentId, string secret, HttpMessageHandler? handler = null)
    {
        _agentId = agentId;
        _secret = secret;
        _http = handler is null ? new HttpClient() : new HttpClient(handler);
        _http.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
        _http.Timeout = TimeSpan.FromSeconds(15);
    }

    public async Task<ClaimResponse> ClaimAsync(string environment, string serverId, int maxCommands, CancellationToken ct)
    {
        var body = JsonSerializer.Serialize(new { environment, serverId, maxCommands }, Json);
        using var response = await SendAsync(HttpMethod.Post, "game-commands/claim", body, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ClaimResponse>(Json, ct)
            ?? throw new InvalidOperationException("COMMAND_CLAIM_RESPONSE_INVALID");
    }

    public async Task ReportAsync(CommandResultReport result, CancellationToken ct)
    {
        var body = JsonSerializer.Serialize(result, Json);
        using var response = await SendAsync(HttpMethod.Post, "game-commands/result", body, ct);
        response.EnsureSuccessStatusCode();
    }

    private async Task<HttpResponseMessage> SendAsync(HttpMethod method, string relativePath, string body, CancellationToken ct)
    {
        var path = "/" + relativePath;
        var nonce = Guid.NewGuid().ToString("n");
        var headers = HmacRequestSigner.Sign(_agentId, _secret, method.Method, path, string.Empty, body, DateTimeOffset.UtcNow, nonce);
        using var request = new HttpRequestMessage(method, relativePath) { Content = new StringContent(body, Encoding.UTF8, "application/json") };
        request.Headers.TryAddWithoutValidation("X-Agent-Id", headers.AgentId);
        request.Headers.TryAddWithoutValidation("X-Agent-Timestamp", headers.Timestamp);
        request.Headers.TryAddWithoutValidation("X-Agent-Nonce", headers.Nonce);
        request.Headers.TryAddWithoutValidation("X-Agent-Signature", headers.Signature);
        return await _http.SendAsync(request, ct);
    }
}
