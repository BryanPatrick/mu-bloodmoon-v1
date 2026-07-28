using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using BloodMoon.Launcher.Models;

namespace BloodMoon.Launcher.Services;

public sealed class LauncherApiClient : IDisposable
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
