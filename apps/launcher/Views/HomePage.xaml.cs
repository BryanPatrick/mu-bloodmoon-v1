using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;
using BloodMoon.Launcher.Services.Navigation;

namespace BloodMoon.Launcher.Views;

// Part N-T -- HOME. The only page with JOGAR/SUPORTE/SITE/WIKI/ENTRAR-
// SAIR, character summary, and event/news widgets (Part N's own scoping
// rule -- those never appear on the internal pages).
public partial class HomePage : UserControl, ILauncherPage
{
    private LauncherAppContext _context = null!;

    public HomePage()
    {
        InitializeComponent();
    }

    public void Initialize(LauncherAppContext context)
    {
        _context = context;
        _context.AccountChanged += (_, _) => _ = RefreshAsync();
        _context.RuntimeStateChanged += (_, _) => _ = RefreshAsync();
    }

    public bool OnPageLeaving(PageKey to) => true;

    public void OnPageEntering(PageKey from) => _ = RefreshAsync();

    public async Task RefreshAsync()
    {
        ApplyHero();
        ApplyCampaign();
        ApplyServerAndCharacter();
        ApplyNews();
        await ApplyEventsAsync();
    }

    private void ApplyHero()
    {
        HeroTitleText.Text = _context.Slots.GetText("home.hero.title") ?? "Bem-vindo ao Blood Moon";
        HeroSubtitleText.Text = _context.Slots.GetText("home.hero.subtitle") ?? "";
        var ctaLabel = _context.Slots.GetText("home.hero.ctaLabel");
        HeroCtaButton.Content = string.IsNullOrWhiteSpace(ctaLabel) ? "JOGAR AGORA" : ctaLabel;
        HeroCtaButton.Visibility = _context.Slots.GetBool("home.hero.enabled", fallback: true)
            ? Visibility.Visible
            : Visibility.Collapsed;

        _ = LoadHeroImageAsync();
    }

    private async Task LoadHeroImageAsync()
    {
        var image = await SlotImageResolver.ResolveAsync(_context, "home.hero.image", _context.Slots.GetAssetId("home.hero.image"), _context.Slots.GetImageState("home.hero.image"), CancellationToken.None);
        HeroImageHost.Background = image is not null
            ? new ImageBrush(image) { Stretch = Stretch.UniformToFill }
            : (Brush)Application.Current.Resources["Brush.BackgroundSurfaceAlt"];
    }

    private void ApplyCampaign()
    {
        var enabled = _context.Slots.GetBool("home.campaign.enabled");
        CampaignBorder.Visibility = enabled ? Visibility.Visible : Visibility.Collapsed;
        if (!enabled) return;
        CampaignVersionText.Text = _context.Slots.GetText("home.campaign.versionLabel") ?? "CAMPANHA";
        CampaignTitleText.Text = _context.Slots.GetText("home.campaign.title") ?? "";
        CampaignSubtitleText.Text = _context.Slots.GetText("home.campaign.subtitle") ?? "";
        _ = ApplyCampaignImageAsync();
    }

    private async Task ApplyCampaignImageAsync()
    {
        var image = await SlotImageResolver.ResolveAsync(_context, "home.campaign.image", _context.Slots.GetAssetId("home.campaign.image"), _context.Slots.GetImageState("home.campaign.image"), CancellationToken.None);
        CampaignBorder.Background = image is null ? null : new ImageBrush(image) { Stretch = Stretch.UniformToFill, Opacity = 0.32 };
    }


    private void ApplyServerAndCharacter()
    {
        var state = HomeStateMapper.Map(_context.Bootstrap ?? new LauncherBootstrap(), _context.Account, _context.IsLoggedIn);

        if (state.CharacterSummary is { } character)
        {
            CharacterNameText.Text = character.Name;
            // Phase 3 -- Master Reset/Guild come straight from the real
            // ActiveCharacter DTO (GET /launcher/account), never fabricated;
            // omitted entirely when the account has no guild or a zero
            // master reset rather than showing a misleading "-" for a stat
            // that simply isn't meaningful yet.
            var active = _context.Account?.ActiveCharacter;
            var extra = active is null ? "" : string.Concat(
                active.MasterReset > 0 ? $" · MR {active.MasterReset}" : "",
                string.IsNullOrWhiteSpace(active.Guild) ? "" : $" · {active.Guild}");
            CharacterDetailText.Text = $"{character.CurrentClass} · Nível {character.Level} · Reset {character.Reset}{extra}";
        }
        else
        {
            CharacterNameText.Text = _context.IsLoggedIn ? "Nenhum personagem" : "-";
            CharacterDetailText.Text = _context.IsLoggedIn
                ? RemoteContentFailureMessages.For(RemoteContentFailureKind.NoCharacters)
                : RemoteContentFailureMessages.For(RemoteContentFailureKind.NotLoggedIn);
        }

        var isOnline = string.Equals(state.ServerState.Status, "ONLINE", StringComparison.OrdinalIgnoreCase);
        ServerStatusText.Text = isOnline ? "SERVIDOR ONLINE" : $"SERVIDOR {state.ServerState.Status}";
        ServerStatusText.Foreground = (Brush)Application.Current.Resources[isOnline ? "Brush.Success" : "Brush.Danger"];
        ServerStatusDetailText.Text = state.ServerState.MaintenanceActive
            ? state.ServerState.MaintenanceMessage
            : $"{state.ServerState.OnlinePlayers:N0} jogadores online";

        var serverAvailable = !state.ServerState.MaintenanceActive &&
            !string.Equals(state.ServerState.Status, "OFFLINE", StringComparison.OrdinalIgnoreCase);
        var gameAccountReady = _context.UnifiedAccount?.GameReady ?? !_context.IsLoggedIn;
        var play = LauncherRuntimePolicy.ResolvePlayButton(
            _context.UpdateState, _context.IsLoggedIn, serverAvailable, gameAccountReady);
        PlayButton.IsEnabled = play.IsEnabled;
        PlayButton.Content = play.Label;
    }

