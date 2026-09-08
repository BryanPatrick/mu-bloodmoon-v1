using System.ComponentModel;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;
using BloodMoon.Launcher.Services.ContentCache;
using BloodMoon.Launcher.Services.Navigation;
using BloodMoon.Launcher.Views;

namespace BloodMoon.Launcher;

// Launcher Phase L3 -- the Shell. Owns window chrome (drag/min/close),
// the nav rail + page host, the bottom updater/status bar, the login
// overlay, and the shared LauncherAppContext every page reads from. Page-
// specific content (HOME's hero/news/events, CONTA's character list, etc)
// lives in Views/*.xaml -- this file never renders remote content itself.
public partial class MainWindow : Window
{
    public bool PreviewMode { get; set; }
    private readonly SettingsService _settingsService = new();
    private readonly GameConfigurationService _gameConfigurationService = new();
    private readonly GameProcessService _gameProcessService = new();
    private readonly BackupService _backupService = new();
    private readonly PatchService _patchService = new();
    private readonly LauncherUpdateService _launcherUpdateService = new();
    private readonly LauncherApiClient _apiClient = new();
    private readonly SessionStore _sessionStore = new();
    // Phase 2D Part 2 -- lazily bound to CaptchaWebView on first login
    // attempt (EnsureCoreWebView2Async is real async setup work; no
    // reason to pay for it before the login overlay is ever opened).
    private CaptchaChallengeService? _captchaChallenge;
    private readonly CancellationTokenSource _shutdown = new();
    private readonly DispatcherTimer _contentTimer = new() { Interval = TimeSpan.FromMinutes(1) };
    private readonly NavigationService _navigation = new();
    private readonly Dictionary<PageKey, UserControl> _pages = new();
    private readonly Dictionary<PageKey, ToggleButton> _navButtons = new();
    private LauncherAppContext _context = null!;
    private bool _operationInProgress;

    public MainWindow()
    {
        InitializeComponent();
        _contentTimer.Tick += ContentTimer_Tick;
        _navigation.Navigated += Navigation_Navigated;
    }

    private async void Window_Loaded(object sender, RoutedEventArgs e)
    {
        var slotContentCache = new SlotContentCache();
        _context = new LauncherAppContext(
            _apiClient,
            new LauncherContentService(_apiClient, new LauncherContentCache()),
            new SlotContentService(_apiClient, slotContentCache),
            new AssetCacheService(new HttpAssetDownloader()),
            new AssetCacheService(
                new HttpAssetDownloader(),
                cacheDirectory: Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "BloodMoon", "Launcher", "cache", "cms-assets"),
                hashAlgorithm: AssetHashAlgorithm.Sha256,
                validateRasterImage: true),
            _sessionStore,
            _settingsService,
            _patchService,
            _launcherUpdateService,
            _backupService,
            _gameConfigurationService,
            _gameProcessService)
        {
            PreviewMode = PreviewMode,
            RequestLogin = () => { LoginOverlay.Visibility = Visibility.Visible; LoginUsernameBox.Focus(); },
            OpenExternalLink = RunBrowserAction,
            ShowToast = ShowToast,
            RefreshAccountAsync = () => RefreshAccountAsync(showErrors: true),
            CheckAndUpdateClientAsync = CheckAndUpdateClientAsync,
            StartGame = StartGame,
            RunBackupAsync = RunBackupAsync,
            RunRollbackAsync = RunRollbackAsync,
            ApplyResolutionProfile = ApplyResolutionProfile,
            ApplyLauncherScale = ApplyLauncherScale
        };

        _context.Settings = await _settingsService.LoadAsync();
        _apiClient.Configure(_context.Settings.ApiBaseUrl);
        ApplyDisplayLayout(_context.Settings.LauncherScaleIndex);

        BuildPages();
        // NavigationService.CurrentPage already defaults to PageKey.Home
        // (Part U's own design), so TryNavigate(Home) here would hit its
        // "already on this page" early return and never call
        // OnPageEntering -- the very first page would silently never load
        // its content. The initial page host/entry is set directly instead,
        // once; every subsequent navigation goes through TryNavigate as
        // normal (real page-to-page moves always change CurrentPage).
        PageHost.Content = _pages[PageKey.Home];
        ((ILauncherPage)_pages[PageKey.Home]).OnPageEntering(PageKey.Home);

