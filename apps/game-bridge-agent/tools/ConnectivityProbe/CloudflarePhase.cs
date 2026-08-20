using System.Text;
using System.Text.Json;
using BloodMoon.GameBridgeAgent.Heartbeat;
using BloodMoon.GameBridgeAgent.Ingestion;
using BloodMoon.GameBridgeAgent.ReadModels;
using BloodMoon.GameBridgeAgent.Transport;

namespace BloodMoon.GameBridgeAgent.Tools.ConnectivityProbe;

// Phase 2D, Parts G-Q real-Cloudflare proof. Uses the Agent's real
// HmacRequestSigner/GameDataClient/HeartbeatPublisher/EventEnvelope
// classes directly (no reimplementation) against the real deployed
// Worker. The HMAC secret arrives the same transient way the SQL
// credential does (Phase 2C's pattern) -- never on this process's
// command line, never printed.
internal static class CloudflarePhase
{
    private static readonly HttpClient RawHttp = new() { Timeout = TimeSpan.FromSeconds(15) };
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static async Task RunAsync(ProbeRequest request, GameAccountReadModel model, ProbeResult result)
    {
        using var transport = new GameDataClient(request.WorkerBaseUrl!, request.AgentId!, request.HmacSecret!);

        // Part I: real signed heartbeat via the real HeartbeatPublisher.
        var heartbeatPublisher = new HeartbeatPublisher(transport, request.AgentId!, request.ServerId!);
        try
        {
            await heartbeatPublisher.PublishAsync(bufferDepth: 0, bufferFull: false, lastEventAt: DateTimeOffset.UtcNow, CancellationToken.None);
            result.HeartbeatSent = "PASS";
        }
        catch (Exception ex)
        {
            result.HeartbeatSent = "FAIL: " + ex.GetType().Name;
        }

        // Part K: a real account.snapshot event, built from the real
        // AccountSnapshotChangeFactory output for the real snapshot just
        // read. sourceSequence uses current-time-ms so it is always
        // greater than any prior run's value (no local sequence counter
        // needed for a one-shot probe).
        var change = AccountSnapshotChangeFactory.ToDetectedChange(model);
        var highSequence = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var eventId = Guid.NewGuid().ToString();
        var envelope = new EventEnvelope(
            EventId: eventId,
            EventType: change.EventType,
            SchemaVersion: 1,
            Source: request.AgentId!,
            ServerId: request.ServerId!,
            SourceSequence: highSequence,
            AccountId: change.AccountId,
            CharacterId: change.CharacterId,
            ObservedAt: DateTimeOffset.UtcNow,
            PayloadJson: change.PayloadJson);

        try
        {
            await transport.SendEventAsync(envelope, CancellationToken.None);
            result.EventSent = "PASS";
            result.EventId = eventId;
            result.EventSourceSequence = highSequence;
        }
        catch (Exception ex)
        {
            result.EventSent = "FAIL: " + ex.GetType().Name;
        }

        // Part M: dedupe -- resend the *exact same* eventId (fresh nonce,
        // since nonce and eventId are independent concerns). Expected:
        // ALREADY_PROCESSED, not a duplicate application.
        result.DedupeTest = await PostSignedRaw(request, "/ingest/events", "POST",
            JsonSerializer.Serialize(envelope, JsonOptions), nonce: null);

        // Part N: nonce replay -- resend the SAME (nonce, previous body)
        // pair verbatim. Expected: rejected as a replayed request.
        var (firstNonceBody, firstNonce) = BuildSignedHeartbeatForNonceReuse(request);
        var firstNonceResult = await PostRawWithHeaders(request.WorkerBaseUrl!, "/ingest/heartbeat", firstNonceBody.body, firstNonceBody.headers);
        var replayResult = await PostRawWithHeaders(request.WorkerBaseUrl!, "/ingest/heartbeat", firstNonceBody.body, firstNonceBody.headers);
        result.NonceReplayTest = $"first={(int)firstNonceResult.StatusCode} replay={(int)replayResult.StatusCode}";

        // Part O: sequence guard -- a NEW eventId (so it is not
        // dedupe-short-circuited) carrying an OLDER sourceSequence than
        // what was just accepted. Expected: accepted at the event_dedupe
        // layer (200), but current-state must NOT regress.
        var olderEnvelope = envelope with { EventId = Guid.NewGuid().ToString(), SourceSequence = highSequence - 1000 };
        result.SequenceGuardEventAccepted = await PostSignedRaw(request, "/ingest/events", "POST",
            JsonSerializer.Serialize(olderEnvelope, JsonOptions), nonce: null);
    }

    private static async Task<string> PostSignedRaw(ProbeRequest request, string path, string method, string body, string? nonce)
    {
        var actualNonce = nonce ?? Guid.NewGuid().ToString("n");
        var headers = HmacRequestSigner.Sign(request.AgentId!, request.HmacSecret!, method, path, string.Empty, body, DateTimeOffset.UtcNow, actualNonce);
        var response = await PostRawWithHeaders(request.WorkerBaseUrl!, path, body, headers);
        var responseBody = await response.Content.ReadAsStringAsync();
        return $"{(int)response.StatusCode} {Truncate(responseBody, 120)}";
    }

    private static ((string body, SignedRequestHeaders headers), string nonce) BuildSignedHeartbeatForNonceReuse(ProbeRequest request)
    {
        var payload = new HeartbeatPayload(request.AgentId!, request.ServerId!, "NORMAL", 0, null);
        var body = JsonSerializer.Serialize(payload, JsonOptions);
        var nonce = Guid.NewGuid().ToString("n");
        var headers = HmacRequestSigner.Sign(request.AgentId!, request.HmacSecret!, "POST", "/ingest/heartbeat", string.Empty, body, DateTimeOffset.UtcNow, nonce);
        return ((body, headers), nonce);
    }

    private static async Task<HttpResponseMessage> PostRawWithHeaders(string baseUrl, string path, string body, SignedRequestHeaders headers)
    {
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl.TrimEnd('/')}{path}")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
        httpRequest.Headers.Add("X-Agent-Id", headers.AgentId);
        httpRequest.Headers.Add("X-Agent-Timestamp", headers.Timestamp);
        httpRequest.Headers.Add("X-Agent-Nonce", headers.Nonce);
        httpRequest.Headers.Add("X-Agent-Signature", headers.Signature);
        return await RawHttp.SendAsync(httpRequest);
    }

    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max] + "...";
}