    private void ApplyNews()
    {
        var news = _context.Bootstrap?.News ?? [];
        NewsItems.ItemsSource = news.Take(4).ToList();
    }

    private async Task ApplyEventsAsync()
    {
        if (_context.PreviewMode)
        {
            var previewMessage = RemoteContentFailureMessages.For(RemoteContentFailureKind.NoEvents);
            ActiveEventNameText.Text = NextEventNameText.Text = previewMessage;
            ActiveEventCountdownText.Text = NextEventCountdownText.Text = "";
            ActiveEventGuideButton.Visibility = Visibility.Collapsed;
            return;
        }
        try
        {
            var events = await _context.ApiClient.GetEventsAsync(CancellationToken.None);
            if (events.ActiveEvent is { } active)
            {
                ActiveEventNameText.Text = active.Name;
                ActiveEventCountdownText.Text = $"Termina em {CountdownFormatter.Format(active.EndsAt ?? active.StartsAt ?? DateTimeOffset.UtcNow)}";
                ActiveEventGuideButton.Tag = active.GuideUrl;
                ActiveEventGuideButton.Visibility = string.IsNullOrWhiteSpace(active.GuideUrl) ? Visibility.Collapsed : Visibility.Visible;
            }
            else
            {
                ActiveEventNameText.Text = RemoteContentFailureMessages.For(RemoteContentFailureKind.NoEvents);
                ActiveEventCountdownText.Text = "";
                ActiveEventGuideButton.Visibility = Visibility.Collapsed;
            }

            var next = events.Upcoming.FirstOrDefault();
            if (next is not null)
            {
                NextEventNameText.Text = next.Name;
                NextEventCountdownText.Text = next.StartsAt is { } starts ? $"Começa em {CountdownFormatter.Format(starts)}" : "";
            }
            else
            {
                NextEventNameText.Text = RemoteContentFailureMessages.For(RemoteContentFailureKind.NoEvents);
                NextEventCountdownText.Text = "";
            }
        }
        catch
        {
            var offlineMessage = RemoteContentFailureMessages.For(RemoteContentFailureKind.ApiOffline);
            ActiveEventNameText.Text = NextEventNameText.Text = offlineMessage;
            ActiveEventCountdownText.Text = NextEventCountdownText.Text = "";
            ActiveEventGuideButton.Visibility = Visibility.Collapsed;
        }
    }

    private void ActiveEventGuide_Click(object sender, RoutedEventArgs e)
    {
        if (ActiveEventGuideButton.Tag is string url && !string.IsNullOrWhiteSpace(url))
        {
            _context.OpenExternalLink?.Invoke(url);
        }
    }

    private void HeroCta_Click(object sender, RoutedEventArgs e)
    {
        var ctaUrl = _context.Slots.GetText("home.hero.ctaUrl");
        if (!string.IsNullOrWhiteSpace(ctaUrl))
        {
            _context.OpenExternalLink?.Invoke(ctaUrl);
            return;
        }
        _context.StartGame?.Invoke();
    }

    private void PlayButton_Click(object sender, RoutedEventArgs e)
    {
        if (!_context.IsLoggedIn)
        {
            _context.RequestLogin?.Invoke();
            return;
        }
        _context.StartGame?.Invoke();
    }

    private void NewsButton_Click(object sender, RoutedEventArgs e) =>
        _context.OpenExternalLink?.Invoke(_context.Bootstrap?.Links.News ?? "https://mubloodmoon.com.br/noticias");

}