        await RefreshLauncherAsync();
        await RefreshSlotContentAsync();
        await RefreshShellContentAsync();
        if (PreviewMode)
        {
            ApplySignedOutState();
            MarkClientReady("1.0.0");
        }
        else
        {
            await RestoreSessionAsync();
            await CheckAndUpdateClientAsync(showSuccess: false);
            _contentTimer.Start();
        }
    }

    // Phase 1 preserves the approved compact frame's own real proportions
    // (1180x700) as the single native size -- the legacy viewport preference
    // is stored for compatibility but never switches between different
    // native sizes; it never did, even before scale/accessibility. Both
    // this and ApplyLauncherScale below delegate to the same
    // ApplyDisplayLayout, so picking a viewport profile never silently
    // discards the user's chosen scale.
    private void ApplyResolutionProfile(int profileIndex)
    {
        _context.Settings.LauncherViewportProfileIndex = profileIndex;
        ApplyDisplayLayout(_context.Settings.LauncherScaleIndex);
    }

    // Scale/accessibility -- a uniform density multiplier for the whole
    // rendered shell (RootScaleTransform, a LayoutTransform on RootGrid --
    // real layout re-runs at the transformed size, unlike a Viewbox
    // stretching a bitmap) plus a matching real window resize, so the
    // approved 1180x700 frame is genuinely presented smaller/larger, not
    // just visually denser. Deliberately NOT free-form: ResizeMode stays
    // NoResize (see MainWindow.xaml) -- only these five discrete presets
    // (and FitToWorkArea's own automatic step-down) ever change the
    // window's size; the user cannot drag-resize it. See
    // docs/launcher/launcher-scale-and-text-scale.md.
    private void ApplyLauncherScale(int scaleIndex) => ApplyDisplayLayout(scaleIndex);

    private void ApplyDisplayLayout(int scaleIndex)
    {
        const double nativeWidth = 1180;
        const double nativeHeight = 700;
        var requestedScale = LauncherScaleOptions.ForIndex(scaleIndex);
        var workArea = SystemParameters.WorkArea;
        var fitted = LauncherScaleEngine.FitToWorkArea(nativeWidth, nativeHeight, workArea.Width, workArea.Height, requestedScale);

        MinWidth = LauncherScaleEngine.MinWidthForScale(nativeWidth, fitted.Factor);
        MinHeight = LauncherScaleEngine.MinHeightForScale(nativeHeight, fitted.Factor);

        RootGrid.Width = nativeWidth;
        RootGrid.Height = nativeHeight;
        RootScaleTransform.ScaleX = fitted.Factor;
        RootScaleTransform.ScaleY = fitted.Factor;

        var targetWidth = Math.Min(nativeWidth * fitted.Factor, workArea.Width);
        var targetHeight = Math.Min(nativeHeight * fitted.Factor, workArea.Height);
        Width = Math.Max(MinWidth, Math.Round(targetWidth));
        Height = Math.Max(MinHeight, Math.Round(targetHeight));
        Left = Math.Round(workArea.Left + (workArea.Width - Width) / 2);
        Top = Math.Round(workArea.Top + (workArea.Height - Height) / 2);

        // The originally requested index is always what's saved -- Part 8's
        // "do not destroy the saved preference unless necessary": only the
        // window actually shown this session steps down via FitToWorkArea
        // when it wouldn't otherwise fit; reopening later (e.g. on a larger
        // monitor) re-applies the real saved preference from scratch.
        _context.Settings.LauncherScaleIndex = scaleIndex;
    }

    private void BuildPages()
    {
        RegisterPage(PageKey.Home, NavHome, new HomePage());
        RegisterPage(PageKey.Account, NavAccount, new AccountPage());
        RegisterPage(PageKey.News, NavNews, new NewsPage());
        RegisterPage(PageKey.Events, NavEvents, new EventsPage());
        RegisterPage(PageKey.Ranking, NavRanking, new RankingPage());
        RegisterPage(PageKey.Store, NavStore, new StorePage());
        RegisterPage(PageKey.Settings, NavSettings, new SettingsPage());
    }

    private void RegisterPage(PageKey key, ToggleButton navButton, UserControl control)
    {
        _pages[key] = control;
        _navButtons[key] = navButton;
        if (control is ILauncherPage launcherPage)
        {
            launcherPage.Initialize(_context);
            _navigation.RegisterPage(key, launcherPage);
        }
    }

    private void Nav_Click(object sender, RoutedEventArgs e)
    {
        if (sender is not ToggleButton button || button.Tag is not string tagName)
        {
            return;
        }
        if (!Enum.TryParse<PageKey>(tagName, out var key))
        {
            return;
        }
        if (!_navigation.TryNavigate(key))
        {
            button.IsChecked = false;
            return;
        }
    }

    private void UtilityNavigation_Click(object sender, RoutedEventArgs e) =>
        _navigation.TryNavigate(PageKey.Account);

    private async void VerifyUtility_Click(object sender, RoutedEventArgs e) =>
        await CheckAndUpdateClientAsync(showSuccess: true);

    private void ShellExternalLink_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button { Tag: string url }) RunBrowserAction(url);
    }

    private void UtilityExternal_Click(object sender, RoutedEventArgs e)
    {
        if (sender is not Button { Tag: string id }) return;
        var url = id switch
        {
            "support" => _context.Bootstrap?.Utilities.Find(link => link.Id == "support" && link.Enabled)?.Url,
            "wiki" => _context.Bootstrap?.Utilities.Find(link => link.Id == "wiki" && link.Enabled)?.Url,
            _ => _context.Bootstrap?.Links.Website
        };
        if (!string.IsNullOrWhiteSpace(url)) RunBrowserAction(url);
    }

    private void Navigation_Navigated(object? sender, NavigationChangedEventArgs e)
    {
        foreach (var (key, navButton) in _navButtons)
        {
            navButton.IsChecked = key == e.To;
        }
        PageHost.Content = _pages[e.To];
        PageTitleText.Text = PageLabel(e.To);
    }

    private static string PageLabel(PageKey page) => page switch
    {
        PageKey.Home => "INÍCIO",
        PageKey.Account => "CONTA",
        PageKey.News => "NOTÍCIAS",
        PageKey.Events => "EVENTOS",
        PageKey.Ranking => "RANKING",
        PageKey.Store => "LOJA",
        PageKey.Settings => "CONFIGURAÇÕES",
        _ => "BLOOD MOON"
    };

    private void Window_Closing(object? sender, CancelEventArgs e)
    {
        _shutdown.Cancel();
        _contentTimer.Stop();
        _apiClient.Dispose();
        _patchService.Dispose();
        _launcherUpdateService.Dispose();
        _ = _settingsService.SaveAsync(_context.Settings);
    }

    private void DragArea_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ButtonState == MouseButtonState.Pressed)
        {
            DragMove();
        }
    }

    private void MinimizeButton_Click(object sender, RoutedEventArgs e) => WindowState = WindowState.Minimized;

    private void CloseButton_Click(object sender, RoutedEventArgs e) => Close();

    private void RunBrowserAction(string url)
    {
        try
        {
            BrowserService.Open(url);
        }
        catch (Exception exception)
        {
            ShowToast(exception.Message);
        }
    }

    private async Task CheckAndUpdateClientAsync(bool showSuccess)
    {
        _context.ClientReady = false;
        _context.UpdateState = LauncherUpdateState.Checking;
        _context.RaiseRuntimeStateChanged();
        await RunOperationAsync(async cancellationToken =>
        {
            SetProgress("VERIFICANDO ATUALIZAÇÕES", 0, "Conectando ao manifesto seguro");
            var manifest = await _patchService.GetManifestAsync(
                _context.Settings.PatchManifestUrl,
                _context.Settings.RequireSignedManifest,
                cancellationToken);
            if (_launcherUpdateService.IsUpdateRequired(manifest.Launcher))
            {
                _context.UpdateState = LauncherUpdateState.UpdateAvailable;
                _context.RaiseRuntimeStateChanged();
                SetProgress("ATUALIZANDO", 0, "Preparando reinicialização segura");
                await _launcherUpdateService.StartUpdateAsync(manifest.Launcher!, cancellationToken);
                ShowToast("O launcher será reiniciado para concluir a atualização.");
                Close();
                return;
            }
            var progress = new Progress<PatchProgress>(UpdateProgress);
            _context.UpdateState = LauncherUpdateState.Verifying;
            _context.RaiseRuntimeStateChanged();
            SetProgress("VERIFICANDO ARQUIVOS", 0, "Validando integridade do cliente");
            var invalidFiles = await _patchService.FindInvalidFilesAsync(AppContext.BaseDirectory, manifest, progress, cancellationToken);
            var pendingDeletions = _patchService.FindPendingDeletions(AppContext.BaseDirectory, manifest);

            if (invalidFiles.Count == 0 && pendingDeletions.Count == 0)
            {
                MarkClientReady(manifest.Version);
                if (showSuccess) ShowToast("Cliente verificado. Todos os arquivos estão íntegros.");
                return;
            }

            _context.UpdateState = LauncherUpdateState.Downloading;
            _context.RaiseRuntimeStateChanged();
            SetProgress("ATUALIZANDO", 0, $"{invalidFiles.Count} correção(ões) · {pendingDeletions.Count} remoção(ões)");
            await _patchService.ApplyAsync(AppContext.BaseDirectory, manifest, invalidFiles, progress, cancellationToken);
            MarkClientReady(manifest.Version);
            ShowToast("Atualização concluída com segurança.");
        }, affectsUpdateState: true);
    }

    private void MarkClientReady(string version)
    {
        _context.ClientReady = true;
        _context.UpdateState = LauncherUpdateState.Ready;
        _context.RaiseRuntimeStateChanged();
        SetProgress("PRONTO PARA JOGAR", 100, $"Versão {version}");
    }

    private void StartGame()
    {
        if (!_context.IsLoggedIn)
        {
            _context.RequestLogin?.Invoke();
            return;
        }
        if (!_context.ClientReady)
        {
            ShowToast("O cliente ainda não foi verificado. Use VERIFICAR ARQUIVOS em Configurações.");
            return;
        }
        // feature/launcher-play-gate -- checks the same provisioning
        // granularity as LauncherRuntimePolicy (PENDING/PROVISIONING/
        // FAILED), not just the bare GameReady bool this check used to
        // read alone -- an account stuck FAILED got the same generic
        // "not ready yet" message as one still PENDING, which is the
        // real bug this phase's audit found and must not regress.
        var provisioningStatus = _context.UnifiedAccount?.ProvisioningStatus ?? "NONE";
        if (provisioningStatus == "FAILED")
        {
            ShowToast("NÃO FOI POSSÍVEL PREPARAR SUA CONTA DE JOGO.");
            return;
        }
        if (provisioningStatus is "PENDING" or "PROVISIONING" || _context.UnifiedAccount?.GameReady != true)
        {
            ShowToast("A CONTA DE JOGO AINDA NÃO ESTÁ PRONTA.");
            return;
        }
        if (_operationInProgress)
        {
            ShowToast("Aguarde a operação atual terminar.");
            return;
        }
        try
        {
            _gameConfigurationService.Apply(_context.Settings);
            _gameProcessService.Start(_context.Settings);
            if (_context.Settings.CloseLauncherAfterGameStarts)
            {
                Close();
            }
        }
        catch (Exception exception)
        {
            ShowToast(exception.Message);
        }
    }

    private async Task RunBackupAsync() =>
        await RunOperationAsync(async cancellationToken =>
        {
            SetProgress("Criando backup local...", 0, "Compactando o cliente");
            var backupPath = await _backupService.CreateAsync(AppContext.BaseDirectory, cancellationToken);
            SetProgress("Backup concluído", 100, Path.GetFileName(backupPath));
            ShowToast($"Backup criado: {backupPath}");
        });

    private async Task RunRollbackAsync() =>
        await RunOperationAsync(async cancellationToken =>
        {
            SetProgress("Revertendo atualização...", 0, "Recuperando a versão anterior");
            try
            {
                var version = await _patchService.RollbackLatestAsync(AppContext.BaseDirectory, cancellationToken);
                SetProgress("Atualização revertida", 100, $"Versão removida: {version}");
                ShowToast("A atualização mais recente foi revertida.");
            }
            catch (FileNotFoundException)
            {
                var backupPath = await _backupService.RestoreLatestAsync(AppContext.BaseDirectory, cancellationToken);
                SetProgress("Restauração concluída", 100, Path.GetFileName(backupPath));
                ShowToast("O backup local mais recente foi restaurado.");
            }
            _context.ClientReady = false;
        });

    private async Task RunOperationAsync(Func<CancellationToken, Task> action, bool affectsUpdateState = false)
    {
        if (_operationInProgress)
        {
            ShowToast("Já existe uma operação em andamento.");
            return;
        }
        _operationInProgress = true;
        try
        {
            await action(_shutdown.Token);
        }
        catch (OperationCanceledException)
        {
            ShowToast("Operação cancelada.");
        }
        catch (Exception)
        {
            if (affectsUpdateState)
            {
                _context.UpdateState = LauncherUpdateState.Error;
                _context.RaiseRuntimeStateChanged();
                SetProgress("ERRO", 0, "Não foi possível concluir a operação");
            }
            ShowToast("NÃO FOI POSSÍVEL CONCLUIR A OPERAÇÃO. TENTE NOVAMENTE EM ALGUNS INSTANTES.");
        }
        finally
        {
            _operationInProgress = false;
        }
    }

    private async void ContentTimer_Tick(object? sender, EventArgs e)
    {
        await RefreshLauncherAsync();
        await RefreshSlotContentAsync();
        await RefreshShellContentAsync();
        if (_pages.TryGetValue(_navigation.CurrentPage, out var current) && current is ILauncherPage page)
        {
            await page.RefreshAsync();
        }
        if (_context.Session is not null)
        {
            await RefreshAccountAsync(showErrors: false);
        }
    }

    private async Task RefreshLauncherAsync()
    {
        var result = await _context.BootstrapContentService.GetContentAsync(_shutdown.Token);
        _context.Bootstrap = result.Bootstrap;
        if (result.Source == ContentSource.PackagedFallback)
        {
            ShowToast(RemoteContentFailureMessages.For(RemoteContentFailureKind.ApiOffline));
        }
        ContentVersionText.Text = string.IsNullOrWhiteSpace(result.Bootstrap.ContentVersion)
            ? "CONTEÚDO —"
            : $"CONTEÚDO {result.Bootstrap.ContentVersion[..Math.Min(10, result.Bootstrap.ContentVersion.Length)]}";
    }

    private async Task RefreshSlotContentAsync()
    {
        var result = await _context.SlotContentService.GetContentAsync(null, _shutdown.Token);
        _context.Slots = new SlotRegistryMapper(result.Content.Slots);
        _context.SlotAssets = result.Content.Assets;
        ContentVersionText.Text = $"CONTEÚDO {result.Content.ContentVersion}";
    }

    private async Task RefreshShellContentAsync()
    {
        BrandLogoImage.Source = await SlotImageResolver.ResolveAsync(
            _context, "home.brandLogo", _context.Slots.GetAssetId("home.brandLogo"), _context.Slots.GetImageState("home.brandLogo"), _shutdown.Token);
        BrandLogoImage.Visibility = BrandLogoImage.Source is null ? Visibility.Collapsed : Visibility.Visible;

        var campaignTitle = _context.Slots.GetText("home.campaign.title");
        var campaignSubtitle = _context.Slots.GetText("home.campaign.subtitle");
        OpenBetaSummaryText.Text = !string.IsNullOrWhiteSpace(campaignSubtitle)
            ? campaignSubtitle
            : !string.IsNullOrWhiteSpace(campaignTitle)
                ? campaignTitle
                : "Participe da validação do Blood Moon.";

        var slotSocials = _context.Slots.GetList("home.socials", element =>
        {
            if (!SlotRegistryMapper.BoolField(element, "enabled", true)) return null;
            var label = SlotRegistryMapper.StringField(element, "label");
            var url = SlotRegistryMapper.StringField(element, "url");
            return string.IsNullOrWhiteSpace(label) || string.IsNullOrWhiteSpace(url)
                ? null
                : new ShellLink(label!, url!);
        });
        ShellSocialItems.ItemsSource = slotSocials.Count > 0
            ? slotSocials.Take(4)
            : (_context.Bootstrap?.Socials ?? []).Where(link => link.Enabled).OrderBy(link => link.Order).Take(4).Select(link => new ShellLink(link.Label, link.Url));
    }

    private async Task RestoreSessionAsync()
    {
        _context.Session = await _sessionStore.LoadAsync();
        if (_context.Session is null)
        {
            ApplySignedOutState();
            return;
        }
        try
        {
            var refreshed = await _apiClient.RefreshAsync(_context.Session.RefreshToken, _shutdown.Token);
            _context.Session = new LauncherSession { AccessToken = refreshed.AccessToken, RefreshToken = refreshed.RefreshToken };
            await _sessionStore.SaveAsync(_context.Session);
            await RefreshAccountAsync(showErrors: false);
        }
        catch
        {
            _sessionStore.Clear();
            _context.Session = null;
            ApplySignedOutState();
        }
    }

    private async Task RefreshAccountAsync(bool showErrors)
    {
        if (_context.Session is null)
        {
            ApplySignedOutState();
            return;
        }
        try
        {
            _context.Account = await _apiClient.GetAccountAsync(_context.Session.AccessToken, _shutdown.Token);
            _context.UnifiedAccount = await _apiClient.GetMeAsync(_context.Session.AccessToken, _shutdown.Token);
            _context.LoginState = LoginState.Authenticated;
            ApplyAccount(_context.Account);
            _context.RaiseAccountChanged();
        }
        catch (Exception exception)
        {
            if (showErrors) ShowToast(exception.Message);
        }
    }

    private void ApplyAccount(LauncherAccount account)
    {
        AccountActionButton.Content = "SAIR";
        AccountGreetingText.Text = $"Olá, {account.User.Name}";
        AccountEmailText.Text = account.User.Username;
    }

    private void ApplySignedOutState()
    {
        _context.Account = null;
        _context.UnifiedAccount = null;
        _context.TwoFactorEnabled = false;
        _context.LoginState = LoginState.LoggedOut;
        AccountActionButton.Content = "ENTRAR";
        AccountGreetingText.Text = "Entre com sua conta";
        AccountEmailText.Text = "Use a mesma conta do portal.";
        _context.RaiseAccountChanged();
    }

    private async void AccountActionButton_Click(object sender, RoutedEventArgs e)
    {
        if (_context.Session is null)
        {
            _context.RequestLogin?.Invoke();
            return;
        }
        try
        {
            await _apiClient.LogoutAsync(_context.Session.AccessToken, _shutdown.Token);
        }
        catch
        {
            // A sessão local deve ser encerrada mesmo se a API estiver indisponível.
        }
        _sessionStore.Clear();
        _context.Session = null;
        ApplySignedOutState();
        ShowToast("Sessão encerrada.");
    }

    private void CloseLoginButton_Click(object sender, RoutedEventArgs e)
    {
        LoginOverlay.Visibility = Visibility.Collapsed;
        LoginPasswordBox.Clear();
        LoginTotpBox.Clear();
        LoginTotpPanel.Visibility = Visibility.Collapsed;
        // Phase 2D Part 5 -- closing the overlay mid-attempt is a real,
        // explicit return to LOGGED_OUT, not silently left in whatever
        // intermediate state the last failed attempt produced.
        _context.LoginState = LoginState.LoggedOut;
    }

    // Phase 2D Parts 2-6 -- the real login flow: a fresh Turnstile token is
    // requested on EVERY submit (including a 2FA retry), matching how the
    // web login page's own TurnstileWidget.reset() forces a new token
    // after any failed attempt -- Cloudflare tokens are single-use, so
    // reusing one across a retry would just fail server-side anyway. No
    // CAPTCHA bypass exists anywhere in this path: a null/empty token from
    // CaptchaChallengeService simply stops here before any /auth/login
    // call is made.
    private async void LoginButton_Click(object sender, RoutedEventArgs e)
    {
        if (string.IsNullOrWhiteSpace(LoginUsernameBox.Text) || string.IsNullOrWhiteSpace(LoginPasswordBox.Password))
        {
            ShowToast("Informe usuário e senha.");
            return;
        }

        LoginSubmitButton.IsEnabled = false;
        _context.LoginState = LoginState.CaptchaRequired;
        CaptchaStatusText.Text = "Confirme que você é uma pessoa para continuar.";
        try
        {
            _captchaChallenge ??= new CaptchaChallengeService(CaptchaWebView);
            var captchaToken = await _captchaChallenge.RequestTokenAsync(
                $"{_context.Settings.WebsiteUrl.TrimEnd('/')}/launcher/captcha",
                _shutdown.Token);

            if (string.IsNullOrWhiteSpace(captchaToken))
            {
                CaptchaStatusText.Text = "Não foi possível concluir a verificação. Tente novamente.";
                _context.LoginState = LoginState.CaptchaRequired;
                return;
            }

            CaptchaStatusText.Text = "Verificação concluída.";
            _context.LoginState = LoginState.Authenticating;

            var response = await _apiClient.LoginAsync(new LoginPayload
            {
                Username = LoginUsernameBox.Text.Trim(),
                Password = LoginPasswordBox.Password,
                CaptchaToken = captchaToken,
                TotpCode = string.IsNullOrWhiteSpace(LoginTotpBox.Text) ? null : LoginTotpBox.Text.Trim()
            }, _shutdown.Token);

            _context.Session = new LauncherSession { AccessToken = response.AccessToken, RefreshToken = response.RefreshToken };
            _context.TwoFactorEnabled = response.User.TwoFactorEnabled;
            await _sessionStore.SaveAsync(_context.Session);
            LoginOverlay.Visibility = Visibility.Collapsed;
            LoginPasswordBox.Clear();
            LoginTotpBox.Clear();
            LoginTotpPanel.Visibility = Visibility.Collapsed;
            await RefreshAccountAsync(showErrors: true);
            ShowToast("Conta conectada com sucesso.");
        }
        catch (AuthApiException authException)
        {
            var mapped = AuthErrorMapper.Map(authException);
            _context.LoginState = mapped.ResultingState;
            LoginTotpPanel.Visibility = mapped.ResultingState == LoginState.TwoFactorRequired
                ? Visibility.Visible
                : LoginTotpPanel.Visibility;
            ShowToast(mapped.PlayerMessage);
        }
        catch (Exception exception)
        {
            _context.LoginState = LoginState.AuthFailed;
            // Not an AuthApiException (e.g. no network/timeout) -- there is
            // no backend signal to map here, so this is the one path that
            // still surfaces exception.Message directly, matching the
            // pre-existing behavior for non-HTTP failures.
            ShowToast(exception.Message);
        }
        finally
        {
            LoginSubmitButton.IsEnabled = true;
        }
    }

    private void UpdateProgress(PatchProgress progress) =>
        SetProgress(
            _context.UpdateState == LauncherUpdateState.Verifying ? "VERIFICANDO ARQUIVOS" : "ATUALIZANDO",
            progress.Percentage,
            $"{progress.CompletedFiles}/{progress.TotalFiles} · {progress.CurrentFile}");

    private void SetProgress(string status, double percentage, string detail)
    {
        var value = Math.Clamp(percentage, 0, 100);
        ProgressStatusText.Text = status;
        ProgressDetailText.Text = detail;
        ProgressFillColumn.Width = new GridLength(value, GridUnitType.Star);
        ProgressRemainderColumn.Width = new GridLength(Math.Max(0.001, 100 - value), GridUnitType.Star);
    }

    private async void ShowToast(string message)
    {
        if (PreviewMode) return;
        ToastText.Text = message;
        Toast.Visibility = Visibility.Visible;
        await Task.Delay(4200);
        Toast.Visibility = Visibility.Collapsed;
    }

    public async Task RenderPreviewAsync(string outputPath)
    {
        await Dispatcher.InvokeAsync(() => { }, DispatcherPriority.ApplicationIdle);
        RootGrid.InvalidateVisual();
        RootGrid.UpdateLayout();
        await Dispatcher.InvokeAsync(() => { }, DispatcherPriority.Render);

        var dpi = VisualTreeHelper.GetDpi(RootGrid);
        var bitmap = new RenderTargetBitmap(
            (int)Math.Ceiling(RootGrid.ActualWidth * dpi.DpiScaleX),
            (int)Math.Ceiling(RootGrid.ActualHeight * dpi.DpiScaleY),
            dpi.PixelsPerInchX,
            dpi.PixelsPerInchY,
            PixelFormats.Pbgra32);
        bitmap.Render(RootGrid);

        var encoder = new PngBitmapEncoder();
        encoder.Frames.Add(BitmapFrame.Create(bitmap));
        await using var output = File.Create(outputPath);
        encoder.Save(output);
    }

    // Test/QA hook -- navigates to a page and waits one layout pass before
    // the caller screenshots, matching RenderPreviewAsync's own idle-wait
    // pattern. Used by the --render-preview=path,PageKey CLI convention
    // App.xaml.cs parses.
    public void NavigateForPreview(PageKey page) => _navigation.TryNavigate(page);

    private sealed record ShellLink(string Label, string Url);
}
