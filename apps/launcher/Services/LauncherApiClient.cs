using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using BloodMoon.Launcher.Models;

namespace BloodMoon.Launcher.Services;

// Narrow seam for LauncherContentService (Launcher Foundation phase) to
// depend on -- lets tests inject a fake bootstrap source without touching
// LauncherApiClient's internal HttpClient/handler at all. LauncherApiClient
// already has a matching GetBootstrapAsync, so it satisfies this for free.
public interface ILauncherBootstrapSource
{
    Task<LauncherBootstrap> GetBootstrapAsync(CancellationToken cancellationToken);
}

// Same seam pattern for GET /launcher/content (Launcher Phase L3) --
// SlotContentService depends on this, not LauncherApiClient directly, so
// tests can inject a fake without a real HttpClient.
public interface ISlotContentSource
{
    Task<LauncherContentPayload> GetContentAsync(string? page, CancellationToken cancellationToken);
}

public sealed class LauncherApiClient : IDisposable, ILauncherBootstrapSource, ISlotContentSource
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(15) };
    private string _baseUrl = "https://api.mubloodmoon.com.br/api";

    public void Configure(string baseUrl)
    {
        _baseUrl = baseUrl.TrimEnd('/');
        if (!Uri.TryCreate(_baseUrl, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
        {
            throw new InvalidOperationException("A API do launcher deve usar HTTPS.");
        }
    }

    public Task<LauncherBootstrap> GetBootstrapAsync(CancellationToken cancellationToken) =>
        GetAsync<LauncherBootstrap>("launcher/bootstrap", null, cancellationToken);

    public async Task<LoginResponse> LoginAsync(LoginPayload payload, CancellationToken cancellationToken)
    {
        using var response = await _http.PostAsJsonAsync(
            $"{_baseUrl}/auth/login",
            payload,
            JsonOptions,
            cancellationToken);
        return await ReadAsync<LoginResponse>(response, cancellationToken);
    }

    public async Task<LoginResponse> RefreshAsync(string refreshToken, CancellationToken cancellationToken)
    {
        using var response = await _http.PostAsJsonAsync(
            $"{_baseUrl}/auth/refresh",
            new RefreshPayload { RefreshToken = refreshToken },
            JsonOptions,
            cancellationToken);
        return await ReadAsync<LoginResponse>(response, cancellationToken);
    }

    public Task<LauncherAccount> GetAccountAsync(string accessToken, CancellationToken cancellationToken) =>
        GetAsync<LauncherAccount>("launcher/account", accessToken, cancellationToken);

    // Phase 3B routes, not called by any UI flow yet -- added here so the
    // new AccountState mapper (Launcher Foundation phase) has a real,
    // typed way to read the Unified Blood Moon Account gameReady signal
    // once a page is built to show it.
    public Task<LauncherMe> GetMeAsync(string accessToken, CancellationToken cancellationToken) =>
        GetAsync<LauncherMe>("launcher/me", accessToken, cancellationToken);

    public Task<LauncherMeCharacters> GetMeCharactersAsync(string accessToken, CancellationToken cancellationToken) =>
        GetAsync<LauncherMeCharacters>("launcher/me/characters", accessToken, cancellationToken);

    // Launcher Phase L3 -- CMS-published slot content (Part B), additive
    // to GetBootstrapAsync above, never a replacement for it.
    public Task<LauncherContentPayload> GetContentAsync(string? page, CancellationToken cancellationToken) =>
        GetAsync<LauncherContentPayload>(
            string.IsNullOrWhiteSpace(page) ? "launcher/content" : $"launcher/content?page={Uri.EscapeDataString(page)}",
            null,
            cancellationToken);

    public Task<LauncherEventsResponse> GetEventsAsync(CancellationToken cancellationToken) =>
        GetAsync<LauncherEventsResponse>("launcher/events", null, cancellationToken);

    public Task<LauncherRankingsResponse> GetRankingsAsync(string? rankingType, CancellationToken cancellationToken) =>
        GetAsync<LauncherRankingsResponse>(
            string.IsNullOrWhiteSpace(rankingType) ? "launcher/rankings" : $"launcher/rankings?type={Uri.EscapeDataString(rankingType)}",
            null,
            cancellationToken);

    public Task<ShopProductListResponse> GetStoreProductsAsync(CancellationToken cancellationToken) =>
        GetAsync<ShopProductListResponse>("shop/products?pageSize=40", null, cancellationToken);

    // The active-terms endpoint sends an empty (Content-Length: 0) body,
    // not a JSON "null" literal, when no StorePurchaseTerms is configured
    // yet -- ReadFromJsonAsync throws JsonException on an empty body, so
    // this is handled explicitly rather than reusing GetAsync<T>.
    public async Task<StorePurchaseTermsDto?> GetActiveTermsAsync(CancellationToken cancellationToken)
    {
        using var response = await _http.GetAsync($"{_baseUrl}/launcher/store/terms/active", cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);
        if (response.Content.Headers.ContentLength is null or 0)
        {
            return null;
        }
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(body) || body.Trim() == "null")
        {
            return null;
        }
        return JsonSerializer.Deserialize<StorePurchaseTermsDto>(body, JsonOptions);
    }

    public async Task<PurchaseIntentDto> CreatePurchaseAsync(
        string accessToken, CreatePurchasePayload payload, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/shop/purchases")
        {
            Content = JsonContent.Create(payload, options: JsonOptions)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        using var response = await _http.SendAsync(request, cancellationToken);
        return await ReadAsync<PurchaseIntentDto>(response, cancellationToken);
    }

    public async Task LogoutAsync(string accessToken, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/auth/logout");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        using var response = await _http.SendAsync(request, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);
    }

    private async Task<T> GetAsync<T>(string path, string? accessToken, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{_baseUrl}/{path}");
        if (!string.IsNullOrWhiteSpace(accessToken))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        }
        using var response = await _http.SendAsync(request, cancellationToken);
        return await ReadAsync<T>(response, cancellationToken);
    }

    private static async Task<T> ReadAsync<T>(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        await EnsureSuccessAsync(response, cancellationToken);
        return await response.Content.ReadFromJsonAsync<T>(JsonOptions, cancellationToken)
            ?? throw new InvalidOperationException("A API retornou uma resposta vazia.");
    }

    private static async Task EnsureSuccessAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode)
        {
            return;
        }
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        var message = response.StatusCode switch
        {
            HttpStatusCode.Unauthorized => "Usuário, senha ou sessão inválidos.",
            HttpStatusCode.Forbidden => "A conta não tem permissão para esta operação.",
            _ => $"API indisponível ({(int)response.StatusCode})."
        };
        if (!string.IsNullOrWhiteSpace(body) && body.Length < 240)
        {
            message += $" {body}";
        }
        throw new InvalidOperationException(message);
    }

    public void Dispose() => _http.Dispose();
}
